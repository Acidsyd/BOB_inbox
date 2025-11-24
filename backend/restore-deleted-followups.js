require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SpintaxParser = require('./src/utils/spintax');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CAMPAIGN_ID = 'c0f9d471-ac96-400f-a942-9c55487a8a53';

async function restoreFollowups() {
  console.log('\n🔧 Restoring Deleted Follow-ups\n');
  console.log('='.repeat(60));

  // Step 1: Get campaign config
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('config, organization_id')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Failed to get campaign:', campaignError);
    return;
  }

  const emailSequence = campaign.config?.emailSequence || [];
  if (emailSequence.length === 0) {
    console.log('❌ No follow-up configuration found');
    return;
  }

  console.log(`✅ Found ${emailSequence.length} follow-up(s) configured`);
  console.log(`   Follow-up #1 delay: ${emailSequence[0].delay} days\n`);

  // Step 2: Get all sent initial emails (sequence_step = 0)
  const { data: sentInitials, error: sentError } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('organization_id', campaign.organization_id)
    .eq('sequence_step', 0)
    .eq('status', 'sent');

  if (sentError) {
    console.error('❌ Failed to get sent initials:', sentError);
    return;
  }

  console.log(`📧 Found ${sentInitials.length} sent initial emails\n`);

  // Step 3: Check which ones already have follow-ups
  const { data: existingFollowups, error: followupError } = await supabase
    .from('scheduled_emails')
    .select('lead_id, status')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('organization_id', campaign.organization_id)
    .eq('sequence_step', 1);

  if (followupError) {
    console.error('❌ Failed to get existing follow-ups:', followupError);
    return;
  }

  const existingFollowupLeads = new Set(existingFollowups.map(f => f.lead_id));
  console.log(`📊 Existing follow-ups: ${existingFollowups.length}`);
  console.log(`   - Need to restore: ${sentInitials.length - existingFollowupLeads.size}\n`);

  // Step 4: Get lead details for personalization
  const leadsToRestore = sentInitials.filter(email => !existingFollowupLeads.has(email.lead_id));

  if (leadsToRestore.length === 0) {
    console.log('✅ All follow-ups already exist - nothing to restore');
    return;
  }

  console.log(`🔧 Restoring ${leadsToRestore.length} missing follow-ups...\n`);

  const leadIds = leadsToRestore.map(e => e.lead_id);
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', leadIds);

  if (leadsError) {
    console.error('❌ Failed to get leads:', leadsError);
    return;
  }

  const leadsMap = new Map(leads.map(l => [l.id, l]));

  // Step 5: Create follow-ups
  const followUpsToInsert = [];

  for (const initial of leadsToRestore) {
    const lead = leadsMap.get(initial.lead_id);
    if (!lead) continue;

    const followUp = emailSequence[0];
    const delayDays = followUp.delay || 1;

    // Calculate send_at: initial.sent_at + delay days
    const sendAt = new Date(initial.sent_at);
    sendAt.setDate(sendAt.getDate() + delayDays);

    // Process spintax and personalization
    const rawContent = followUp.content || '';
    let processedContent = SpintaxParser.spinWithSeed(rawContent, lead.email);

    // Apply personalization
    const replacements = {
      '{{firstName}}': lead.first_name || '',
      '{{lastName}}': lead.last_name || '',
      '{{fullName}}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      '{{company}}': lead.company || '',
      '{{jobTitle}}': lead.job_title || '',
      '{{website}}': lead.website || '',
      '{{email}}': lead.email || '',
      '{firstName}': lead.first_name || '',
      '{lastName}': lead.last_name || '',
      '{fullName}': lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      '{company}': lead.company || '',
      '{jobTitle}': lead.job_title || '',
      '{website}': lead.website || '',
      '{email}': lead.email || ''
    };

    Object.entries(replacements).forEach(([token, value]) => {
      processedContent = processedContent.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    followUpsToInsert.push({
      campaign_id: CAMPAIGN_ID,
      organization_id: campaign.organization_id,
      lead_id: initial.lead_id,
      email_account_id: initial.email_account_id,
      to_email: initial.to_email,
      subject: followUp.subject || initial.subject,
      content: processedContent,
      send_at: sendAt.toISOString(),
      sequence_step: 1,
      parent_message_id: initial.id,
      reply_to_thread: followUp.replyToSameThread || false,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Step 6: Insert in batches
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < followUpsToInsert.length; i += BATCH_SIZE) {
    const batch = followUpsToInsert.slice(i, i + BATCH_SIZE);

    const { error: insertError } = await supabase
      .from('scheduled_emails')
      .insert(batch);

    if (insertError) {
      console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/${followUpsToInsert.length} follow-ups...`);
    }
  }

  console.log(`\n🎉 Successfully restored ${inserted} follow-ups!`);
  console.log(`\n📊 Final Stats:`);
  console.log(`   Sent initials: ${sentInitials.length}`);
  console.log(`   Existing follow-ups: ${existingFollowupLeads.size}`);
  console.log(`   Restored follow-ups: ${inserted}`);
  console.log(`   Total follow-ups: ${existingFollowupLeads.size + inserted}`);
}

restoreFollowups();
