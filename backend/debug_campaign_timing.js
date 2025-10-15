const { createClient } = require('@supabase/supabase-js');
const CampaignScheduler = require('./src/utils/CampaignScheduler');
const TimezoneService = require('./src/services/TimezoneService');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function debugCampaignTiming() {
  console.log('\n🔍 DEBUG: CAMPAIGN TIMING ISSUE');
  console.log('='.repeat(80));

  // Get campaign config
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', '55205d7b-9ebf-414a-84bc-52c8b724dd30')
    .single();

  console.log('\n📋 Campaign Configuration:');
  console.log(`   Timezone: ${campaign.config.timezone}`);
  console.log(`   Sending hours: ${campaign.config.sendingHours.start} - ${campaign.config.sendingHours.end}`);
  console.log(`   Interval: ${campaign.config.sendingInterval} minutes`);

  // Simulate what scheduler would create for Oct 16
  console.log('\n🧪 SIMULATING SCHEDULER');
  console.log('   If campaign started at: 2025-10-14T21:40:47 Rome');

  const scheduler = new CampaignScheduler({
    timezone: campaign.config.timezone,
    emailsPerDay: campaign.config.emailsPerDay,
    emailsPerHour: campaign.config.emailsPerHour,
    sendingInterval: campaign.config.sendingInterval,
    sendingHours: campaign.config.sendingHours,
    activeDays: campaign.config.activeDays
  });

  // Start time: Oct 14 at 21:40 Rome
  const startTimeRome = '2025-10-14T21:40:47';
  const startTimeUTC = TimezoneService.convertFromUserTimezone(startTimeRome, 'Europe/Rome');

  console.log(`   Start time UTC: ${startTimeUTC.toISOString()}`);

  const validWindow = scheduler.moveToNextValidSendingWindow(startTimeUTC);
  console.log(`   Next valid window UTC: ${validWindow.toISOString()}`);
  console.log(`   Next valid window Rome: ${validWindow.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);

  // Check what was actually stored
  console.log('\n📊 ACTUAL DATABASE VALUES (Oct 16):');
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('send_at, to_email')
    .eq('campaign_id', '55205d7b-9ebf-414a-84bc-52c8b724dd30')
    .gte('send_at', '2025-10-16T06:00:00')
    .lt('send_at', '2025-10-16T10:00:00')
    .order('send_at', { ascending: true })
    .limit(3);

  emails.forEach((e, i) => {
    const sendAtDate = new Date(e.send_at);
    const romeTime = sendAtDate.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false });
    console.log(`   ${i+1}. ${e.to_email}`);
    console.log(`      Database: ${e.send_at}`);
    console.log(`      As UTC: ${sendAtDate.toISOString()}`);
    console.log(`      As Rome: ${romeTime}`);
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

debugCampaignTiming().catch(console.error);
