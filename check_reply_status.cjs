const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkReplyStatus() {
  const email = 'emanuele.canetti@indico.srl';
  const campaignId = '958ea778-928e-41f2-99c0-053b65b5ee4b';

  console.log('=== CHECKING REPLY STATUS FOR:', email, '===\n');

  // 1. Check the lead status
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, email, status, updated_at')
    .eq('email', email);

  console.log('1. LEAD STATUS:');
  if (leads && leads.length > 0) {
    leads.forEach(lead => {
      console.log('   - Status:', lead.status, '| Updated:', lead.updated_at);
    });
  } else {
    console.log('   No lead found');
  }

  // 2. Check scheduled emails for this recipient
  const { data: scheduledEmails, error: seError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, sequence_step, send_at, subject')
    .eq('campaign_id', campaignId)
    .eq('to_email', email)
    .order('sequence_step', { ascending: true });

  console.log('\n2. SCHEDULED EMAILS:');
  if (scheduledEmails && scheduledEmails.length > 0) {
    scheduledEmails.forEach(se => {
      console.log('   - Step ' + se.sequence_step + ' | Status: ' + se.status + ' | Send at: ' + se.send_at);
    });
  } else {
    console.log('   No scheduled emails found');
  }

  // 3. Check conversations for replies
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, participants, last_message_at')
    .contains('participants', [email]);

  console.log('\n3. CONVERSATIONS:');
  if (conversations && conversations.length > 0) {
    for (const conv of conversations) {
      console.log('   Conversation ID:', conv.id);
      console.log('   Last message:', conv.last_message_at);

      // Check messages in this conversation
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('id, from_email, to_email, direction, subject, received_at, sent_at')
        .eq('conversation_id', conv.id)
        .order('received_at', { ascending: true });

      if (messages && messages.length > 0) {
        console.log('   Messages:');
        messages.forEach(msg => {
          const time = msg.received_at || msg.sent_at;
          console.log('     - ' + msg.direction + ' | From: ' + msg.from_email + ' | ' + time);
        });
      }
    }
  } else {
    console.log('   No conversations found');
  }

  // 4. Check campaign config for stopOnReply
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', campaignId)
    .single();

  console.log('\n4. CAMPAIGN CONFIG:');
  console.log('   stopOnReply:', campaign?.config?.stopOnReply);

  // 5. Summary
  console.log('\n=== SUMMARY ===');
  const hasReply = conversations && conversations.length > 0;
  const followUpScheduled = scheduledEmails?.find(se => se.sequence_step > 0 && se.status === 'scheduled');
  const stopOnReply = campaign?.config?.stopOnReply;

  if (hasReply && followUpScheduled && stopOnReply) {
    console.log('⚠️  WARNING: Reply detected but follow-up is still SCHEDULED!');
    console.log('   The follow-up SHOULD be skipped when the cron runs.');
    console.log('   CronEmailProcessor checks for replies before sending.');
  } else if (hasReply && followUpScheduled && !stopOnReply) {
    console.log('⚠️  stopOnReply is DISABLED - follow-up will be sent even though there was a reply');
  } else if (!hasReply) {
    console.log('❌  No reply detected in conversations');
  } else {
    console.log('✅  Follow-up has already been handled');
  }
}

checkReplyStatus().catch(console.error);
