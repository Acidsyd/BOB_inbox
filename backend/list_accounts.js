#!/usr/bin/env node
/**
 * List all email accounts and their sync status
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAccounts() {
  try {
    const { data: accounts, error } = await supabase
      .from('oauth2_tokens')
      .select('id, email, last_sync_at, provider, status, organization_id')
      .eq('status', 'linked_to_account')
      .order('email');

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    if (!accounts || accounts.length === 0) {
      console.log('❌ No email accounts found');
      process.exit(0);
    }

    console.log(`\n📧 Found ${accounts.length} active email account(s):\n`);

    accounts.forEach((acc, index) => {
      const lastSync = acc.last_sync_at
        ? new Date(acc.last_sync_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
        : 'NEVER SYNCED';

      const daysSinceSync = acc.last_sync_at
        ? Math.floor((Date.now() - new Date(acc.last_sync_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      console.log(`${index + 1}. ${acc.email}`);
      console.log(`   ID: ${acc.id}`);
      console.log(`   Provider: ${acc.provider}`);
      console.log(`   Last sync: ${lastSync}${daysSinceSync !== null ? ` (${daysSinceSync} days ago)` : ''}`);
      console.log(`   Organization: ${acc.organization_id}`);
      console.log('');
    });

    console.log('\n💡 To reset sync and get older emails:');
    console.log('   node reset_sync_timestamp.js <email>\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

listAccounts();
