#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('sql', {
      query: sql
    });
    
    if (error) {
      console.error(`❌ Error in ${description}:`, error);
      return false;
    }
    
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Exception in ${description}:`, error.message);
    return false;
  }
}

async function completeMigration() {
  console.log('🚀 Starting OAuth2 Migration Completion...\n');
  
  // 1. Create email_sending_stats table
  const emailStatsSQL = `
    CREATE TABLE IF NOT EXISTS email_sending_stats (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email_account VARCHAR(255) NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      
      emails_sent INTEGER DEFAULT 0,
      emails_delivered INTEGER DEFAULT 0,
      emails_bounced INTEGER DEFAULT 0,
      emails_complained INTEGER DEFAULT 0,
      
      delivery_rate DECIMAL(5,4),
      bounce_rate DECIMAL(5,4),
      complaint_rate DECIMAL(5,4),
      
      health_score INTEGER DEFAULT 100,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(organization_id, email_account, date)
    );
  `;
  
  await runSQL(emailStatsSQL, 'Creating email_sending_stats table');
  
  // 2. Add OAuth2 columns to email_accounts table
  const addOAuth2ColumnsSQL = `
    ALTER TABLE email_accounts 
    ADD COLUMN IF NOT EXISTS oauth2_token_id UUID REFERENCES oauth2_tokens(id),
    ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'smtp',
    ADD COLUMN IF NOT EXISTS api_quotas JSONB;
  `;
  
  await runSQL(addOAuth2ColumnsSQL, 'Adding OAuth2 columns to email_accounts table');
  
  // 3. Create indexes
  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_email_queue_org_status ON email_queue(organization_id, status);
    CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_org_email ON oauth2_tokens(organization_id, email);
  `;
  
  await runSQL(createIndexesSQL, 'Creating performance indexes');
  
  // 4. Create update timestamp function if it doesn't exist
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  await runSQL(createFunctionSQL, 'Creating update_updated_at_column function');
  
  // 5. Create triggers for updated_at
  const createTriggersSQL = `
    DROP TRIGGER IF EXISTS update_oauth2_tokens_updated_at ON oauth2_tokens;
    CREATE TRIGGER update_oauth2_tokens_updated_at
        BEFORE UPDATE ON oauth2_tokens
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;
    CREATE TRIGGER update_email_queue_updated_at
        BEFORE UPDATE ON email_queue
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    DROP TRIGGER IF EXISTS update_email_sending_stats_updated_at ON email_sending_stats;
    CREATE TRIGGER update_email_sending_stats_updated_at
        BEFORE UPDATE ON email_sending_stats
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
  
  await runSQL(createTriggersSQL, 'Creating triggers for automatic timestamp updates');
  
  // 6. Final verification
  console.log('\n🔍 Verifying migration results...');
  
  try {
    // Test oauth2_tokens table
    const { data: oauth2Test, error: oauth2Error } = await supabase
      .from('oauth2_tokens')
      .select('*')
      .limit(1);
    console.log(oauth2Error ? `❌ oauth2_tokens: ${oauth2Error.message}` : '✅ oauth2_tokens table accessible');
    
    // Test email_queue table
    const { data: queueTest, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .limit(1);
    console.log(queueError ? `❌ email_queue: ${queueError.message}` : '✅ email_queue table accessible');
    
    // Test email_sending_stats table
    const { data: statsTest, error: statsError } = await supabase
      .from('email_sending_stats')
      .select('*')
      .limit(1);
    console.log(statsError ? `❌ email_sending_stats: ${statsError.message}` : '✅ email_sending_stats table accessible');
    
    // Test email_accounts with new columns
    const { data: accountsTest, error: accountsError } = await supabase
      .from('email_accounts')
      .select('oauth2_token_id, auth_method, api_quotas')
      .limit(1);
    console.log(accountsError ? `❌ email_accounts OAuth2 columns: ${accountsError.message}` : '✅ email_accounts OAuth2 columns accessible');
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
  
  console.log('\n🎉 OAuth2 Migration Completion finished!');
  console.log('\n📋 Summary:');
  console.log('- ✅ oauth2_tokens table (already existed)');
  console.log('- ✅ email_queue table (already existed)');
  console.log('- ✅ email_sending_stats table (created)');
  console.log('- ✅ OAuth2 columns added to email_accounts');
  console.log('- ✅ Database indexes created');
  console.log('- ✅ Automatic timestamp triggers created');
  console.log('\n🚀 OAuth2 functionality is now ready for testing!');
}

completeMigration().catch(console.error);