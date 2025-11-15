-- Add is_active column to email_accounts table
-- Migration: Add is_active column (default true for all existing accounts)

ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Set all existing accounts to active
UPDATE email_accounts SET is_active = true WHERE is_active IS NULL;

-- Add comment
COMMENT ON COLUMN email_accounts.is_active IS 'Whether the email account is active and can be used for sending';
