/**
 * Analyze next 3 days of scheduled emails for a campaign
 * Usage: node backend/analyze-3-day-schedule.js <campaign-id>
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

async function analyze3DaySchedule(campaignId) {
  console.log('📅 ANALYZING NEXT 3 DAYS OF SCHEDULED EMAILS\n');
  console.log('Campaign ID:', campaignId, '\n');

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
  console.log(`   - Timezone: ${campaign.timezone || 'UTC'}`);
  console.log();

  // Calculate date range for next 3 days
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

  console.log(`🔍 Analyzing emails from ${now.toISOString().split('T')[0]} to ${threeDaysFromNow.toISOString().split('T')[0]}\n`);

  // Get all scheduled emails for next 3 days
  const { data: scheduledEmails, error } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, send_at, status')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .gte('send_at', now.toISOString())
    .lte('send_at', threeDaysFromNow.toISOString())
    .order('send_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching scheduled emails:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${scheduledEmails.length} scheduled emails in next 3 days\n`);
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
      id: email.id
    });
  });

  // Analyze each day
  Object.entries(emailsByDay).forEach(([date, dayData], dayIndex) => {
    console.log(`\n📅 DAY ${dayIndex + 1}: ${date} (${dayData.dayOfWeek})`);
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

    console.log('\n   ⏱️  Seconds Distribution (shows jitter at scheduling):');
    Object.entries(secondsInBuckets).forEach(([bucket, count]) => {
      const percentage = ((count / dayData.emails.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`      ${bucket}: ${bar} (${count} emails, ${percentage}%)`);
    });

    // Show first 15 emails with exact times
    console.log(`\n   📋 First 15 Scheduled Emails:`);
    console.log('   ' + '─'.repeat(96));
    console.log('      Time (UTC)              Seconds    Recipient');
    console.log('   ' + '─'.repeat(96));

    dayData.emails.slice(0, 15).forEach((email, index) => {
      const timeStr = email.time.toISOString().substring(11, 19); // HH:MM:SS
      const seconds = email.time.getUTCSeconds().toString().padStart(2, '0');
      const recipient = email.to.length > 40 ? email.to.substring(0, 37) + '...' : email.to;
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${timeStr}          :${seconds}      ${recipient}`);
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
  console.log('\n🎲 RANDOMIZATION ANALYSIS:\n');

  // Analyze overall randomization effectiveness
  const allSeconds = [];
  Object.values(emailsByDay).forEach(day => {
    day.emails.forEach(email => {
      allSeconds.push(email.time.getUTCSeconds());
    });
  });

  const zerosCount = allSeconds.filter(s => s === 0).length;
  const nonZerosCount = allSeconds.length - zerosCount;
  const zerosPercentage = ((zerosCount / allSeconds.length) * 100).toFixed(1);

  console.log(`   Total scheduled emails analyzed: ${allSeconds.length}`);
  console.log(`   Emails at :00 seconds: ${zerosCount} (${zerosPercentage}%)`);
  console.log(`   Emails with varied seconds: ${nonZerosCount} (${(100 - zerosPercentage).toFixed(1)}%)`);

  if (zerosPercentage > 80) {
    console.log(`\n   ⚠️  Warning: ${zerosPercentage}% of emails are at :00 seconds - jitter may not be fully applied`);
  } else {
    console.log(`\n   ✅ Good: ${(100 - zerosPercentage).toFixed(1)}% of emails have varied seconds - jitter is working!`);
  }

  console.log('\n💡 NOTE: Sub-minute randomization (0-44s delay) is applied at SEND TIME, not visible here.');
  console.log('   Check Recent Activity AFTER emails are sent to see actual send times with delays.\n');

  console.log('='.repeat(100) + '\n');
}

const campaignId = process.argv[2];
if (!campaignId) {
  console.error('Usage: node backend/analyze-3-day-schedule.js <campaign-id>');
  process.exit(1);
}

analyze3DaySchedule(campaignId).catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
