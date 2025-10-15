require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const CampaignScheduler = require('./src/utils/CampaignScheduler');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

  console.log('🔧 Fixing campaign schedule...\n');

  // Get campaign config
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('config, organization_id')
    .eq('id', campaignId)
    .single();

  console.log('Campaign config:');
  console.log('  Sending interval:', campaign.config.sendingInterval, 'minutes');
  console.log('  Email accounts:', campaign.config.emailAccounts.length);
  console.log('  Timezone:', campaign.config.timezone);

  // Get all scheduled emails (not sent yet)
  const { data: scheduledEmails } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, sequence_step')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('created_at', { ascending: true });

  console.log('\nTotal scheduled emails to fix:', scheduledEmails.length);

  // Get unique leads to reschedule
  const leadIds = [...new Set(scheduledEmails.map(e => e.lead_id))];
  console.log('Unique leads:', leadIds.length);

  // Get lead data in batches to avoid URI too large error
  const leads = [];
  const batchSize = 100;
  for (let i = 0; i < leadIds.length; i += batchSize) {
    const batch = leadIds.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('leads')
      .select('id, email')
      .in('id', batch);

    if (error) {
      console.error(`Error fetching leads batch ${i / batchSize + 1}:`, error);
      continue;
    }

    if (data) {
      leads.push(...data);
    }
  }

  console.log('Retrieved leads:', leads.length);

  // CRITICAL: Sort leads in the same order as scheduled_emails
  // This ensures schedule[i] corresponds to scheduled_email[i]
  const leadIdToEmail = new Map(leads.map(l => [l.id, l]));
  const sortedLeads = scheduledEmails
    .filter(e => e.sequence_step === 0) // Only initial emails
    .map(e => leadIdToEmail.get(e.lead_id))
    .filter(Boolean); // Remove any missing leads

  console.log('Sorted leads to match scheduled_emails order:', sortedLeads.length);

  // Create scheduler with campaign config
  const scheduler = new CampaignScheduler({
    timezone: campaign.config.timezone || 'UTC',
    emailsPerDay: campaign.config.emailsPerDay || 100,
    emailsPerHour: campaign.config.emailsPerHour || 10,
    sendingInterval: campaign.config.sendingInterval || 7,
    sendingHours: campaign.config.sendingHours || { start: 9, end: 17 },
    activeDays: campaign.config.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enableJitter: campaign.config.enableJitter !== undefined ? campaign.config.enableJitter : true,
    jitterMinutes: campaign.config.jitterMinutes || 3
  });

  // Generate NEW schedule starting from now
  const emailAccounts = campaign.config.emailAccounts;
  const newSchedules = scheduler.scheduleEmails(sortedLeads, emailAccounts);

  console.log('\nGenerated', newSchedules.length, 'new schedules');
  console.log('First 5 schedules:');
  newSchedules.slice(0, 5).forEach((s, idx) => {
    console.log(`  ${idx + 1}. ${s.sendAt.toISOString()} - Account: ${s.emailAccountId.substring(0, 8)}...`);
  });

  // Create a map of lead_id to new schedule
  const scheduleMap = new Map();
  newSchedules.forEach(schedule => {
    scheduleMap.set(schedule.lead.id, schedule);
  });

  // Update each scheduled email with new send_at and email_account_id
  console.log('\nUpdating scheduled emails...');
  let updated = 0;
  let errors = 0;

  for (const email of scheduledEmails) {
    // Only update initial emails (sequence_step 0), follow-ups will be calculated later
    if (email.sequence_step !== 0) continue;

    const newSchedule = scheduleMap.get(email.lead_id);
    if (!newSchedule) {
      console.log(`  ⚠️  No schedule found for lead ${email.lead_id}`);
      errors++;
      continue;
    }

    const { error } = await supabase
      .from('scheduled_emails')
      .update({
        send_at: newSchedule.sendAt.toISOString(),
        email_account_id: newSchedule.emailAccountId
      })
      .eq('id', email.id);

    if (error) {
      console.log(`  ❌ Error updating email ${email.id}:`, error);
      errors++;
    } else {
      updated++;
      if (updated <= 5) {
        console.log(`  ✅ Updated email ${email.id}`);
      }
    }
  }

  console.log(`\n✅ Updated ${updated} emails`);
  if (errors > 0) {
    console.log(`❌ ${errors} errors`);
  }

  // Show first 10 after update
  const { data: verifyEmails } = await supabase
    .from('scheduled_emails')
    .select('send_at, email_account_id, to_email')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .eq('sequence_step', 0)
    .order('send_at', { ascending: true })
    .limit(10);

  console.log('\nFirst 10 emails after fix:');
  let prevTime = null;
  verifyEmails.forEach((email, idx) => {
    const sendAt = new Date(email.send_at);
    const time = sendAt.toISOString();
    const accountShort = email.email_account_id.substring(0, 8);

    let gap = '';
    if (prevTime) {
      const diffMs = sendAt - prevTime;
      const diffMin = Math.round(diffMs / 1000 / 60);
      gap = ` [${diffMin} min gap]`;
    }
    prevTime = sendAt;

    console.log(`  ${idx + 1}. ${time}${gap} - Account: ${accountShort}... → ${email.to_email}`);
  });
})();
