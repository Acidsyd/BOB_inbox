require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SpintaxParser = require('./src/utils/spintax');
const CampaignScheduler = require('./src/utils/CampaignScheduler');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CAMPAIGN_ID = 'c0f9d471-ac96-400f-a942-9c55487a8a53';

async function recreateMissingFollowups() {
  console.log('\n🔧 Recreating Missing Follow-ups\n');
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

  const followUpConfig = emailSequence[0];
  const delayDays = followUpConfig.delay || 1;

  console.log(`✅ Follow-up configuration:`);
  console.log(`   Delay: ${delayDays} days`);
  console.log(`   Reply to same thread: ${followUpConfig.replyToSameThread}`);
  console.log('');

  // Step 2: Get all sent initial emails (sequence_step = 0, status = 'sent')
  const { data: sentInitials, error: sentError } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('organization_id', campaign.organization_id)
    .eq('sequence_step', 0)
    .eq('status', 'sent')
    .order('sent_at');

  if (sentError) {
    console.error('❌ Failed to get sent initials:', sentError);
    return;
  }

  console.log(`📧 Found ${sentInitials.length} sent initial emails`);
  if (sentInitials.length > 0) {
    console.log(`   First sent: ${sentInitials[0].sent_at}`);
    console.log(`   Last sent: ${sentInitials[sentInitials.length - 1].sent_at}`);
  }
  console.log('');

  // Step 3: Check which ones already have follow-ups (any status)
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

  const leadsWithFollowups = new Set(existingFollowups.map(f => f.lead_id));
  const leadsMissingFollowups = sentInitials.filter(email => !leadsWithFollowups.has(email.lead_id));

  console.log(`📊 Existing follow-ups: ${existingFollowups.length}`);
  console.log(`❌ Missing follow-ups: ${leadsMissingFollowups.length}`);
  console.log('');

  if (leadsMissingFollowups.length === 0) {
    console.log('✅ All leads already have follow-ups - nothing to create');
    return;
  }

  console.log(`🔧 Creating ${leadsMissingFollowups.length} missing follow-ups...\n`);

  // Step 4: Get lead details for personalization
  const leadIds = leadsMissingFollowups.map(e => e.lead_id);
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', leadIds);

  if (leadsError) {
    console.error('❌ Failed to get leads:', leadsError);
    return;
  }

  const leadsMap = new Map(leads.map(l => [l.id, l]));

  // Step 5: Create CampaignScheduler to respect timing rules
  const scheduler = new CampaignScheduler({
    timezone: campaign.config?.timezone || 'UTC',
    emailsPerDay: campaign.config?.emailsPerDay || 100,
    sendingInterval: campaign.config?.sendingInterval || 15,
    sendingHours: campaign.config?.sendingHours || { start: 9, end: 17 },
    activeDays: campaign.config?.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enableJitter: campaign.config?.enableJitter || false,
    jitterMinutes: campaign.config?.jitterMinutes || 2
  });

  console.log(`⏰ Timing rules:`);
  console.log(`   Timezone: ${campaign.config?.timezone || 'UTC'}`);
  console.log(`   Sending hours: ${campaign.config?.sendingHours?.start || 9}:00 - ${campaign.config?.sendingHours?.end || 17}:00`);
  console.log(`   Active days: ${(campaign.config?.activeDays || []).join(', ')}`);
  console.log(`   Jitter: ${campaign.config?.enableJitter ? 'enabled' : 'disabled'}`);
  console.log('');

  // Step 6: Create follow-ups with proper timing
  const followUpsToInsert = [];

  for (const initial of leadsMissingFollowups) {
    const lead = leadsMap.get(initial.lead_id);
    if (!lead) {
      console.warn(`⚠️  Lead ${initial.lead_id} not found, skipping`);
      continue;
    }

    // Calculate base send_at: initial.sent_at + delay days
    const baseSendAt = new Date(initial.sent_at);
    baseSendAt.setDate(baseSendAt.getDate() + delayDays);

    // Apply timing rules (move to valid sending window)
    let scheduledSendAt = scheduler.moveToNextValidSendingWindow(baseSendAt);

    // Apply jitter if enabled
    if (campaign.config?.enableJitter) {
      scheduledSendAt = scheduler.applyJitter(scheduledSendAt, lead.email);
      // Re-validate after jitter
      scheduledSendAt = scheduler.moveToNextValidSendingWindow(scheduledSendAt);
    }

    // Process spintax and personalization
    const rawContent = followUpConfig.content || '';
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
      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedContent = processedContent.replace(new RegExp(escapedToken, 'g'), value);
    });

    followUpsToInsert.push({
      campaign_id: CAMPAIGN_ID,
      organization_id: campaign.organization_id,
      lead_id: initial.lead_id,
      email_account_id: initial.email_account_id,
      to_email: initial.to_email,
      subject: followUpConfig.subject || initial.subject,
      content: processedContent,
      send_at: scheduledSendAt.toISOString(),
      sequence_step: 1,
      parent_message_id: initial.id,
      reply_to_thread: followUpConfig.replyToSameThread || false,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  console.log(`📋 Prepared ${followUpsToInsert.length} follow-ups for insertion\n`);

  // Show sample timing
  if (followUpsToInsert.length > 0) {
    console.log('Sample timing (first 5):');
    followUpsToInsert.slice(0, 5).forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.to_email} → ${f.send_at}`);
    });
    console.log('');
  }

  // Step 7: Insert in batches
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < followUpsToInsert.length; i += BATCH_SIZE) {
    const batch = followUpsToInsert.slice(i, i + BATCH_SIZE);

    const { error: insertError } = await supabase
      .from('scheduled_emails')
      .insert(batch);

    if (insertError) {
      console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/${followUpsToInsert.length} follow-ups...`);
    }
  }

  console.log(`\n🎉 Successfully created ${inserted} follow-ups!`);
  console.log(`\n📊 Final Stats:`);
  console.log(`   Sent initials: ${sentInitials.length}`);
  console.log(`   Existing follow-ups: ${leadsWithFollowups.size}`);
  console.log(`   Created follow-ups: ${inserted}`);
  console.log(`   Total follow-ups now: ${leadsWithFollowups.size + inserted}`);
}

recreateMissingFollowups();
