const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function investigateInterval() {
  const campaignId = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

  // Get campaign details
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  console.log('=== CAMPAIGN CONFIGURATION ===');
  console.log('Sending Interval:', campaign.config.sendingInterval, 'minutes');
  console.log('Emails Per Day:', campaign.config.emailsPerDay);
  console.log('Emails Per Hour:', campaign.config.emailsPerHour || 'Not set');
  console.log('Number of Accounts:', campaign.config.emailAccounts.length);
  console.log('Timezone:', campaign.config.timezone);
  console.log('Sending Hours:', `${campaign.config.sendingHours.start}:00 - ${campaign.config.sendingHours.end}:00`);

  // Calculate expected intervals
  const accountCount = campaign.config.emailAccounts.length;
  const sendingInterval = campaign.config.sendingInterval;
  const emailsPerDay = campaign.config.emailsPerDay;
  const sendingHoursStart = campaign.config.sendingHours.start;
  const sendingHoursEnd = campaign.config.sendingHours.end;
  const sendingHoursPerDay = sendingHoursEnd - sendingHoursStart;

  console.log('\n=== TIMING CALCULATIONS ===');
  console.log('Sending window per day:', sendingHoursPerDay, 'hours (', sendingHoursPerDay * 60, 'minutes)');
  console.log('Max emails per day limit:', emailsPerDay);

  // Calculate effective interval based on daily limit
  const minutesPerDay = sendingHoursPerDay * 60;
  const minIntervalFromDailyLimit = minutesPerDay / emailsPerDay;

  console.log('\n=== INTERVAL ANALYSIS ===');
  console.log('Configured interval:', sendingInterval, 'minutes');
  console.log('Min interval from daily limit:', minIntervalFromDailyLimit.toFixed(2), 'minutes');
  console.log('  (calculation:', minutesPerDay, 'min /', emailsPerDay, 'emails per day)');

  // With 8 accounts, each account sends 1 email per round
  // So the actual interval between emails sent = interval * number of accounts
  const effectiveInterval = sendingInterval; // Per account
  const actualIntervalBetweenEmails = effectiveInterval * accountCount / accountCount; // This should be the base

  console.log('\n=== MULTI-ACCOUNT CONSIDERATIONS ===');
  console.log('Base interval (per campaign):', sendingInterval, 'minutes');
  console.log('Number of accounts:', accountCount);

  // But wait - if we're sending to 8 accounts in rotation...
  // And the campaign has a 5-minute interval...
  // That means we can only send 1 email total every 5 minutes across all accounts
  // So if we rotate through 8 accounts: 5 min * 8 = 40 minutes per cycle

  console.log('\n=== ROTATION CYCLE ANALYSIS ===');
  console.log('If campaign interval is per-account:');
  console.log('  Interval per account:', sendingInterval, 'min');
  console.log('  Time for full rotation cycle:', sendingInterval * accountCount, 'min');

  console.log('\nIf campaign interval is total (what we observe):');
  console.log('  Emails per account per hour:', 60 / minIntervalFromDailyLimit);
  console.log('  Emails per account per day:', (60 / minIntervalFromDailyLimit) * sendingHoursPerDay);
  console.log('  Total emails per day (all accounts):', ((60 / minIntervalFromDailyLimit) * sendingHoursPerDay * accountCount).toFixed(0));

  // Get some actual intervals to verify
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('send_at, email_account_id')
    .eq('campaign_id', campaignId)
    .order('send_at', { ascending: true })
    .limit(100);

  // Group by account and check intervals within same account
  const accountIntervals = {};

  campaign.config.emailAccounts.forEach(accountId => {
    const accountEmails = emails.filter(e => e.email_account_id === accountId);
    const intervals = [];

    for (let i = 1; i < accountEmails.length; i++) {
      const curr = new Date(accountEmails[i].send_at);
      const prev = new Date(accountEmails[i-1].send_at);
      const diffMin = (curr - prev) / 1000 / 60;
      intervals.push(diffMin);
    }

    if (intervals.length > 0) {
      accountIntervals[accountId.substring(0, 8)] = {
        count: accountEmails.length,
        avgInterval: intervals.reduce((a,b) => a+b, 0) / intervals.length,
        minInterval: Math.min(...intervals),
        maxInterval: Math.max(...intervals)
      };
    }
  });

  console.log('\n=== PER-ACCOUNT INTERVAL ANALYSIS (First 100 emails) ===');
  Object.keys(accountIntervals).forEach(shortId => {
    const stats = accountIntervals[shortId];
    console.log(`  ...${shortId}: avg=${stats.avgInterval.toFixed(1)}min, min=${stats.minInterval.toFixed(1)}min, max=${stats.maxInterval.toFixed(1)}min, count=${stats.count}`);
  });

  console.log('\n=== CONCLUSION ===');
  if (minIntervalFromDailyLimit > sendingInterval) {
    console.log('⚠️  The daily limit (', emailsPerDay, ') is constraining the interval more than the configured interval');
    console.log('    Effective interval:', minIntervalFromDailyLimit.toFixed(2), 'min (based on daily limit)');
    console.log('    vs Configured interval:', sendingInterval, 'min');
    console.log('\n    To respect the', sendingInterval, 'min interval with', accountCount, 'accounts:');
    console.log('    You would need to allow at least', Math.ceil((minutesPerDay / sendingInterval)), 'emails per day');
  } else {
    console.log('✅ The configured interval should be respected');
  }
}

investigateInterval().catch(console.error);
