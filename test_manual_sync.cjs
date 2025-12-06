require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const EmailSyncService = require('./backend/src/services/EmailSyncService');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  console.log('Testing IMAP sync for difelice.gianpiero@gkt-group.it...\n');

  // Get the account
  const { data: account, error } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('email', 'difelice.gianpiero@gkt-group.it')
    .single();

  if (error || !account) {
    console.log('Error finding account:', error?.message || 'Account not found');
    process.exit(1);
  }

  console.log('Account found:');
  console.log('  ID:', account.id);
  console.log('  Email:', account.email);
  console.log('  Provider:', account.provider);
  console.log('  Enable receiving:', account.enable_receiving);
  console.log('  IMAP Config:', account.imap_config);
  console.log('  Last synced:', account.last_sync_at);
  console.log('\nTriggering sync via EmailSyncService...\n');

  const emailSyncService = new EmailSyncService();

  try {
    const result = await emailSyncService.syncAccount(account.id, account.organization_id);

    console.log('\n✅ Sync Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n❌ Sync Error:');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
  }

  process.exit(0);
})();
