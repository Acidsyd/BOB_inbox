const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function deepCampaignAnalysis() {
  const campaignId = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

  console.log('='.repeat(80));
  console.log('DEEP CAMPAIGN ANALYSIS');
  console.log('='.repeat(80));

  // Get all emails for the campaign
  const { data: allEmails, error } = await supabase
    .from('scheduled_emails')
    .select('id, status, send_at, sent_at, email_account_id, to_email, created_at, updated_at')
    .eq('campaign_id', campaignId)
    .order('send_at', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`\n📊 TOTAL EMAILS: ${allEmails.length}`);

  // Split by status
  const sentEmails = allEmails.filter(e => e.status === 'sent');
  const scheduledEmails = allEmails.filter(e => e.status === 'scheduled');

  console.log(`   - Sent: ${sentEmails.length}`);
  console.log(`   - Scheduled: ${scheduledEmails.length}`);

  // ============================================================================
  // PART 1: SENT EMAILS ANALYSIS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('PART 1: SENT EMAILS ANALYSIS (What Actually Happened)');
  console.log('='.repeat(80));

  if (sentEmails.length > 0) {
    // Account distribution in sent emails
    const sentByAccount = {};
    sentEmails.forEach(e => {
      sentByAccount[e.email_account_id] = (sentByAccount[e.email_account_id] || 0) + 1;
    });

    console.log('\n📊 Sent Emails by Account:');
    Object.entries(sentByAccount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([accountId, count]) => {
        const percentage = ((count / sentEmails.length) * 100).toFixed(1);
        console.log(`   ...${accountId.substring(0, 8)}: ${count} emails (${percentage}%)`);
      });

    // Analyze actual sending intervals (using sent_at)
    console.log('\n⏱️  Actual Sending Intervals (last 30 sent):');
    const recentSent = sentEmails.slice(-30);
    for (let i = 1; i < recentSent.length; i++) {
      const curr = new Date(recentSent[i].sent_at);
      const prev = new Date(recentSent[i - 1].sent_at);
      const diffMin = Math.round((curr - prev) / 60000);
      const currAccount = recentSent[i].email_account_id.substring(0, 8);
      const prevAccount = recentSent[i - 1].email_account_id.substring(0, 8);
      const sameAccount = currAccount === prevAccount ? '(SAME)' : '';

      console.log(`   [${i}] ${diffMin} min | ...${currAccount} ${sameAccount} | Sent: ${curr.toISOString().substring(11, 19)}`);
    }
  }

  // ============================================================================
  // PART 2: SCHEDULED EMAILS ANALYSIS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('PART 2: SCHEDULED EMAILS ANALYSIS (What\'s Planned)');
  console.log('='.repeat(80));

  if (scheduledEmails.length > 0) {
    // Account distribution in scheduled emails
    const scheduledByAccount = {};
    scheduledEmails.forEach(e => {
      scheduledByAccount[e.email_account_id] = (scheduledByAccount[e.email_account_id] || 0) + 1;
    });

    console.log('\n📊 Scheduled Emails by Account:');
    Object.entries(scheduledByAccount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([accountId, count]) => {
        const percentage = ((count / scheduledEmails.length) * 100).toFixed(1);
        console.log(`   ...${accountId.substring(0, 8)}: ${count} emails (${percentage}%)`);
      });

    // Check for duplicate send_at times (CRITICAL ISSUE)
    console.log('\n🚨 CHECKING FOR DUPLICATE SEND_AT TIMES:');
    const sendTimeMap = {};
    scheduledEmails.forEach(e => {
      const sendTime = e.send_at;
      if (!sendTimeMap[sendTime]) {
        sendTimeMap[sendTime] = [];
      }
      sendTimeMap[sendTime].push(e);
    });

    const duplicateTimes = Object.entries(sendTimeMap).filter(([time, emails]) => emails.length > 1);

    if (duplicateTimes.length > 0) {
      console.log(`   ⚠️  Found ${duplicateTimes.length} time slots with multiple emails scheduled!`);
      console.log('\n   First 10 duplicate time slots:');
      duplicateTimes.slice(0, 10).forEach(([time, emails]) => {
        console.log(`\n   Time: ${time}`);
        emails.forEach(e => {
          console.log(`      - ...${e.email_account_id.substring(0, 8)} | ${e.to_email}`);
        });
      });

      // Count total emails affected
      const totalAffected = duplicateTimes.reduce((sum, [_, emails]) => sum + emails.length, 0);
      console.log(`\n   📊 Total emails with duplicate times: ${totalAffected} (${((totalAffected / scheduledEmails.length) * 100).toFixed(1)}%)`);
    } else {
      console.log('   ✅ No duplicate send_at times found');
    }

    // Analyze scheduled intervals (first 50)
    console.log('\n⏱️  Scheduled Intervals (next 50 emails):');
    const nextScheduled = scheduledEmails.slice(0, 50);
    for (let i = 1; i < nextScheduled.length; i++) {
      const curr = new Date(nextScheduled[i].send_at);
      const prev = new Date(nextScheduled[i - 1].send_at);
      const diffMin = Math.round((curr - prev) / 60000);
      const currAccount = nextScheduled[i].email_account_id.substring(0, 8);
      const prevAccount = nextScheduled[i - 1].email_account_id.substring(0, 8);
      const sameAccount = currAccount === prevAccount ? '(SAME)' : '';

      if (diffMin === 0) {
        console.log(`   [${i}] 🚨 0 min | ...${currAccount} ${sameAccount} | ${curr.toISOString().substring(11, 19)} | DUPLICATE TIME!`);
      } else {
        console.log(`   [${i}] ${diffMin} min | ...${currAccount} ${sameAccount} | ${curr.toISOString().substring(11, 19)}`);
      }
    }
  }

  // ============================================================================
  // PART 3: RECENT SCHEDULING ACTIVITY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('PART 3: RECENT SCHEDULING ACTIVITY (Last Updates)');
  console.log('='.repeat(80));

  // Get recently updated scheduled emails
  const recentlyUpdated = scheduledEmails
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 20);

  console.log('\n📝 Last 20 Scheduled Email Updates:');
  recentlyUpdated.forEach((e, i) => {
    const sendAt = new Date(e.send_at);
    const updatedAt = new Date(e.updated_at);
    const timeDiff = Math.round((sendAt - updatedAt) / 60000);

    console.log(`   [${i + 1}] Updated: ${updatedAt.toISOString().substring(11, 19)} | Send: ${sendAt.toISOString().substring(11, 19)} | Diff: ${timeDiff}min | Account: ...${e.email_account_id.substring(0, 8)}`);
  });

  // ============================================================================
  // PART 4: INTERVAL COMPLIANCE CHECK
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('PART 4: INTERVAL COMPLIANCE CHECK');
  console.log('='.repeat(80));

  // Check if scheduled intervals match expected (5 minutes)
  const expectedInterval = 5;
  const scheduledIntervals = [];

  for (let i = 1; i < Math.min(100, scheduledEmails.length); i++) {
    const curr = new Date(scheduledEmails[i].send_at);
    const prev = new Date(scheduledEmails[i - 1].send_at);
    const diffMin = Math.round((curr - prev) / 60000);
    scheduledIntervals.push(diffMin);
  }

  if (scheduledIntervals.length > 0) {
    const avgInterval = scheduledIntervals.reduce((a, b) => a + b, 0) / scheduledIntervals.length;
    const minInterval = Math.min(...scheduledIntervals);
    const maxInterval = Math.max(...scheduledIntervals);
    const zeroIntervals = scheduledIntervals.filter(i => i === 0).length;

    console.log(`\n📊 Scheduled Interval Statistics (first 100 emails):`);
    console.log(`   Average: ${avgInterval.toFixed(2)} minutes`);
    console.log(`   Min: ${minInterval} minutes`);
    console.log(`   Max: ${maxInterval} minutes`);
    console.log(`   Expected: ${expectedInterval} minutes`);
    console.log(`   Zero intervals (duplicates): ${zeroIntervals}`);

    if (zeroIntervals > 0) {
      console.log(`\n   🚨 WARNING: ${zeroIntervals} emails scheduled at the exact same time!`);
    }

    if (avgInterval > expectedInterval * 2) {
      console.log(`\n   ⚠️  Average interval is ${(avgInterval / expectedInterval).toFixed(1)}x longer than expected`);
    }
  }

  // ============================================================================
  // PART 5: ACCOUNT ROTATION ANALYSIS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('PART 5: ACCOUNT ROTATION ANALYSIS');
  console.log('='.repeat(80));

  // Check rotation pattern in scheduled emails
  console.log('\n🔄 Rotation Pattern (next 24 emails):');
  const next24 = scheduledEmails.slice(0, 24);
  const accountSequence = next24.map(e => e.email_account_id.substring(0, 8));
  const uniqueInSequence = new Set(accountSequence).size;

  accountSequence.forEach((acc, i) => {
    const prevAcc = i > 0 ? accountSequence[i - 1] : null;
    const repeat = prevAcc === acc ? '🔁' : '';
    console.log(`   [${String(i + 1).padStart(2)}] ...${acc} ${repeat}`);
  });

  console.log(`\n   📊 Unique accounts in next 24: ${uniqueInSequence}/8`);

  // Check for account clustering (same account appearing multiple times in a row)
  let maxClusterSize = 1;
  let currentCluster = 1;
  for (let i = 1; i < accountSequence.length; i++) {
    if (accountSequence[i] === accountSequence[i - 1]) {
      currentCluster++;
      maxClusterSize = Math.max(maxClusterSize, currentCluster);
    } else {
      currentCluster = 1;
    }
  }

  if (maxClusterSize > 1) {
    console.log(`   ⚠️  Found account clustering: max ${maxClusterSize} consecutive emails from same account`);
  }

  // ============================================================================
  // SUMMARY & RECOMMENDATIONS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY & ISSUES FOUND');
  console.log('='.repeat(80));

  const issues = [];

  if (duplicateTimes.length > 0) {
    issues.push(`🚨 CRITICAL: ${duplicateTimes.length} time slots have multiple emails scheduled simultaneously`);
  }

  if (zeroIntervals > 0) {
    issues.push(`⚠️  ${zeroIntervals} scheduled emails have 0-minute intervals`);
  }

  if (avgInterval && avgInterval > expectedInterval * 1.5) {
    issues.push(`⚠️  Average scheduled interval (${avgInterval.toFixed(1)}min) is much higher than configured (${expectedInterval}min)`);
  }

  if (maxClusterSize > 1) {
    issues.push(`⚠️  Account rotation has clusters of ${maxClusterSize} consecutive emails from same account`);
  }

  // Check account distribution imbalance
  const scheduledCounts = Object.values(scheduledByAccount);
  const avgPerAccount = scheduledCounts.reduce((a, b) => a + b, 0) / scheduledCounts.length;
  const maxDeviation = Math.max(...scheduledCounts.map(c => Math.abs(c - avgPerAccount)));
  const deviationPercent = (maxDeviation / avgPerAccount) * 100;

  if (deviationPercent > 20) {
    issues.push(`⚠️  Scheduled emails show ${deviationPercent.toFixed(1)}% imbalance across accounts`);
  }

  if (issues.length === 0) {
    console.log('\n✅ No major issues found!');
  } else {
    console.log('\n🚨 Issues Found:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

deepCampaignAnalysis().catch(console.error);
