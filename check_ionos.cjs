const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: allAccounts, error } = await supabase
    .from('email_accounts')
    .select('id, email, provider, last_sync_at, enable_receiving, imap_config, sync_metadata, status')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Total email accounts:', allAccounts?.length || 0);
  console.log('\n--- All Email Accounts ---');

  allAccounts?.forEach((acc, idx) => {
    console.log(`\n${idx + 1}. ${acc.email}`);
    console.log('   Provider:', acc.provider);
    console.log('   Enable receiving:', acc.enable_receiving);
    console.log('   Last sync:', acc.last_sync_at || 'Never');
    console.log('   Status:', acc.status);

    if (acc.imap_config) {
      try {
        const config = typeof acc.imap_config === 'string' ? JSON.parse(acc.imap_config) : acc.imap_config;
        console.log('   IMAP Host:', config.host || 'N/A');
        console.log('   IMAP Port:', config.port || 'N/A');
      } catch (e) {
        console.log('   IMAP Config: Error parsing');
      }
    }

    if (acc.sync_metadata) {
      try {
        const meta = typeof acc.sync_metadata === 'string' ? JSON.parse(acc.sync_metadata) : acc.sync_metadata;
        if (meta.lastError) {
          console.log('   Last Error:', meta.lastError);
        }
        if (meta.messageCount !== undefined) {
          console.log('   Messages synced:', meta.messageCount);
        }
      } catch (e) {}
    }
  });

  process.exit(0);
})();
