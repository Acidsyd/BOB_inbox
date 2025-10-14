const { createClient } = require('@supabase/supabase-js');
const { fetchAllWithPagination } = require('./src/utils/supabaseHelpers');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

async function verifyFinalState() {
  console.log('='.repeat(80));
  console.log('FINAL CAMPAIGN STATE VERIFICATION');
  console.log('='.repeat(80));
  console.log(`Campaign ID: ${CAMPAIGN_ID}\n`);

  // Get campaign info
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, config')
    .eq('id', CAMPAIGN_ID)
    .single();

  console.log('📊 Campaign Info:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Lead List ID: ${campaign.config.leadListId}\n`);

  // Get total leads
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', campaign.config.leadListId);

  console.log(`👥 Total leads in list: ${totalLeads}\n`);

  // Count emails by status using count queries (no pagination needed)
  console.log('📧 Email Status Counts:');

  const { count: totalEmails } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID);

  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled');

  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'sent');

  const { count: initialCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', false);

  const { count: followupCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', true);

  console.log(`   Total emails: ${totalEmails}`);
  console.log(`   - Scheduled: ${scheduledCount}`);
  console.log(`   - Sent: ${sentCount}`);
  console.log(`   - Initial: ${initialCount}`);
  console.log(`   - Follow-ups: ${followupCount}\n`);

  // Calculate expected
  const hasFollowUps = campaign.config.emailSequence && campaign.config.emailSequence.length > 0;
  const followUpCount = hasFollowUps ? campaign.config.emailSequence.length : 0;
  const expectedTotal = totalLeads * (1 + followUpCount);

  console.log('✅ Expected vs Actual:');
  console.log(`   Expected emails: ${totalLeads} × ${1 + followUpCount} = ${expectedTotal}`);
  console.log(`   Actual emails: ${totalEmails}`);
  console.log(`   Status: ${totalEmails === expectedTotal ? '✅ COMPLETE' : `⚠️  Missing ${expectedTotal - totalEmails}`}\n`);

  // Verify rotation (first 50 scheduled emails)
  const { data: scheduledEmails } = await supabase
    .from('scheduled_emails')
    .select('send_at, email_account_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(50);

  console.log('🔄 Rotation Quality (first 50 scheduled emails):');
  const accountSequence = scheduledEmails.map(e => e.email_account_id.substring(0, 8));
  const uniqueAccounts = new Set(accountSequence.slice(0, 24)).size;

  let maxConsecutive = 1;
  let consecutiveCount = 1;
  for (let i = 1; i < accountSequence.length; i++) {
    if (accountSequence[i] === accountSequence[i - 1]) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    } else {
      consecutiveCount = 1;
    }
  }

  console.log(`   Unique accounts (first 24): ${uniqueAccounts}/${campaign.config.emailAccounts.length}`);
  console.log(`   Max consecutive from same account: ${maxConsecutive}`);
  console.log(`   Status: ${maxConsecutive === 1 ? '✅ PERFECT ROTATION' : '⚠️  Some consecutive duplicates'}\n`);

  // Show timing distribution
  console.log('⏰ Scheduling Timeline:');
  const { data: firstEmail } = await supabase
    .from('scheduled_emails')
    .select('send_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(1)
    .single();

  const { data: lastEmail } = await supabase
    .from('scheduled_emails')
    .select('send_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: false })
    .limit(1)
    .single();

  if (firstEmail && lastEmail) {
    console.log(`   First scheduled: ${firstEmail.send_at}`);
    console.log(`   Last scheduled: ${lastEmail.send_at}`);

    const daysDiff = Math.ceil((new Date(lastEmail.send_at) - new Date(firstEmail.send_at)) / (1000 * 60 * 60 * 24));
    console.log(`   Campaign duration: ${daysDiff} days\n`);
  }

  console.log('='.repeat(80));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(80));
}

verifyFinalState().catch(console.error);
