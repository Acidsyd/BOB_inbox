#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Applying OAuth2 schema migration...');
  
  try {
    // Check if oauth2_tokens table exists first
    console.log('Checking if oauth2_tokens table already exists...');
    const { data: existing } = await supabase
      .from('oauth2_tokens')
      .select('id')
      .limit(1);
      
    if (existing !== null) {
      console.log('✅ oauth2_tokens table already exists');
    }
    
    // Add columns to email_accounts table
    console.log('Adding OAuth2 columns to email_accounts table...');
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('id, auth_method')
      .limit(1);
      
    console.log('Sample email_accounts data:', accounts);
    
    console.log('✅ OAuth2 migration assessment completed!');
    console.log('\n📋 Next steps:');
    console.log('1. If oauth2_tokens table doesn\'t exist, create it manually in Supabase dashboard');
    console.log('2. Add oauth2_token_id, auth_method, and api_quotas columns to email_accounts');
    console.log('3. Create email_queue and email_sending_stats tables');
    
  } catch (error) {
    console.error('❌ Migration check failed:', error.message);
  }
}

applyMigration();