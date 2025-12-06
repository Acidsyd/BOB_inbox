require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const ImapService = require('./backend/src/services/ImapService');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  console.log('Testing IMAP sync for Ionos accounts...\n');

  // Get one Ionos account
  const { data: account, error } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('email', 'gianpiero@gkt-group.it')
    .eq('enable_receiving', true)
    .single();

  if (error || !account) {
    console.log('Error finding account:', error?.message || 'Account not found');
    process.exit(1);
  }

  console.log('Testing account:', account.email);
  console.log('Provider:', account.provider);
  console.log('IMAP Config:', account.imap_config);
  console.log('Last synced:', account.last_sync_at);
  console.log('\nAttempting IMAP connection and sync...\n');

  const imapService = new ImapService();

  try {
    const result = await imapService.syncEmailsForAccount(account.id, account.organization_id);

    console.log('\n✅ Sync completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n❌ Sync failed:');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }

  process.exit(0);
})();
