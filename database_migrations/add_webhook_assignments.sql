-- Migration: Add webhook assignment support to campaigns and email accounts
-- This allows assigning specific webhooks to campaigns and email accounts

-- Add webhook assignment to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS assigned_webhooks UUID[] DEFAULT NULL;

-- Add webhook assignment to email_accounts table
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS assigned_webhooks UUID[] DEFAULT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_webhooks ON campaigns USING GIN(assigned_webhooks) WHERE assigned_webhooks IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_accounts_webhooks ON email_accounts USING GIN(assigned_webhooks) WHERE assigned_webhooks IS NOT NULL;

-- Comments
COMMENT ON COLUMN campaigns.assigned_webhooks IS 'Array of webhook UUIDs assigned to this campaign for specific events';
COMMENT ON COLUMN email_accounts.assigned_webhooks IS 'Array of webhook UUIDs assigned to this email account for specific events';

-- Note: These fields are optional and allow for more granular webhook assignment:
-- - If NULL or empty: Use organization-level webhooks (default behavior)
-- - If populated: Use only assigned webhooks for events from this campaign/account
-- - Multiple webhooks can be assigned to provide redundancy and different endpoints