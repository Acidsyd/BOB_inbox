const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testStopOnReplyFix() {
  const campaignId = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';

  console.log('\n=== TESTING STOPONREPLY FIX ===\n');

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, organization_id, config')
    .eq('id', campaignId)
    .single();

  console.log(`Campaign: ${campaign.name}`);
  console.log(`stopOnReply enabled: ${campaign.config.stopOnReply}\n`);

  const organizationId = campaign.organization_id;

  // Get recipients who have replied
  const { data: repliers } = await supabase
    .from('conversation_messages')
    .select('from_email, received_at, subject')
    .eq('organization_id', organizationId)
    .eq('direction', 'received')
    .order('received_at', { ascending: false });

  if (!repliers || repliers.length === 0) {
    console.log('❌ No replies found in conversation_messages');
    return;
  }

  // Get unique replier emails
  const replierEmails = [...new Set(repliers.map(r => r.from_email))];

  console.log(`Found ${replierEmails.length} unique recipients who have sent emails:\n`);

  // For each replier, check if they have scheduled emails in WISE 4
  for (const email of replierEmails.slice(0, 10)) { // Check first 10
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Recipient: ${email}\n`);

    // Find when they replied
    const theirReplies = repliers.filter(r => r.from_email === email);
    console.log(`Total emails received from them: ${theirReplies.length}`);
    console.log(`Latest reply: ${theirReplies[0].received_at}`);
    console.log(`Latest subject: ${theirReplies[0].subject}\n`);

    // Check if they have ANY emails in WISE 4 (scheduled or sent)
    const { data: theirEmails } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, is_follow_up, sent_at')
      .eq('campaign_id', campaignId)
      .eq('to_email', email)
      .order('send_at', { ascending: true });

    if (!theirEmails || theirEmails.length === 0) {
      console.log('No emails found in WISE 4 for this recipient');
      continue;
    }

    console.log(`Emails in WISE 4: ${theirEmails.length}`);

    const sent = theirEmails.filter(e => e.status === 'sent');
    const scheduled = theirEmails.filter(e => e.status === 'scheduled');
    const skipped = theirEmails.filter(e => e.status === 'skipped');

    console.log(`  - Sent: ${sent.length}`);
    console.log(`  - Scheduled: ${scheduled.length}`);
    console.log(`  - Skipped: ${skipped.length}\n`);

    if (scheduled.length > 0) {
      console.log(`⚠️ ${scheduled.length} SCHEDULED EMAIL(S) WILL BE SKIPPED BY FIX:\n`);
      scheduled.forEach((se, idx) => {
        console.log(`  ${idx + 1}. ${se.is_follow_up ? 'Follow-up' : 'Initial'} scheduled for ${se.send_at}`);
        console.log(`     Status: ${se.status}`);
        console.log(`     ID: ${se.id}`);
      });
      console.log('');
    }

    // Simulate the new shouldStopOnReply logic
    const { data: receivedCheck } = await supabase
      .from('conversation_messages')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('direction', 'received')
      .eq('from_email', email)
      .limit(1);

    const wouldStop = receivedCheck && receivedCheck.length > 0;
    console.log(`✅ NEW shouldStopOnReply would return: ${wouldStop ? 'TRUE (STOP SENDING)' : 'FALSE (CONTINUE)'}\n`);
  }

  // Summary
  console.log('\n=== SUMMARY ===\n');

  // Count all scheduled emails for WISE 4 recipients who have replied
  let totalScheduledForRepliers = 0;

  for (const email of replierEmails) {
    const { count } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('to_email', email)
      .eq('status', 'scheduled');

    totalScheduledForRepliers += (count || 0);
  }

  console.log(`Total recipients who sent emails: ${replierEmails.length}`);
  console.log(`Total scheduled emails for these recipients: ${totalScheduledForRepliers}`);
  console.log(`\n✅ After fix deployment, these ${totalScheduledForRepliers} emails will be automatically skipped`);
  console.log('   when the cron processor runs next.\n');

  console.log('=== TEST COMPLETE ===\n');
}

testStopOnReplyFix()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
