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
    // 1. Create oauth2_tokens table
    console.log('Creating oauth2_tokens table...');
    const { data: data1, error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS oauth2_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          provider VARCHAR(50) DEFAULT 'gmail' NOT NULL,
          encrypted_tokens TEXT NOT NULL,
          token_type VARCHAR(50) DEFAULT 'oauth2',
          expires_at TIMESTAMP WITH TIME ZONE,
          scopes TEXT[],
          domain_wide_delegation BOOLEAN DEFAULT false,
          status VARCHAR(50) DEFAULT 'active',
          last_used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(organization_id, email, provider),
          CHECK (status IN ('active', 'expired', 'revoked', 'error'))
        );
      `
    });
    
    if (error1) {
      console.error('Error creating oauth2_tokens:', error1);
      return;
    }
    
    // 2. Create email_queue table
    console.log('Creating email_queue table...');
    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS email_queue (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
          lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          
          from_email VARCHAR(255) NOT NULL,
          from_name VARCHAR(255),
          to_email VARCHAR(255) NOT NULL,
          subject TEXT NOT NULL,
          html_body TEXT,
          text_body TEXT,
          
          priority INTEGER DEFAULT 1,
          scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          status VARCHAR(50) DEFAULT 'pending',
          sent_at TIMESTAMP WITH TIME ZONE,
          message_id VARCHAR(255),
          delivery_response JSONB,
          
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          last_error TEXT,
          
          job_id VARCHAR(255),
          execution_id VARCHAR(255),
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
          CHECK (priority BETWEEN 1 AND 5)
        );
      `
    });
    
    if (error2) {
      console.error('Error creating email_queue:', error2);
      return;
    }
    
    console.log('✅ OAuth2 migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyMigration();