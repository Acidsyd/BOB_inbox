const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseThreading() {
  console.log('🔍 Diagnosing email threading for "AI per documenti" emails...\n');

  // Find all emails with this subject (both initial and follow-ups)
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .or('subject.ilike.%AI per documenti%,subject.ilike.%Re: AI per documenti%')
    .eq('to_email', 'stefano.sardara@acrisureitalia.com')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching emails:', error);
    return;
  }

  if (!emails || emails.length === 0) {
    console.log('❌ No emails found matching this subject');
    return;
  }

  console.log(`✅ Found ${emails.length} email(s):\n`);

  for (const email of emails) {
    console.log('─'.repeat(80));
    console.log(`📧 Email ID: ${email.id}`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   To: ${email.to_email}`);
    console.log(`   Status: ${email.status}`);
    console.log(`   Sequence Step: ${email.sequence_step || 0}`);
    console.log(`   Is Follow-up: ${email.is_follow_up ? '✅ YES' : '❌ NO'}`);
    console.log(`   Reply to Same Thread: ${email.reply_to_same_thread ? '✅ YES' : '❌ NO'}`);
    console.log(`   Parent Email ID: ${email.parent_email_id || 'N/A'}`);
    console.log(`   Message-ID Header: ${email.message_id_header || '❌ NULL'}`);
    console.log(`   Thread ID: ${email.thread_id || 'N/A'}`);
    console.log(`   Send At: ${email.send_at}`);
    console.log(`   Sent At: ${email.sent_at || 'Not sent yet'}`);
    console.log();
  }

  // Check for parent-child relationships
  console.log('\n📊 Threading Analysis:\n');

  const initial = emails.find(e => !e.is_follow_up || e.sequence_step === 0);
  const followUps = emails.filter(e => e.is_follow_up && e.sequence_step > 0);

  if (initial) {
    console.log(`✅ Initial Email (sequence_step=0):`);
    console.log(`   ID: ${initial.id}`);
    console.log(`   Message-ID: ${initial.message_id_header || '❌ NULL'}`);
    console.log(`   Thread ID: ${initial.thread_id || 'N/A'}`);
    console.log(`   Status: ${initial.status}`);
    console.log();
  } else {
    console.log('❌ No initial email found\n');
  }

  if (followUps.length > 0) {
    console.log(`✅ Follow-up Email(s): ${followUps.length}\n`);
    for (const followUp of followUps) {
      console.log(`   Follow-up ${followUp.sequence_step}:`);
      console.log(`      ID: ${followUp.id}`);
      console.log(`      Parent Email ID: ${followUp.parent_email_id}`);
      console.log(`      Reply to Same Thread: ${followUp.reply_to_same_thread ? '✅ YES' : '❌ NO'}`);
      console.log(`      Message-ID Header: ${followUp.message_id_header || '❌ NULL (PROBLEM!)'}`);
      console.log(`      Thread ID: ${followUp.thread_id || 'N/A'}`);
      console.log(`      Status: ${followUp.status}`);

      // Check if parent exists and has Message-ID
      if (followUp.parent_email_id) {
        const parent = emails.find(e => e.id === followUp.parent_email_id);
        if (parent) {
          console.log(`      Parent's Message-ID: ${parent.message_id_header || '❌ NULL (MISSING!)'}`);
          if (!followUp.message_id_header && parent.message_id_header) {
            console.log(`      ⚠️  ISSUE: Follow-up missing message_id_header, but parent HAS one!`);
            console.log(`      🔧 FIX: Should copy parent's message_id_header: ${parent.message_id_header}`);
          }
        } else {
          console.log(`      ❌ Parent email not found in results`);
        }
      }
      console.log();
    }
  } else {
    console.log('❌ No follow-up emails found\n');
  }

  // Check conversation_messages for threading
  console.log('\n📬 Checking Unified Inbox (conversation_messages):\n');

  const { data: messages, error: msgError } = await supabase
    .from('conversation_messages')
    .select('id, subject, direction, message_id_header, in_reply_to, message_references, conversation_id, sent_at, received_at')
    .or('subject.ilike.%AI per documenti%,subject.ilike.%Re: AI per documenti%')
    .eq('to_email', 'stefano.sardara@acrisureitalia.com')
    .order('sent_at', { ascending: true, nullsLast: true })
    .order('received_at', { ascending: true, nullsLast: true });

  if (msgError) {
    console.error('❌ Error fetching conversation messages:', msgError);
  } else if (messages && messages.length > 0) {
    console.log(`✅ Found ${messages.length} message(s) in unified inbox:\n`);

    for (const msg of messages) {
      console.log(`📬 Message ID: ${msg.id.substring(0, 8)}...`);
      console.log(`   Subject: ${msg.subject}`);
      console.log(`   Direction: ${msg.direction}`);
      console.log(`   Conversation ID: ${msg.conversation_id}`);
      console.log(`   Message-ID Header: ${msg.message_id_header || 'N/A'}`);
      console.log(`   In-Reply-To: ${msg.in_reply_to || 'N/A'}`);
      console.log(`   References: ${msg.message_references || 'N/A'}`);
      console.log(`   Timestamp: ${msg.sent_at || msg.received_at}`);
      console.log();
    }

    // Check if they're in the same conversation
    const conversationIds = [...new Set(messages.map(m => m.conversation_id))];
    console.log(`📊 Conversation Count: ${conversationIds.length}`);
    if (conversationIds.length > 1) {
      console.log(`⚠️  ISSUE: Messages are in ${conversationIds.length} different conversations!`);
      console.log(`   They should be in the SAME conversation for proper threading.`);
    } else {
      console.log(`✅ All messages are in the same conversation`);
    }
  } else {
    console.log('❌ No messages found in unified inbox\n');
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔍 DIAGNOSIS COMPLETE\n');
}

diagnoseThreading().catch(console.error);
