-- Create OAuth2 tokens table
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

-- Create email sending stats table
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

-- Add OAuth2 columns to email_accounts table
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS oauth2_token_id UUID REFERENCES oauth2_tokens(id),
ADD COLUMN IF NOT EXISTS auth_method VARCHAR(50) DEFAULT 'smtp',
ADD COLUMN IF NOT EXISTS api_quotas JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_org_email ON oauth2_tokens(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_email_sending_stats_org_date ON email_sending_stats(organization_id, date);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_oauth2_tokens_updated_at ON oauth2_tokens;
CREATE TRIGGER update_oauth2_tokens_updated_at
    BEFORE UPDATE ON oauth2_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_sending_stats_updated_at ON email_sending_stats;
CREATE TRIGGER update_email_sending_stats_updated_at
    BEFORE UPDATE ON email_sending_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();