#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Checking database schema...\n');
  
  const tables = [
    'organizations',
    'email_accounts', 
    'campaigns',
    'leads',
    'oauth2_tokens',
    'email_queue',
    'email_sending_stats'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error && error.code === 'PGRST106') {
        console.log(`❌ Table '${table}' does not exist`);
      } else if (error) {
        console.log(`⚠️  Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' - Error: ${err.message}`);
    }
  }
  
  // Check email_accounts structure
  console.log('\n🔍 Checking email_accounts table structure...');
  try {
    const { data } = await supabase
      .from('email_accounts')
      .select('*')
      .limit(0); // Just get schema
      
    console.log('email_accounts table exists and is accessible');
  } catch (error) {
    console.log('Error accessing email_accounts:', error.message);
  }
}

checkDatabase();