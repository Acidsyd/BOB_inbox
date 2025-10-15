const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyInboxCount() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

  console.log('\n=== Verifying Sent Emails from Inbox/Conversations ===\n');

  // Get campaign details
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, organization_id, config')
    .eq('id', campaignId)
    .single();

  console.log('Campaign:', campaign.name);
  console.log('Organization ID:', campaign.organization_id);

  // Method 1: Count from scheduled_emails table
  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'sent');

  console.log('\n[Method 1] scheduled_emails table:');
  console.log('  Sent emails:', scheduledCount);

  // Method 2: Get all sent emails with message_ids
  const { data: sentEmails } = await supabase
    .from('scheduled_emails')
    .select('id, message_id, sent_at, sequence_step')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: true });

  console.log('\n[Method 2] scheduled_emails with message_ids:');
  console.log('  Total sent:', sentEmails.length);
  console.log('  With message_id:', sentEmails.filter(e => e.message_id).length);
  console.log('  Without message_id:', sentEmails.filter(e => !e.message_id).length);

  // Method 3: Query conversation_messages for campaign-related messages
  const messageIds = sentEmails.map(e => e.message_id).filter(Boolean);

  if (messageIds.length > 0) {
    const { data: conversationMessages, count: conversationCount } = await supabase
      .from('conversation_messages')
      .select('id, message_id_header, subject, sent_at, direction', { count: 'exact' })
      .in('message_id_header', messageIds)
      .eq('direction', 'sent');

    console.log('\n[Method 3] conversation_messages table:');
    console.log('  Matching sent messages:', conversationCount);
    console.log('  Found in conversations:', conversationMessages?.length || 0);
  }

  // Method 4: Query conversations by organization and check for campaign emails
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      subject,
      conversation_type,
      created_at,
      conversation_messages (
        id,
        message_id_header,
        direction,
        sent_at
      )
    `)
    .eq('organization_id', campaign.organization_id)
    .eq('conversation_type', 'campaign')
    .order('created_at', { ascending: false })
    .limit(100);

  console.log('\n[Method 4] conversations table:');
  console.log('  Total campaign conversations:', conversations?.length || 0);

  // Filter conversations that match our campaign's sent emails
  let matchingConversations = 0;
  let matchingSentMessages = 0;

  if (conversations && messageIds.length > 0) {
    conversations.forEach(conv => {
      const sentMessages = conv.conversation_messages?.filter(m =>
        m.direction === 'sent' && messageIds.includes(m.message_id_header)
      );

      if (sentMessages && sentMessages.length > 0) {
        matchingConversations++;
        matchingSentMessages += sentMessages.length;
      }
    });

    console.log('  Conversations with campaign emails:', matchingConversations);
    console.log('  Sent messages from campaign:', matchingSentMessages);
  }

  // Show sample of sent emails
  console.log('\n=== Sample Sent Emails (first 5) ===');
  sentEmails.slice(0, 5).forEach((email, i) => {
    console.log(`${i+1}. Sent at: ${email.sent_at}`);
    console.log(`   Message ID: ${email.message_id || 'MISSING'}`);
    console.log(`   Sequence step: ${email.sequence_step}`);
  });

  // Summary
  console.log('\n=== Summary ===');
  console.log('✓ scheduled_emails table (sent status):', scheduledCount);
  console.log('✓ Emails with message_id:', messageIds.length);
  console.log('✓ Found in conversation_messages:', conversationCount || 0);
  console.log('✓ Found in conversations:', matchingSentMessages);

  if (scheduledCount !== messageIds.length) {
    console.log('\n⚠️  WARNING: Some sent emails are missing message_id!');
    console.log(`   ${scheduledCount - messageIds.length} emails sent but not tracked in conversations`);
  }
}

verifyInboxCount().catch(console.error);
