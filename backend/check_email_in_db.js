#!/usr/bin/env node
/**
 * Check if a specific email exists in the database
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmail(searchTerm) {
  try {
    console.log('🔍 Searching for:', searchTerm);
    console.log('');

    // Search in conversation_messages
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('id, from_email, from_name, to_email, subject, sent_at, received_at, organization_id')
      .or(`from_email.ilike.%${searchTerm}%,to_email.ilike.%${searchTerm}%,from_name.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`)
      .order('received_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database error:', error.message);
      process.exit(1);
    }

    if (!messages || messages.length === 0) {
      console.log('❌ NO EMAILS FOUND matching:', searchTerm);
      console.log('');
      console.log('This means:');
      console.log('1. The email has NOT been synced to the database yet');
      console.log('2. You need to sync your email account to import this message');
      console.log('');
      console.log('Solutions:');
      console.log('- Use the manual sync button in the app');
      console.log('- Or run: node reset_sync_timestamp.js <your-email>');
      process.exit(0);
    }

    console.log(`✅ FOUND ${messages.length} matching emails:\n`);

    messages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.subject || 'No subject'}`);
      console.log(`   From: ${msg.from_name || 'Unknown'} <${msg.from_email}>`);
      console.log(`   To: ${msg.to_email}`);
      console.log(`   Date: ${msg.sent_at || msg.received_at}`);
      console.log(`   Organization: ${msg.organization_id}`);
      console.log('');
    });

    // Get sync status for all accounts
    console.log('📊 Email Account Sync Status:');
    console.log('');

    const { data: accounts } = await supabase
      .from('oauth2_tokens')
      .select('email, last_sync_at, provider, status')
      .eq('status', 'linked_to_account')
      .order('last_sync_at', { ascending: false });

    if (accounts && accounts.length > 0) {
      accounts.forEach(acc => {
        const lastSync = acc.last_sync_at
          ? new Date(acc.last_sync_at).toLocaleString()
          : 'Never synced';
        console.log(`📧 ${acc.email}`);
        console.log(`   Provider: ${acc.provider}`);
        console.log(`   Last sync: ${lastSync}`);
        console.log('');
      });
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Get search term from command line
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('Usage: node check_email_in_db.js <search_term>');
  console.log('Examples:');
  console.log('  node check_email_in_db.js "luca.luciani@innuvatech.com"');
  console.log('  node check_email_in_db.js "Luca Luciani"');
  console.log('  node check_email_in_db.js "Innuvatech"');
  process.exit(1);
}

checkEmail(searchTerm);
