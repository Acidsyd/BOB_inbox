#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteGmailAccount() {
  const email = 'gianpiero@gkt-group.it';
  const organizationId = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

  console.log('🔍 Searching for Gmail account:', email);
  console.log('');

  // Check oauth2_tokens table
  const { data: oauthAccount, error: oauthError } = await supabase
    .from('oauth2_tokens')
    .select('*')
    .eq('email', email)
    .eq('organization_id', organizationId)
    .single();

  if (oauthError && oauthError.code !== 'PGRST116') {
    console.log('❌ Error checking oauth2_tokens:', oauthError.message);
    process.exit(1);
  }

  if (oauthAccount) {
    console.log('✅ Found Gmail account in oauth2_tokens:');
    console.log('   ID:', oauthAccount.id);
    console.log('   Email:', oauthAccount.email);
    console.log('   Provider:', oauthAccount.provider);
    console.log('   Status:', oauthAccount.status);
    console.log('');

    // Delete from oauth2_tokens
    console.log('🗑️  Deleting from oauth2_tokens...');
    const { error: deleteError } = await supabase
      .from('oauth2_tokens')
      .delete()
      .eq('id', oauthAccount.id)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.log('❌ Failed to delete:', deleteError.message);
      process.exit(1);
    }

    console.log('✅ Successfully deleted Gmail account from oauth2_tokens');
  } else {
    console.log('⚠️  No Gmail account found in oauth2_tokens with email:', email);
  }

  // Also check email_accounts table (in case it was migrated)
  const { data: emailAccount, error: emailError } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('email', email)
    .eq('organization_id', organizationId)
    .eq('provider', 'gmail')
    .single();

  if (emailError && emailError.code !== 'PGRST116') {
    console.log('❌ Error checking email_accounts:', emailError.message);
    process.exit(1);
  }

  if (emailAccount) {
    console.log('');
    console.log('✅ Found Gmail account in email_accounts:');
    console.log('   ID:', emailAccount.id);
    console.log('   Email:', emailAccount.email);
    console.log('   Provider:', emailAccount.provider);
    console.log('');

    // Delete from email_accounts
    console.log('🗑️  Deleting from email_accounts...');
    const { error: deleteError } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', emailAccount.id)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.log('❌ Failed to delete:', deleteError.message);
      process.exit(1);
    }

    console.log('✅ Successfully deleted Gmail account from email_accounts');
  }

  console.log('');
  console.log('✅ Deletion complete!');
  process.exit(0);
}

deleteGmailAccount().catch(console.error);
