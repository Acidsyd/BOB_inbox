-- ============================================================================
-- MANUAL OAUTH2 SETUP FOR SUPABASE DASHBOARD
-- ============================================================================
-- Execute these commands in the Supabase SQL Editor to complete OAuth2 setup
-- Navigate to: https://supabase.com/dashboard > Your Project > SQL Editor
-- ============================================================================

-- 1. Create email_sending_stats table
-- This table tracks email sending statistics and health metrics
CREATE TABLE IF NOT EXISTS email_sending_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email_account VARCHAR(255) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Email metrics
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_complained INTEGER DEFAULT 0,
    
    -- Calculated rates
    delivery_rate DECIMAL(5,4),
    bounce_rate DECIMAL(5,4),
    complaint_rate DECIMAL(5,4),
    
    -- Health score (0-100)
    health_score INTEGER DEFAULT 100,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, email_account, date),
    CHECK (health_score >= 0 AND health_score <= 100)
);

-- 2. Add OAuth2 columns to email_accounts table
-- These columns enable OAuth2 token association and API quota tracking
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS oauth2_token_id UUID REFERENCES oauth2_tokens(id);

ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'smtp';

ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS api_quotas JSONB;

-- 3. Create performance indexes
-- These indexes optimize query performance for OAuth2 and email queue operations
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled 
ON email_queue(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_email_queue_org_status 
ON email_queue(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_org_email 
ON oauth2_tokens(organization_id, email);

CREATE INDEX IF NOT EXISTS idx_email_sending_stats_org_date 
ON email_sending_stats(organization_id, date);

CREATE INDEX IF NOT EXISTS idx_email_accounts_oauth2_token 
ON email_accounts(oauth2_token_id) WHERE oauth2_token_id IS NOT NULL;

-- 4. Create update timestamp function (if it doesn't exist)
-- This function automatically updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for automatic timestamp updates
-- These triggers ensure updated_at is automatically set when records are modified

-- oauth2_tokens trigger
DROP TRIGGER IF EXISTS update_oauth2_tokens_updated_at ON oauth2_tokens;
CREATE TRIGGER update_oauth2_tokens_updated_at
    BEFORE UPDATE ON oauth2_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- email_queue trigger  
DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;
CREATE TRIGGER update_email_queue_updated_at
    BEFORE UPDATE ON email_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- email_sending_stats trigger
DROP TRIGGER IF EXISTS update_email_sending_stats_updated_at ON email_sending_stats;
CREATE TRIGGER update_email_sending_stats_updated_at
    BEFORE UPDATE ON email_sending_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- email_accounts trigger (if not already exists)
DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER update_email_accounts_updated_at
    BEFORE UPDATE ON email_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the setup was successful

-- Check if all tables exist
SELECT 
    'Tables Check' as check_type,
    COUNT(*) as count,
    array_agg(table_name) as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('oauth2_tokens', 'email_queue', 'email_sending_stats', 'email_accounts');

-- Check oauth2_tokens table structure
SELECT 
    'oauth2_tokens columns' as check_type,
    COUNT(*) as column_count,
    array_agg(column_name) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'oauth2_tokens';

-- Check email_accounts OAuth2 columns
SELECT 
    'email_accounts OAuth2 columns' as check_type,
    COUNT(*) as column_count,
    array_agg(column_name) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'email_accounts'
AND column_name IN ('oauth2_token_id', 'auth_method', 'api_quotas');

-- Check indexes
SELECT 
    'Indexes Check' as check_type,
    COUNT(*) as count,
    array_agg(indexname) as indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%oauth2%' OR indexname LIKE 'idx_%email_%';

-- Check triggers
SELECT 
    'Triggers Check' as check_type,
    COUNT(*) as count,
    array_agg(trigger_name) as triggers
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'OAuth2 Database Setup Complete!' as status,
       'All tables, columns, indexes, and triggers have been created.' as message;