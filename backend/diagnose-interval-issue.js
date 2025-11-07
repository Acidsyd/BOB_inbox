const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseIntervalIssue() {
  const campaignId = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';

  console.log('\n=== INTERVAL DIAGNOSIS FOR WISE 4 ===\n');

  // 1. Check campaign config
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, config, updated_at')
    .eq('id', campaignId)
    .single();

  console.log('Campaign:', campaign.name);
  console.log('Last updated:', campaign.updated_at);
  console.log('\n=== CONFIGURED SETTINGS ===');
  console.log('emailsPerHour:', campaign.config.emailsPerHour);
  console.log('sendingInterval:', campaign.config.sendingInterval, 'minutes');
  console.log('emailsPerDay:', campaign.config.emailsPerDay);
  console.log('enableJitter:', campaign.config.enableJitter);
  console.log('jitterMinutes:', campaign.config.jitterMinutes);

  // 2. Calculate what intervals SHOULD be used
  const emailsPerHour = campaign.config.emailsPerHour || 10;
  const sendingInterval = campaign.config.sendingInterval || 15;
  const minIntervalFromHourly = Math.ceil(60 / emailsPerHour);
  const actualInterval = Math.max(sendingInterval, minIntervalFromHourly);

  console.log('\n=== CALCULATED INTERVALS ===');
  console.log('Configured sendingInterval:', sendingInterval, 'min');
  console.log('Min interval from emailsPerHour:', minIntervalFromHourly, 'min (60 /' , emailsPerHour, '= ' + (60/emailsPerHour).toFixed(2) + ', ceil = ' + minIntervalFromHourly + ')');
  console.log('ACTUAL interval (max of both):', actualInterval, 'min');

  if (actualInterval !== sendingInterval) {
    console.log('\n⚠️ WARNING: emailsPerHour is OVERRIDING sendingInterval!');
    console.log(`   You want ${sendingInterval} min intervals, but ${emailsPerHour} emails/hour forces ${minIntervalFromHourly} min minimum`);

    const requiredEmailsPerHour = Math.ceil(60 / sendingInterval);
    console.log(`\n💡 SOLUTION: Set emailsPerHour to ${requiredEmailsPerHour} to allow ${sendingInterval}-minute intervals`);
  }

  // 3. Check recent actual intervals
  const { data: recentEmails } = await supabase
    .from('scheduled_emails')
    .select('id, sent_at, send_at, created_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(15);

  if (recentEmails && recentEmails.length > 1) {
    console.log('\n=== RECENT ACTUAL INTERVALS ===');

    let totalInterval = 0;
    let count = 0;

    for (let i = 1; i < recentEmails.length; i++) {
      const current = new Date(recentEmails[i-1].sent_at);
      const previous = new Date(recentEmails[i].sent_at);
      const intervalMin = (current - previous) / (1000 * 60);

      console.log(`${previous.toISOString()} → ${current.toISOString()}: ${intervalMin.toFixed(1)} min`);

      totalInterval += intervalMin;
      count++;
    }

    const avgInterval = totalInterval / count;
    console.log(`\nAverage actual interval: ${avgInterval.toFixed(1)} minutes`);

    if (Math.abs(avgInterval - actualInterval) > 2) {
      console.log(`⚠️ WARNING: Actual interval (${avgInterval.toFixed(1)} min) doesn't match calculated (${actualInterval} min)!`);
    }
  }

  // 4. Check for jitter application
  console.log('\n=== JITTER ANALYSIS ===');

  if (campaign.config.enableJitter === false) {
    console.log('❌ Jitter is DISABLED in campaign config!');
  } else {
    console.log('✅ Jitter is enabled in config');
    console.log('   Jitter amount:', campaign.config.jitterMinutes || 3, 'minutes');

    // Check if scheduled emails show jitter variance
    const { data: scheduledEmails } = await supabase
      .from('scheduled_emails')
      .select('send_at, created_at')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(20);

    if (scheduledEmails && scheduledEmails.length > 1) {
      const intervals = [];
      for (let i = 1; i < scheduledEmails.length; i++) {
        const current = new Date(scheduledEmails[i].send_at);
        const previous = new Date(scheduledEmails[i-1].send_at);
        const intervalMin = (current - previous) / (1000 * 60);
        intervals.push(intervalMin);
      }

      const avgScheduled = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.map(i => Math.abs(i - avgScheduled)).reduce((a, b) => a + b, 0) / intervals.length;

      console.log('\nScheduled email intervals:');
      console.log('  Average:', avgScheduled.toFixed(1), 'min');
      console.log('  Variance:', variance.toFixed(2), 'min');

      if (variance < 0.5) {
        console.log('  ⚠️ Very low variance - jitter may NOT be applied to scheduled emails!');
      } else {
        console.log('  ✅ Good variance - jitter appears to be working');
      }
    }
  }

  // 5. Check if there was a recent restart
  const { data: recentUpdates } = await supabase
    .from('scheduled_emails')
    .select('updated_at, created_at, send_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('updated_at', { ascending: false })
    .limit(5);

  console.log('\n=== RECENT SCHEDULED EMAIL UPDATES ===');
  if (recentUpdates && recentUpdates.length > 0) {
    recentUpdates.forEach(email => {
      const created = new Date(email.created_at);
      const updated = new Date(email.updated_at);
      const timeSince = (updated - created) / 1000; // seconds

      if (timeSince > 60) {
        console.log(`Updated ${Math.floor(timeSince/60)} min after creation - likely rescheduled`);
      } else {
        console.log(`Updated ${Math.floor(timeSince)} sec after creation - initial save`);
      }
    });
  }
}

diagnoseIntervalIssue().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
