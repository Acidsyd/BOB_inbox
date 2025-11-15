#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllAccounts() {
  const organizationId = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

  console.log('🔍 Listing all email accounts for organization\n');

  // Check email_accounts table
  const { data: emailAccounts, error: emailError } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('organization_id', organizationId);

  if (emailError) {
    console.log('❌ Error fetching email_accounts:', emailError.message);
  } else {
    console.log(`📧 email_accounts table: ${emailAccounts?.length || 0} accounts`);
    emailAccounts?.forEach(acc => {
      console.log(`   - ${acc.email} (${acc.provider}) - ID: ${acc.id}`);
      console.log(`     is_active: ${acc.is_active}, relay_provider_id: ${acc.relay_provider_id || 'none'}`);
    });
    console.log('');
  }

  // Check oauth2_tokens table
  const { data: oauthAccounts, error: oauthError } = await supabase
    .from('oauth2_tokens')
    .select('*')
    .eq('organization_id', organizationId);

  if (oauthError) {
    console.log('❌ Error fetching oauth2_tokens:', oauthError.message);
  } else {
    console.log(`📧 oauth2_tokens table: ${oauthAccounts?.length || 0} accounts`);
    oauthAccounts?.forEach(acc => {
      console.log(`   - ${acc.email} (${acc.provider}) - ID: ${acc.id}`);
      console.log(`     status: ${acc.status}`);
    });
    console.log('');
  }

  // Look specifically for gianpiero@gkt-group.it
  console.log('🔍 Searching specifically for gianpiero@gkt-group.it:\n');

  const targetEmail = 'gianpiero@gkt-group.it';

  const emailMatches = emailAccounts?.filter(acc => acc.email === targetEmail) || [];
  const oauthMatches = oauthAccounts?.filter(acc => acc.email === targetEmail) || [];

  console.log(`Found ${emailMatches.length} match(es) in email_accounts:`);
  emailMatches.forEach(acc => {
    console.log(`   - Provider: ${acc.provider}, ID: ${acc.id}, is_active: ${acc.is_active}`);
  });

  console.log(`\nFound ${oauthMatches.length} match(es) in oauth2_tokens:`);
  oauthMatches.forEach(acc => {
    console.log(`   - Provider: ${acc.provider}, ID: ${acc.id}, status: ${acc.status}`);
  });

  process.exit(0);
}

listAllAccounts().catch(console.error);
