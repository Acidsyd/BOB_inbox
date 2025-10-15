#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWebhookTables() {
  try {
    console.log('🔍 Checking if webhook tables exist...');

    // Check if webhooks table exists
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('id')
      .limit(1);

    if (!webhooksError) {
      console.log('✅ webhooks table already exists');

      // Check if webhook_deliveries table exists
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('webhook_deliveries')
        .select('id')
        .limit(1);

      if (!deliveriesError) {
        console.log('✅ webhook_deliveries table already exists');
        console.log('🎯 Webhook tables are already set up and ready to use!');
        return true;
      }
    }

    console.log('⚠️ Webhook tables do not exist yet');
    return false;

  } catch (error) {
    console.log('⚠️ Webhook tables do not exist yet:', error.message);
    return false;
  }
}

async function applyWebhookMigration() {
  try {
    console.log('🚀 Starting webhook migration...');

    // Check if tables already exist
    const tablesExist = await checkWebhookTables();

    if (tablesExist) {
      console.log('✅ Migration not needed - webhook tables already exist!');
      return;
    }

    console.log('📋 Webhook tables need to be created manually in Supabase Dashboard');
    console.log('🎯 Please follow these steps:');
    console.log('');
    console.log('1. Open your Supabase Dashboard');
    console.log('2. Go to the SQL Editor');
    console.log('3. Copy and paste the contents of ./database_migrations/create_webhooks.sql');
    console.log('4. Execute the SQL to create the webhook tables');
    console.log('');
    console.log('After that, the webhook system will be ready to use!');

  } catch (error) {
    console.error('❌ Failed to check webhook tables:', error);
  }
}

// Execute the webhook migration
applyWebhookMigration();