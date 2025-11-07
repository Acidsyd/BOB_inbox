const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseRestartBug() {
  try {
    console.log('\n🔍 DIAGNOSING CAMPAIGN RESTART BUG\n');
    console.log('='.repeat(80));

    // Get WISE 3 campaign
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .ilike('name', '%WISE 3%')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!campaigns || campaigns.length === 0) {
      console.log('❌ Campaign not found');
      return;
    }

    const campaign = campaigns[0];
    const config = campaign.config || {};

    console.log('📋 Campaign Information:');
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Updated: ${new Date(campaign.updated_at).toLocaleString()}`);
    console.log(`   Created: ${new Date(campaign.created_at).toLocaleString()}`);

    console.log('\n⚙️  Configuration:');
    console.log(`   Interval: ${config.sendingInterval} minutes`);
    console.log(`   Emails/day: ${config.emailsPerDay}`);
    console.log(`   Sending hours: ${config.sendingHours?.start} - ${config.sendingHours?.end}`);
    console.log(`   Active days: ${(config.activeDays || []).join(', ')}`);

    // Get all scheduled emails sorted by send_at
    const { data: allScheduled } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, send_at, created_at, updated_at, status')
      .eq('campaign_id', campaign.id)
      .eq('status', 'scheduled')
      .eq('is_follow_up', false)
      .order('send_at', { ascending: true })
      .limit(100);

    if (!allScheduled || allScheduled.length === 0) {
      console.log('\n⚠️  No scheduled emails found');
      return;
    }

    console.log(`\n\n📊 Found ${allScheduled.length} scheduled emails`);

    const now = new Date();
    const firstEmail = allScheduled[0];
    const firstSendDate = new Date(firstEmail.send_at);
    const lastUpdated = new Date(firstEmail.updated_at);

    console.log('\n🔍 FIRST SCHEDULED EMAIL ANALYSIS:');
    console.log('='.repeat(80));
    console.log(`   To: ${firstEmail.to_email}`);
    console.log(`   Created: ${new Date(firstEmail.created_at).toLocaleString()}`);
    console.log(`   Last Updated: ${lastUpdated.toLocaleString()}`);
    console.log(`   Scheduled For: ${firstSendDate.toLocaleString()}`);
    console.log(`\n   Current Time: ${now.toLocaleString()}`);
    console.log(`   Time Until Send: ${Math.round((firstSendDate - now) / 1000 / 60)} minutes`);
    console.log(`   Days Until Send: ${Math.round((firstSendDate - now) / 1000 / 60 / 60 / 24 * 10) / 10} days`);

    // Check time gaps between emails
    console.log('\n\n⏱️  TIME GAPS BETWEEN FIRST 10 EMAILS:');
    console.log('='.repeat(80));

    for (let i = 0; i < Math.min(10, allScheduled.length); i++) {
      const email = allScheduled[i];
      const sendDate = new Date(email.send_at);

      let gap = '';
      if (i > 0) {
        const prevDate = new Date(allScheduled[i - 1].send_at);
        const gapMinutes = Math.round((sendDate - prevDate) / 1000 / 60);
        gap = ` (gap: ${gapMinutes} min)`;
      }

      console.log(`${i + 1}. ${sendDate.toLocaleString()}${gap}`);
    }

    // Check for clustering/gaps
    console.log('\n\n🔍 SCHEDULING PATTERN ANALYSIS:');
    console.log('='.repeat(80));

    // Group by date
    const emailsByDate = {};
    allScheduled.forEach(email => {
      const date = new Date(email.send_at).toDateString();
      emailsByDate[date] = (emailsByDate[date] || 0) + 1;
    });

    console.log('\nEmails per day:');
    Object.entries(emailsByDate)
      .sort()
      .slice(0, 10)
      .forEach(([date, count]) => {
        console.log(`   ${date}: ${count} emails`);
      });

    // Check if first email time matches campaign start expectations
    console.log('\n\n🚨 BUG ANALYSIS:');
    console.log('='.repeat(80));

    const hoursSinceUpdate = (now - lastUpdated) / 1000 / 60 / 60;
    const hoursUntilFirstEmail = (firstSendDate - now) / 1000 / 60 / 60;

    console.log(`\n1. Campaign was last updated: ${Math.round(hoursSinceUpdate * 10) / 10} hours ago`);
    console.log(`2. First email is scheduled: ${Math.round(hoursUntilFirstEmail * 10) / 10} hours from now`);

    if (hoursUntilFirstEmail > 24) {
      console.log(`\n❌ BUG DETECTED: First email is ${Math.round(hoursUntilFirstEmail / 24 * 10) / 10} DAYS in the future!`);
      console.log(`   This is NOT expected behavior when restarting a campaign.`);
      console.log(`\n   Expected behavior:`);
      console.log(`   - If restarted during business hours: Start within minutes`);
      console.log(`   - If restarted outside business hours: Start at next opening (max ~12 hours)`);
      console.log(`\n   Actual behavior:`);
      console.log(`   - Starting in ${Math.round(hoursUntilFirstEmail / 24)} days!`);
    }

    // Check the scheduling pattern
    const intervals = [];
    for (let i = 1; i < Math.min(20, allScheduled.length); i++) {
      const curr = new Date(allScheduled[i].send_at);
      const prev = new Date(allScheduled[i - 1].send_at);
      const gapMinutes = Math.round((curr - prev) / 1000 / 60);
      intervals.push(gapMinutes);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);

    console.log(`\n3. Interval Analysis (first 20 emails):`);
    console.log(`   Expected interval: ${config.sendingInterval} minutes`);
    console.log(`   Average interval: ${Math.round(avgInterval)} minutes`);
    console.log(`   Min interval: ${minInterval} minutes`);
    console.log(`   Max interval: ${maxInterval} minutes`);

    if (maxInterval > config.sendingInterval * 100) {
      console.log(`\n   ⚠️  WARNING: Found gap of ${maxInterval} minutes (${Math.round(maxInterval / 60)} hours)!`);
      console.log(`   This suggests scheduling is jumping across days/weeks.`);
    }

    // Recommendations
    console.log('\n\n💡 RECOMMENDED FIXES:');
    console.log('='.repeat(80));
    console.log(`
1. The campaign restart endpoint should:
   - Calculate next available sending window (today if in business hours)
   - NOT use existing send_at times from old schedule
   - Start from NOW + interval (or next business hours)

2. Current issue appears to be:
   - Restart is preserving/calculating from old schedule
   - Not resetting to current time
   - Accumulating delays from previous runs

3. Fix should:
   - When restarting, set first email to NOW (or next business hours)
   - Calculate all subsequent times from that first email
   - Respect business hours but don't push weeks into future
    `);

    console.log('\n✅ Diagnosis complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

diagnoseRestartBug();
