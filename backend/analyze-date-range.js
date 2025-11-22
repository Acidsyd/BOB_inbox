/**
 * Analyze scheduled emails for a specific date range
 * Usage: node backend/analyze-date-range.js <campaign-id> <start-date> <end-date>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDateRange(campaignId, startDate, endDate) {
  console.log('📅 ANALYZING SCHEDULED EMAILS\n');
  console.log('Campaign ID:', campaignId);
  console.log('Date Range:', startDate, 'to', endDate, '\n');

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found');
    process.exit(1);
  }

  console.log('📋 Campaign:', campaign.name);
  console.log('⚙️  Configuration:');
  console.log(`   - Emails per day: ${campaign.config.emailsPerDay}`);
  console.log(`   - Sending interval: ${campaign.config.sendingInterval} minutes`);
  console.log(`   - Sending hours: ${campaign.config.sendingHours.start}:00 - ${campaign.config.sendingHours.end}:00`);
  console.log(`   - Active days: ${campaign.config.activeDays ? campaign.config.activeDays.join(', ') : 'Not set'}`);
  console.log(`   - Timezone: ${campaign.timezone || 'UTC'}`);
  console.log();

  // Get all scheduled emails for date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include entire end date

  console.log(`🔍 Fetching emails from ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}\n`);

  const { data: scheduledEmails, error } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, send_at, status, sequence_step')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .gte('send_at', start.toISOString())
    .lte('send_at', end.toISOString())
    .order('send_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching scheduled emails:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${scheduledEmails.length} scheduled emails\n`);
  console.log('='.repeat(100));

  // Group by day
  const emailsByDay = {};
  scheduledEmails.forEach(email => {
    const sendDate = new Date(email.send_at);
    const dayKey = sendDate.toISOString().split('T')[0];
    const dayOfWeek = sendDate.toLocaleDateString('en-US', { weekday: 'long' });

    if (!emailsByDay[dayKey]) {
      emailsByDay[dayKey] = {
        dayOfWeek,
        emails: []
      };
    }

    emailsByDay[dayKey].emails.push({
      time: sendDate,
      to: email.to_email,
      id: email.id,
      isFollowup: email.sequence_step && email.sequence_step > 0,
      sequenceStep: email.sequence_step || 0
    });
  });

  // Analyze each day
  Object.entries(emailsByDay).forEach(([date, dayData], dayIndex) => {
    console.log(`\n📅 ${date} (${dayData.dayOfWeek})`);
    console.log('─'.repeat(100));
    console.log(`   Total emails scheduled: ${dayData.emails.length}`);

    // Calculate time distribution
    const hourDistribution = {};
    const secondsDistribution = [];

    dayData.emails.forEach(email => {
      const hour = email.time.getUTCHours();
      const minute = email.time.getUTCMinutes();
      const second = email.time.getUTCSeconds();

      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourDistribution[hourKey] = (hourDistribution[hourKey] || 0) + 1;

      secondsDistribution.push(second);
    });

    // Show hourly distribution
    console.log('\n   📊 Hourly Distribution:');
    Object.entries(hourDistribution)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([hour, count]) => {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`      ${hour} - ${(parseInt(hour) + 1).toString().padStart(2, '0')}:00 : ${bar} (${count} emails)`);
      });

    // Analyze seconds distribution
    const secondsInBuckets = {
      '0-14s': 0,
      '15-29s': 0,
      '30-44s': 0,
      '45-59s': 0
    };

    secondsDistribution.forEach(sec => {
      if (sec >= 0 && sec <= 14) secondsInBuckets['0-14s']++;
      else if (sec >= 15 && sec <= 29) secondsInBuckets['15-29s']++;
      else if (sec >= 30 && sec <= 44) secondsInBuckets['30-44s']++;
      else secondsInBuckets['45-59s']++;
    });

    console.log('\n   ⏱️  Seconds Distribution (shows jitter):');
    Object.entries(secondsInBuckets).forEach(([bucket, count]) => {
      const percentage = ((count / dayData.emails.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`      ${bucket}: ${bar} (${count} emails, ${percentage}%)`);
    });

    // Show first 10 emails with exact times
    console.log(`\n   📋 First 10 Scheduled Emails:`);
    console.log('   ' + '─'.repeat(100));
    console.log('      Time (UTC)              Seconds    Type        Recipient');
    console.log('   ' + '─'.repeat(100));

    dayData.emails.slice(0, 10).forEach((email, index) => {
      const timeStr = email.time.toISOString().substring(11, 19); // HH:MM:SS
      const seconds = email.time.getUTCSeconds().toString().padStart(2, '0');
      const typeSymbol = email.isFollowup ? `↪️ F${email.sequenceStep}` : '📧 Init';
      const recipient = email.to.length > 35 ? email.to.substring(0, 32) + '...' : email.to;
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${timeStr}          :${seconds}      ${typeSymbol.padEnd(8, ' ')}  ${recipient}`);
    });

    // Calculate intervals between emails
    if (dayData.emails.length > 1) {
      const intervals = [];
      for (let i = 1; i < Math.min(dayData.emails.length, 10); i++) {
        const diff = (dayData.emails[i].time - dayData.emails[i - 1].time) / 1000 / 60; // minutes
        intervals.push(diff);
      }

      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const minInterval = Math.min(...intervals);
      const maxInterval = Math.max(...intervals);

      console.log(`\n   📏 Interval Analysis (first 10 emails):`);
      console.log(`      Average: ${avgInterval.toFixed(2)} minutes`);
      console.log(`      Min: ${minInterval.toFixed(2)} minutes`);
      console.log(`      Max: ${maxInterval.toFixed(2)} minutes`);
      console.log(`      Expected: ${campaign.config.sendingInterval} minutes (±jitter)`);
    }
  });

  console.log('\n' + '='.repeat(100));
  console.log('\n📊 SUMMARY:\n');

  // Overall stats
  const allSeconds = [];
  Object.values(emailsByDay).forEach(day => {
    day.emails.forEach(email => {
      allSeconds.push(email.time.getUTCSeconds());
    });
  });

  const zerosCount = allSeconds.filter(s => s === 0).length;
  const zerosPercentage = ((zerosCount / allSeconds.length) * 100).toFixed(1);

  console.log(`   Total days analyzed: ${Object.keys(emailsByDay).length}`);
  console.log(`   Total emails: ${allSeconds.length}`);
  console.log(`   Emails at :00 seconds: ${zerosCount} (${zerosPercentage}%)`);
  console.log(`   Emails with varied seconds: ${allSeconds.length - zerosCount} (${(100 - zerosPercentage).toFixed(1)}%)`);

  if (zerosPercentage > 80) {
    console.log(`\n   ⚠️  Warning: ${zerosPercentage}% of emails are at :00 seconds`);
  } else {
    console.log(`\n   ✅ Good: ${(100 - zerosPercentage).toFixed(1)}% of emails have varied seconds - jitter is working!`);
  }

  console.log('\n💡 NOTE: Sub-minute randomization (0-44s delay) is applied at SEND TIME, not visible here.');
  console.log('   Check Recent Activity AFTER emails are sent to see actual send times with delays.\n');

  console.log('='.repeat(100) + '\n');
}

const campaignId = process.argv[2];
const startDate = process.argv[3];
const endDate = process.argv[4];

if (!campaignId || !startDate || !endDate) {
  console.error('Usage: node analyze-date-range.js <campaign-id> <start-date> <end-date>');
  console.error('Example: node analyze-date-range.js abc-123 2025-11-24 2025-11-29');
  process.exit(1);
}

analyzeDateRange(campaignId, startDate, endDate).catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
