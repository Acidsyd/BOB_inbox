const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkInboxSync() {
  const email = 'emanuele.canetti@indico.srl';

  console.log('=== CHECKING INBOX SYNC STATUS ===\n');

  // Check all conversation messages from this email
  const { data: allMessages, error: msgError } = await supabase
    .from('conversation_messages')
    .select('id, from_email, to_email, subject, direction, received_at, created_at')
    .or('from_email.eq.' + email + ',to_email.cs.{' + email + '}')
    .order('received_at', { ascending: false })
    .limit(10);

  console.log('1. ALL MESSAGES involving', email + ':');
  if (allMessages && allMessages.length > 0) {
    allMessages.forEach(msg => {
      console.log('   - ' + msg.direction + ' | From: ' + msg.from_email + ' | Subject: ' + (msg.subject || '(no subject)').substring(0, 50));
      console.log('     Received: ' + msg.received_at + ' | Created: ' + msg.created_at);
    });
  } else {
    console.log('   No messages found');
  }

  // Check OAuth2 accounts and their last sync
  const { data: oauthAccounts, error: oauthError } = await supabase
    .from('oauth2_tokens')
    .select('id, email, last_sync_at, status')
    .eq('status', 'linked_to_account');

  console.log('\n2. OAUTH2 ACCOUNTS (last sync times):');
  if (oauthAccounts && oauthAccounts.length > 0) {
    oauthAccounts.forEach(acc => {
      const lastSync = acc.last_sync_at ? new Date(acc.last_sync_at).toISOString() : 'Never';
      console.log('   - ' + acc.email + ' | Last sync: ' + lastSync);
    });
  } else {
    console.log('   No OAuth2 accounts found');
  }

  // Check if there are any recent synced messages
  const { data: recentMessages, error: recentError } = await supabase
    .from('conversation_messages')
    .select('id, from_email, subject, direction, received_at')
    .eq('direction', 'received')
    .order('received_at', { ascending: false })
    .limit(5);

  console.log('\n3. MOST RECENT RECEIVED MESSAGES (across all):');
  if (recentMessages && recentMessages.length > 0) {
    recentMessages.forEach(msg => {
      console.log('   - From: ' + msg.from_email + ' | ' + msg.received_at);
      console.log('     Subject: ' + (msg.subject || '(no subject)').substring(0, 60));
    });
  } else {
    console.log('   No received messages found');
  }

  console.log('\n=== RECOMMENDATION ===');
  console.log('If you received a reply from emanuele.canetti@indico.srl:');
  console.log('1. Go to the Inbox page and click "Sync" button');
  console.log('2. Or wait for the next background sync (every 15 minutes)');
  console.log('3. Once synced, the follow-up will be automatically skipped');
}

checkInboxSync().catch(console.error);
