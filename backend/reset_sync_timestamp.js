#!/usr/bin/env node
/**
 * Reset sync timestamp for an email account to force full resync
 * This will sync all emails from the last 7 days
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetSyncTimestamp(email) {
  try {
    console.log('🔄 Resetting sync timestamp for:', email);

    // Calculate timestamp for 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Update the last_sync_at timestamp
    const { data, error } = await supabase
      .from('oauth2_tokens')
      .update({
        last_sync_at: sevenDaysAgo.toISOString()
      })
      .eq('email', email)
      .eq('status', 'linked_to_account')
      .select();

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No account found with email:', email);
      process.exit(1);
    }

    console.log('✅ Sync timestamp reset successfully');
    console.log('📅 New sync timestamp:', sevenDaysAgo.toISOString());
    console.log('📧 Account will sync emails from last 7 days on next sync');
    console.log('\nNext steps:');
    console.log('1. Wait for background sync (runs every 15 minutes)');
    console.log('2. OR trigger manual sync from the app');

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node reset_sync_timestamp.js <email>');
  console.log('Example: node reset_sync_timestamp.js gianpiero@example.com');
  process.exit(1);
}

resetSyncTimestamp(email);
