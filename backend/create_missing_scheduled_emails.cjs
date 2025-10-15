const { createClient } = require('@supabase/supabase-js');
const CampaignScheduler = require('./src/utils/CampaignScheduler');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

async function createMissingScheduledEmails() {
  console.log('\n🔄 CREATING MISSING SCHEDULED_EMAILS\n');

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    console.error('❌ Campaign not found');
    return;
  }

  console.log('Campaign:', campaign.name);
  console.log('Organization:', campaign.organization_id);
  console.log('Lead List:', campaign.config.leadListId);

  // Get all leads from the campaign's lead list
  let allLeads = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('leads')
      .select('id, email, organization_id')
      .eq('lead_list_id', campaign.config.leadListId)
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (!data || data.length === 0) break;
    allLeads = allLeads.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`📋 Total leads: ${allLeads.length}`);

  // Get existing scheduled_emails
  let existingScheduled = [];
  page = 0;
  while (true) {
    const { data } = await supabase
      .from('scheduled_emails')
      .select('lead_id')
      .eq('campaign_id', campaignId)
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (!data || data.length === 0) break;
    existingScheduled = existingScheduled.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  const existingLeadIds = new Set(existingScheduled.map(s => s.lead_id));
  console.log(`📧 Existing scheduled_emails: ${existingScheduled.length}`);

  // Find leads without scheduled_emails
  const missingLeads = allLeads.filter(lead => !existingLeadIds.has(lead.id));
  console.log(`⚠️ Missing scheduled_emails: ${missingLeads.length}\n`);

  if (missingLeads.length === 0) {
    console.log('✅ All leads already have scheduled_emails!\n');
    return;
  }

  // Use CampaignScheduler to create proper schedules
  const scheduler = new CampaignScheduler({
    timezone: campaign.config.timezone || 'UTC',
    emailsPerDay: campaign.config.emailsPerDay || 150,
    emailsPerHour: campaign.config.emailsPerHour || 50,
    sendingInterval: campaign.config.sendingInterval || 5,
    sendingHours: campaign.config.sendingHours || { start: 9, end: 17 },
    activeDays: campaign.config.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enableJitter: campaign.config.enableJitter !== undefined ? campaign.config.enableJitter : true,
    jitterMinutes: campaign.config.jitterMinutes || 3
  });

  // Get start time from last scheduled email or now
  let startTime = new Date();
  if (existingScheduled.length > 0) {
    const { data: lastScheduled } = await supabase
      .from('scheduled_emails')
      .select('send_at')
      .eq('campaign_id', campaignId)
      .order('send_at', { ascending: false })
      .limit(1)
      .single();

    if (lastScheduled && lastScheduled.send_at) {
      startTime = new Date(lastScheduled.send_at);
      console.log(`📅 Continuing from last scheduled email: ${startTime.toISOString()}`);
    }
  }

  console.log(`⏳ Scheduling ${missingLeads.length} emails...`);

  const schedules = scheduler.scheduleEmails(
    missingLeads,
    campaign.config.emailAccounts,
    startTime
  );

  console.log(`✅ Generated ${schedules.length} schedules\n`);

  // Get email account emails for from_email
  const { data: emailAccounts } = await supabase
    .from('oauth2_tokens')
    .select('id, email')
    .in('id', campaign.config.emailAccounts);

  const accountMap = new Map(emailAccounts.map(acc => [acc.id, acc.email]));

  // Create scheduled_emails in batches
  console.log('💾 Creating scheduled_emails in database...');
  const batchSize = 100;
  let created = 0;

  for (let i = 0; i < schedules.length; i += batchSize) {
    const batch = schedules.slice(i, i + batchSize);

    const records = batch.map(schedule => ({
      campaign_id: campaignId,
      lead_id: schedule.lead.id,
      organization_id: campaign.organization_id,
      to_email: schedule.lead.email,
      from_email: accountMap.get(schedule.emailAccountId),
      email_account_id: schedule.emailAccountId,
      subject: campaign.config.emailSubject,
      content: campaign.config.emailContent,
      status: 'scheduled',
      send_at: schedule.sendAt.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('scheduled_emails')
      .insert(records);

    if (error) {
      console.error(`❌ Error inserting batch:`, error.message);
    } else {
      created += batch.length;
      console.log(`Progress: ${created}/${schedules.length} (${Math.round(created / schedules.length * 100)}%)`);
    }
  }

  // Final verification
  const { count: finalCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  console.log('\n' + '='.repeat(50));
  console.log('✅ CREATION COMPLETE');
  console.log('='.repeat(50));
  console.log(`Created: ${created}`);
  console.log(`Total scheduled_emails: ${finalCount}`);
  console.log(`Expected: ${allLeads.length}`);
  console.log(`Match: ${finalCount === allLeads.length ? '✅ PERFECT' : `⚠️ Difference: ${finalCount - allLeads.length}`}`);
  console.log('='.repeat(50) + '\n');
}

createMissingScheduledEmails().catch(console.error);
