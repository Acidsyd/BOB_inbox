require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const CampaignScheduler = require('./src/utils/CampaignScheduler');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const WISE4_CAMPAIGN_ID = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';

async function fixWise4Schedule() {
  console.log('🔧 FIXING WISE 4 CAMPAIGN SCHEDULE\n');
  console.log('='.repeat(60));

  // 1. Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', WISE4_CAMPAIGN_ID)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found');
    return;
  }

  console.log('✅ Campaign found:', campaign.name);
  console.log('   Status:', campaign.status);
  console.log('   Organization ID:', campaign.organization_id);

  // 2. Get all scheduled_emails
  let allEmails = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: emailsPage } = await supabase
      .from('scheduled_emails')
      .select('id, lead_id, status, send_at')
      .eq('campaign_id', WISE4_CAMPAIGN_ID)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!emailsPage || emailsPage.length === 0) break;
    allEmails = allEmails.concat(emailsPage);
    if (emailsPage.length < pageSize) break;
    page++;
  }

  console.log(`\n📧 Found ${allEmails.length} existing scheduled_emails`);

  // 3. Categorize by status
  const sentLeadIds = new Set();
  const scheduledEmails = [];
  const failedEmails = [];

  allEmails.forEach(email => {
    if (email.status === 'sent') {
      sentLeadIds.add(email.lead_id);
    } else if (email.status === 'scheduled') {
      scheduledEmails.push(email);
    } else if (email.status === 'failed' || email.status === 'skipped') {
      failedEmails.push(email);
    }
  });

  console.log(`   Sent: ${sentLeadIds.size} leads`);
  console.log(`   Scheduled: ${scheduledEmails.length}`);
  console.log(`   Failed/Skipped: ${failedEmails.length}`);

  // 4. Get leads
  const leadListId = campaign.config?.leadListId;
  if (!leadListId) {
    console.error('❌ No lead list configured');
    return;
  }

  let allLeads = [];
  page = 0;

  while (true) {
    const { data: leadsPage } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_list_id', leadListId)
      .eq('status', 'active')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!leadsPage || leadsPage.length === 0) break;
    allLeads = allLeads.concat(leadsPage);
    if (leadsPage.length < pageSize) break;
    page++;
  }

  console.log(`\n👥 Found ${allLeads.length} total active leads`);

  // 5. Filter out already-sent leads
  const leadsToSchedule = allLeads.filter(lead => !sentLeadIds.has(lead.id));
  console.log(`   Leads to schedule: ${leadsToSchedule.length} (excluding ${sentLeadIds.size} already sent)`);

  if (leadsToSchedule.length === 0) {
    console.log('\n⚠️  All leads already sent! No emails to schedule.');
    console.log('💡 If you want to re-send, cancel existing "sent" emails first.');
    return;
  }

  // 6. Get email accounts
  const emailAccounts = campaign.config?.emailAccounts || [];
  if (emailAccounts.length === 0) {
    console.error('❌ No email accounts configured');
    return;
  }

  console.log(`\n📬 Email accounts: ${emailAccounts.length}`);

  // 7. Create new schedule using CampaignScheduler
  const scheduler = new CampaignScheduler({
    timezone: campaign.config?.timezone || 'UTC',
    emailsPerDay: campaign.config?.emailsPerDay || 100,
    emailsPerHour: campaign.config?.emailsPerHour || 10, // Ignored now
    sendingInterval: campaign.config?.sendingInterval || 15,
    sendingHours: campaign.config?.sendingHours || { start: 9, end: 17 },
    activeDays: campaign.config?.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enableJitter: campaign.config?.enableJitter !== false,
    jitterMinutes: campaign.config?.jitterMinutes || 3
  });

  console.log('\n⏰ Generating new schedule with Perfect Rotation...');
  const leadSchedules = scheduler.scheduleEmailsWithPerfectRotation(leadsToSchedule, emailAccounts);
  console.log(`✅ Generated ${leadSchedules.length} schedules`);

  if (leadSchedules.length > 0) {
    const first = leadSchedules[0];
    const last = leadSchedules[leadSchedules.length - 1];
    console.log(`   First email: ${first.sendAt.toISOString()}`);
    console.log(`   Last email: ${last.sendAt.toISOString()}`);
  }

  // 8. Create a map of lead_id to existing scheduled_email
  const existingEmailMap = new Map();
  allEmails.forEach(email => {
    if (email.status !== 'sent') {
      existingEmailMap.set(email.lead_id, email);
    }
  });

  // 9. Separate into UPDATE vs INSERT
  const toUpdate = [];
  const toInsert = [];

  leadSchedules.forEach(schedule => {
    const leadId = schedule.lead.id;
    const existingEmail = existingEmailMap.get(leadId);

    if (existingEmail) {
      toUpdate.push({ schedule, emailId: existingEmail.id });
    } else {
      toInsert.push(schedule);
    }
  });

  console.log(`\n🔄 Will UPDATE: ${toUpdate.length} existing emails`);
  console.log(`➕ Will INSERT: ${toInsert.length} new emails`);

  // 10. UPDATE existing emails
  console.log('\n🔄 Updating existing scheduled_emails...');
  let updated = 0;
  const updateBatchSize = 50;

  for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
    const batch = toUpdate.slice(i, i + updateBatchSize);

    for (const { schedule, emailId } of batch) {
      const { error } = await supabase
        .from('scheduled_emails')
        .update({
          send_at: schedule.sendAt.toISOString(),
          status: 'scheduled',
          email_account_id: schedule.emailAccountId,
          updated_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', emailId);

      if (error) {
        console.error(`   ❌ Failed to update ${emailId}:`, error.message);
      } else {
        updated++;
      }
    }

    console.log(`   Updated ${updated}/${toUpdate.length}...`);
  }

  console.log(`✅ Updated ${updated} emails`);

  // 11. INSERT new emails
  console.log('\n➕ Inserting new scheduled_emails...');
  let inserted = 0;
  const insertBatchSize = 100;

  for (let i = 0; i < toInsert.length; i += insertBatchSize) {
    const batch = toInsert.slice(i, i + insertBatchSize);

    const records = batch.map(schedule => ({
      campaign_id: WISE4_CAMPAIGN_ID,
      organization_id: campaign.organization_id,
      lead_id: schedule.lead.id,
      to_email: schedule.lead.email,
      from_email: null, // Will be set by cron processor
      subject: campaign.config.emailSubject,
      content: campaign.config.emailContent,
      send_at: schedule.sendAt.toISOString(),
      email_account_id: schedule.emailAccountId,
      status: 'scheduled',
      sequence_step: 0,
      is_follow_up: false
    }));

    const { error } = await supabase
      .from('scheduled_emails')
      .insert(records);

    if (error) {
      console.error(`   ❌ Failed to insert batch:`, error.message);
    } else {
      inserted += batch.length;
    }

    console.log(`   Inserted ${inserted}/${toInsert.length}...`);
  }

  console.log(`✅ Inserted ${inserted} emails`);

  // 12. Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ WISE 4 SCHEDULE FIXED!\n');
  console.log(`   Total leads to schedule: ${leadsToSchedule.length}`);
  console.log(`   Emails updated: ${updated}`);
  console.log(`   Emails inserted: ${inserted}`);
  console.log(`   Total scheduled emails: ${updated + inserted}`);
  console.log('\n💡 The campaign should now send emails properly!');
  console.log('='.repeat(60));
}

fixWise4Schedule().catch(console.error);
