require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check conversation "1a0cfd8a-1b2e-4a83-b686-24e8835025b1" which shows message_count=2
  const convId = '1a0cfd8a-1b2e-4a83-b686-24e8835025b1';

  console.log(`Checking conversation: ${convId}\n`);

  // Get conversation details
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('subject, message_count, unread_count, conversation_type')
    .eq('id', convId)
    .single();

  if (convError) {
    console.error('Error:', convError.message);
    process.exit(1);
  }

  console.log('Conversation details:');
  console.log('  Subject:', conv.subject);
  console.log('  Type:', conv.conversation_type);
  console.log('  Message count:', conv.message_count);
  console.log('  Unread count:', conv.unread_count);
  console.log('');

  // Get all messages
  const { data: messages, error: msgError } = await supabase
    .from('conversation_messages')
    .select('id, subject, direction, from_email, to_email, sent_at, received_at')
    .eq('conversation_id', convId)
    .order('sent_at', { ascending: true });

  if (msgError) {
    console.error('Error:', msgError.message);
    process.exit(1);
  }

  console.log(`Found ${messages.length} messages:\n`);

  messages.forEach((msg, idx) => {
    console.log(`${idx + 1}. Direction: ${msg.direction}`);
    console.log(`   From: ${msg.from_email}`);
    console.log(`   To: ${msg.to_email}`);
    console.log(`   Sent: ${msg.sent_at || 'N/A'}`);
    console.log(`   Received: ${msg.received_at || 'N/A'}`);
    console.log('');
  });

  // Summary
  const sentCount = messages.filter(m => m.direction === 'sent').length;
  const receivedCount = messages.filter(m => m.direction === 'received').length;

  console.log('Summary:');
  console.log(`  Total messages: ${messages.length}`);
  console.log(`  Sent messages: ${sentCount}`);
  console.log(`  Received messages: ${receivedCount}`);

  if (receivedCount > 0) {
    console.log('\n✅ This conversation HAS actual replies - it SHOULD appear in inbox');
  } else {
    console.log('\n❌ This conversation has NO replies - it should NOT appear in inbox');
  }

  process.exit(0);
})();
