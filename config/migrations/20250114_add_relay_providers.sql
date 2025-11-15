-- Migration: Add SMTP Relay Provider Support (SendGrid/Mailgun)
-- Created: 2025-01-14
-- Purpose: Allow users to bring their own SendGrid/Mailgun API keys for email sending

-- Add relay providers table
CREATE TABLE IF NOT EXISTS relay_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('sendgrid', 'mailgun', 'aws_ses', 'postmark')),
    provider_name VARCHAR(255) NOT NULL, -- User-friendly name like "SendGrid Primary"

    -- Encrypted API credentials
    api_key_encrypted TEXT NOT NULL,
    api_key_iv TEXT NOT NULL, -- Initialization vector for decryption

    -- Provider-specific configuration (JSONB for flexibility)
    config JSONB DEFAULT '{}', -- e.g., { "domain": "mg.example.com" } for Mailgun

    -- Account settings
    from_email VARCHAR(255), -- Default from email for this provider
    from_name VARCHAR(255),  -- Default from name
    daily_limit INTEGER DEFAULT 100, -- SendGrid free: 100/day, Mailgun: 5000/month

    -- Status and health
    is_active BOOLEAN DEFAULT true,
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Usage tracking
    emails_sent_today INTEGER DEFAULT 0,
    emails_sent_this_month INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, provider_type, provider_name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_relay_providers_org_id ON relay_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_relay_providers_active ON relay_providers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_relay_providers_type ON relay_providers(provider_type);

-- Add trigger for updated_at
CREATE TRIGGER update_relay_providers_updated_at
    BEFORE UPDATE ON relay_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update email_accounts table to support relay provider association
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS relay_provider_id UUID REFERENCES relay_providers(id) ON DELETE SET NULL;

-- Add index for relay provider lookups
CREATE INDEX IF NOT EXISTS idx_email_accounts_relay_provider
ON email_accounts(relay_provider_id) WHERE relay_provider_id IS NOT NULL;

-- Add relay provider type to email_accounts provider enum (non-breaking)
-- Note: This adds new provider types without breaking existing 'gmail', 'outlook', 'smtp'
COMMENT ON COLUMN email_accounts.provider IS 'Provider type: gmail, outlook, smtp, sendgrid, mailgun, aws_ses, postmark';

-- Create view for relay provider usage summary
CREATE OR REPLACE VIEW relay_provider_usage_summary AS
SELECT
    rp.id,
    rp.organization_id,
    rp.provider_type,
    rp.provider_name,
    rp.from_email,
    rp.is_active,
    rp.daily_limit,
    rp.emails_sent_today,
    rp.emails_sent_this_month,
    rp.health_score,
    rp.last_used_at,
    -- Count associated email accounts
    COUNT(DISTINCT ea.id) as connected_accounts,
    -- Calculate usage percentages
    CASE
        WHEN rp.daily_limit > 0 THEN ROUND((rp.emails_sent_today::DECIMAL / rp.daily_limit) * 100, 2)
        ELSE 0
    END as daily_usage_percent,
    rp.created_at,
    rp.updated_at
FROM relay_providers rp
LEFT JOIN email_accounts ea ON ea.relay_provider_id = rp.id AND ea.status = 'active'
GROUP BY rp.id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON relay_providers TO authenticated;
GRANT SELECT ON relay_provider_usage_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE relay_providers IS 'SMTP relay providers (SendGrid, Mailgun, etc.) with user-provided API keys';
COMMENT ON COLUMN relay_providers.api_key_encrypted IS 'Encrypted API key using AES-256-CBC';
COMMENT ON COLUMN relay_providers.api_key_iv IS 'Initialization vector for API key decryption';
COMMENT ON COLUMN relay_providers.config IS 'Provider-specific config: { "domain": "mg.example.com" } for Mailgun, { "region": "us-east-1" } for AWS SES';
COMMENT ON COLUMN relay_providers.daily_limit IS 'Daily sending limit for this provider (enforced by platform)';

-- Sample data for testing (optional - remove for production)
-- INSERT INTO relay_providers (organization_id, provider_type, provider_name, api_key_encrypted, api_key_iv, from_email, from_name, daily_limit)
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual org ID
--     'sendgrid',
--     'SendGrid Primary',
--     'encrypted_api_key_here',
--     'iv_here',
--     'noreply@example.com',
--     'Example Team',
--     100
-- );

-- Migration complete
-- Next steps:
-- 1. Install dependencies: npm install @sendgrid/mail mailgun.js
-- 2. Update EmailService.js to route through relay providers
-- 3. Create API endpoints: POST /api/relay-providers, GET /api/relay-providers
-- 4. Build frontend UI for adding API keys
