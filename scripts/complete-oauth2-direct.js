#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: './backend/.env' });

// Extract connection details from Supabase URL
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Parse Supabase URL to get PostgreSQL connection details
const url = new URL(supabaseUrl);
const host = url.hostname.replace('.supabase.co', '.supabase.co');

// Supabase PostgreSQL connection details
const client = new Client({
  host: url.hostname.replace('.supabase.co', '.pooler.supabase.com'),
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'your-database-password',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  try {
    const result = await client.query(sql);
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error in ${description}:`, error.message);
    return false;
  }
}

async function completeMigration() {
  console.log('🚀 Starting OAuth2 Migration with Direct PostgreSQL Connection...\n');
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
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
    
    // 2. Add OAuth2 columns to email_accounts table one by one
    await runSQL(`ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS oauth2_token_id UUID REFERENCES oauth2_tokens(id);`, 'Adding oauth2_token_id column');
    await runSQL(`ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'smtp';`, 'Adding auth_method column');
    await runSQL(`ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS api_quotas JSONB;`, 'Adding api_quotas column');
    
    // 3. Create indexes
    await runSQL(`CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);`, 'Creating email_queue status index');
    await runSQL(`CREATE INDEX IF NOT EXISTS idx_email_queue_org_status ON email_queue(organization_id, status);`, 'Creating email_queue org status index');
    await runSQL(`CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_org_email ON oauth2_tokens(organization_id, email);`, 'Creating oauth2_tokens org email index');
    
    // 4. Create update timestamp function
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
    await runSQL(`DROP TRIGGER IF EXISTS update_oauth2_tokens_updated_at ON oauth2_tokens;`, 'Dropping old oauth2_tokens trigger');
    await runSQL(`CREATE TRIGGER update_oauth2_tokens_updated_at BEFORE UPDATE ON oauth2_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`, 'Creating oauth2_tokens trigger');
    
    await runSQL(`DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;`, 'Dropping old email_queue trigger');
    await runSQL(`CREATE TRIGGER update_email_queue_updated_at BEFORE UPDATE ON email_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`, 'Creating email_queue trigger');
    
    await runSQL(`DROP TRIGGER IF EXISTS update_email_sending_stats_updated_at ON email_sending_stats;`, 'Dropping old email_sending_stats trigger');
    await runSQL(`CREATE TRIGGER update_email_sending_stats_updated_at BEFORE UPDATE ON email_sending_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`, 'Creating email_sending_stats trigger');
    
    console.log('\n🎉 OAuth2 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

completeMigration().catch(console.error);