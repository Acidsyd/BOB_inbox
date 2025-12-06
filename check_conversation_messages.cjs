require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const organizationId = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

  // Get one conversation with message_count = 2
  const { data: convs, error: convError } = await supabase
    .from('conversations')
    .select('id, subject, message_count, conversation_type')
    .eq('organization_id', organizationId)
    .eq('conversation_type', 'campaign')
    .eq('message_count', 2)
    .limit(1);

  if (convError || !convs || convs.length === 0) {
    console.log('No conversations found');
    process.exit(1);
  }

  const conv = convs[0];
  console.log('Conversation:', conv.subject);
  console.log('Message count:', conv.message_count);
  console.log('\nMessages in this conversation:');

  // Get all messages for this conversation
  const { data: messages, error: msgError } = await supabase
    .from('conversation_messages')
    .select('id, subject, from_email, to_email, direction, sent_at, received_at')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: true });

  if (msgError) {
    console.log('Error:', msgError.message);
  } else {
    messages.forEach((msg, idx) => {
      console.log(`\n${idx + 1}. Direction: ${msg.direction}`);
      console.log(`   From: ${msg.from_email}`);
      console.log(`   To: ${msg.to_email}`);
      console.log(`   Date: ${msg.sent_at || msg.received_at}`);
    });
  }

  process.exit(0);
})();
