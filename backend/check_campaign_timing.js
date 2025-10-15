const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkScheduledEmails() {
  const campaignId = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

  // Get all scheduled emails ordered by send_at
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('id, status, send_at, email_account_id, lead_id, created_at')
    .eq('campaign_id', campaignId)
    .order('send_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== SCHEDULED EMAILS OVERVIEW ===');
  console.log('Total scheduled emails:', emails.length);

  // Count by status
  const statusCounts = {};
  emails.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });
  console.log('\nStatus breakdown:', JSON.stringify(statusCounts, null, 2));

  // Count by account
  const accountCounts = {};
  emails.forEach(e => {
    accountCounts[e.email_account_id] = (accountCounts[e.email_account_id] || 0) + 1;
  });
  console.log('\n=== ACCOUNT DISTRIBUTION ===');
  Object.keys(accountCounts).forEach(accountId => {
    const shortId = accountId.substring(0, 8);
    console.log(`  ...${shortId}: ${accountCounts[accountId]} emails`);
  });

  // Analyze timing for first 30 emails
  console.log('\n=== TIMING ANALYSIS (First 30 emails) ===');
  const firstEmails = emails.slice(0, 30);
  const intervals = [];

  for (let i = 0; i < firstEmails.length; i++) {
    const email = firstEmails[i];
    const sendAt = new Date(email.send_at);

    let intervalInfo = '';
    if (i > 0) {
      const prevEmail = firstEmails[i - 1];
      const prevSendAt = new Date(prevEmail.send_at);
      const diffMs = sendAt - prevSendAt;
      const diffMin = Math.round(diffMs / 1000 / 60);
      intervals.push(diffMin);
      intervalInfo = ` (${diffMin} min from prev)`;
    }

    const accountShort = email.email_account_id.substring(0, 8);
    console.log(`[${String(i+1).padStart(2)}] ${email.status.padEnd(10)} | ${sendAt.toISOString().substring(11, 19)} | ...${accountShort}${intervalInfo}`);
  }

  // Calculate interval statistics
  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);

    console.log('\n=== INTERVAL STATISTICS ===');
    console.log(`Average interval: ${avgInterval.toFixed(2)} minutes`);
    console.log(`Min interval: ${minInterval} minutes`);
    console.log(`Max interval: ${maxInterval} minutes`);
    console.log(`Expected interval: 5 minutes (±1 min jitter)`);

    // Check for violations
    const violations = intervals.filter(i => i < 4); // Less than 4 minutes (5 - 1 jitter)
    if (violations.length > 0) {
      console.log(`\n⚠️  Found ${violations.length} potential violations (intervals < 4 min)`);
    } else {
      console.log('\n✅ All intervals respect the 5-minute rule with jitter');
    }
  }

  // Check account rotation quality
  console.log('\n=== ACCOUNT ROTATION QUALITY ===');
  const uniqueAccounts = new Set(emails.map(e => e.email_account_id)).size;
  const expectedAccounts = 8;
  console.log(`Unique accounts used: ${uniqueAccounts} / ${expectedAccounts}`);

  // Check if accounts are evenly distributed
  const totalEmails = emails.length;
  const idealPerAccount = totalEmails / uniqueAccounts;
  const counts = Object.values(accountCounts);
  const maxDeviation = Math.max(...counts.map(c => Math.abs(c - idealPerAccount)));
  const deviationPercent = (maxDeviation / idealPerAccount) * 100;

  console.log(`Ideal emails per account: ${idealPerAccount.toFixed(2)}`);
  console.log(`Max deviation: ${maxDeviation.toFixed(2)} emails (${deviationPercent.toFixed(1)}%)`);

  if (deviationPercent < 20) {
    console.log('✅ Account rotation is well balanced');
  } else {
    console.log('⚠️  Account rotation shows some imbalance');
  }
}

checkScheduledEmails().catch(console.error);
