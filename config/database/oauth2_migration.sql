-- OAuth2 Schema Migration for Mailsender Platform
-- Run this to add OAuth2 support to existing database

-- 1. OAuth2 tokens storage table
CREATE TABLE IF NOT EXISTS oauth2_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'gmail' NOT NULL,
    encrypted_tokens TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'oauth2',
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[], -- Array of OAuth2 scopes
    domain_wide_delegation BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, email, provider),
    CHECK (status IN ('active', 'expired', 'revoked', 'error'))
);

-- 2. Enhanced email queue for job processing
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Email content
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    
    -- Scheduling
    priority INTEGER DEFAULT 1,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    message_id VARCHAR(255), -- Gmail API message ID
    delivery_response JSONB,
    
    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    
    -- Metadata
    job_id VARCHAR(255),
    execution_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    CHECK (priority BETWEEN 1 AND 5)
);

-- 3. Email sending statistics
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

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_org_status ON email_queue(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_org_email ON oauth2_tokens(organization_id, email);

-- 5. Add OAuth2 support to existing email_accounts table
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS oauth2_token_id UUID REFERENCES oauth2_tokens(id);
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'smtp';
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS api_quotas JSONB;

-- 6. Update function for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_oauth2_tokens_updated_at ON oauth2_tokens;
CREATE TRIGGER update_oauth2_tokens_updated_at
    BEFORE UPDATE ON oauth2_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_queue_updated_at ON email_queue;
CREATE TRIGGER update_email_queue_updated_at
    BEFORE UPDATE ON email_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant permissions
-- GRANT ALL PRIVILEGES ON oauth2_tokens TO your_app_user;
-- GRANT ALL PRIVILEGES ON email_queue TO your_app_user;
-- GRANT ALL PRIVILEGES ON email_sending_stats TO your_app_user;

-- Verification query
SELECT 
    'OAuth2 schema migration completed!' as status,
    COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('oauth2_tokens', 'email_queue', 'email_sending_stats');