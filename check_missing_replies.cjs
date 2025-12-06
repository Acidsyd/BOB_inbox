require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const organizationId = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

  console.log('=== DIAGNOSTIC: Missing Replies Investigation ===\n');

  // Step 1: Find all messages with direction='received'
  console.log('Step 1: Querying all received messages...');
  const { data: receivedMessages, error: receivedError } = await supabase
    .from('conversation_messages')
    .select('id, conversation_id, subject, from_email, to_email, direction, received_at')
    .eq('organization_id', organizationId)
    .eq('direction', 'received')
    .order('received_at', { ascending: false });

  if (receivedError) {
    console.error('Error:', receivedError.message);
    process.exit(1);
  }

  console.log(`Found ${receivedMessages.length} received messages\n`);

  // Step 2: Get unique conversation IDs
  const conversationIds = [...new Set(receivedMessages.map(m => m.conversation_id))];
  console.log(`These belong to ${conversationIds.length} unique conversations\n`);

  // Step 3: Check which conversations are campaign type
  console.log('Step 2: Checking conversation types...');
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, subject, conversation_type, status, message_count, unread_count')
    .eq('organization_id', organizationId)
    .in('id', conversationIds);

  if (convError) {
    console.error('Error:', convError.message);
    process.exit(1);
  }

  const campaignConvs = conversations.filter(c => c.conversation_type === 'campaign');
  const organicConvs = conversations.filter(c => c.conversation_type !== 'campaign');

  console.log(`Campaign conversations: ${campaignConvs.length}`);
  console.log(`Organic conversations: ${organicConvs.length}`);
  console.log(`Archived: ${conversations.filter(c => c.status === 'archived').length}\n`);

  // Step 4: Show sample campaign conversations with replies
  console.log('Step 3: Sample campaign conversations that should appear in inbox:\n');
  campaignConvs.slice(0, 5).forEach((conv, idx) => {
    const repliesCount = receivedMessages.filter(m => m.conversation_id === conv.id).length;
    console.log(`${idx + 1}. ${conv.subject}`);
    console.log(`   ID: ${conv.id}`);
    console.log(`   Type: ${conv.conversation_type}`);
    console.log(`   Status: ${conv.status}`);
    console.log(`   Message Count: ${conv.message_count}`);
    console.log(`   Unread Count: ${conv.unread_count}`);
    console.log(`   Received Messages: ${repliesCount}\n`);
  });

  // Step 5: Check if inbox API would return these
  console.log('Step 4: Testing inbox filter logic...');
  const { data: inboxConvs, error: inboxError } = await supabase
    .from('conversations')
    .select('id, subject, conversation_type, status')
    .eq('organization_id', organizationId)
    .eq('conversation_type', 'campaign')
    .neq('status', 'archived')
    .in('id', conversationIds.slice(0, 100)); // Test first 100 to avoid .in() limit

  if (inboxError) {
    console.error('Error:', inboxError.message);
  } else {
    console.log(`Inbox query would return ${inboxConvs.length} conversations\n`);
  }

  // Step 6: Summary
  console.log('=== SUMMARY ===');
  console.log(`Total received messages: ${receivedMessages.length}`);
  console.log(`Conversations with received messages: ${conversationIds.length}`);
  console.log(`  - Campaign type: ${campaignConvs.length}`);
  console.log(`  - Organic type: ${organicConvs.length}`);
  console.log(`  - Archived: ${conversations.filter(c => c.status === 'archived').length}`);
  console.log(`\nExpected inbox count: ${campaignConvs.filter(c => c.status !== 'archived').length}`);

  process.exit(0);
})();
