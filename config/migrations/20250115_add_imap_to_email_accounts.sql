-- Migration: Add IMAP Configuration to Email Accounts
-- Purpose: Enable Mailgun (and other relay) accounts to receive emails via IMAP
-- Date: 2025-01-15

-- Add IMAP configuration columns to email_accounts table
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS imap_credentials_encrypted TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS imap_credentials_iv TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS imap_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS enable_receiving BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN email_accounts.imap_credentials_encrypted IS
  'Encrypted IMAP password using AES-256-CBC encryption';

COMMENT ON COLUMN email_accounts.imap_credentials_iv IS
  'Initialization vector for IMAP credentials decryption';

COMMENT ON COLUMN email_accounts.imap_config IS
  'IMAP server configuration: { host, port, user, secure, tls }. Example: {"host": "imap.gmail.com", "port": 993, "user": "user@domain.com", "secure": true}';

COMMENT ON COLUMN email_accounts.enable_receiving IS
  'Enable email receiving via IMAP for this account. When true, BackgroundSyncService will sync emails from IMAP server.';

COMMENT ON COLUMN email_accounts.last_sync_at IS
  'Timestamp of last successful IMAP sync for this account';

-- Create index for faster sync queries
CREATE INDEX IF NOT EXISTS idx_email_accounts_enable_receiving
ON email_accounts(enable_receiving)
WHERE enable_receiving = true;

-- Create index for organization + receiving accounts
CREATE INDEX IF NOT EXISTS idx_email_accounts_org_receiving
ON email_accounts(organization_id, enable_receiving)
WHERE enable_receiving = true;

-- Migration note
COMMENT ON TABLE email_accounts IS
  'Email accounts supporting both sending (via relay providers or OAuth2) and receiving (via IMAP). Mailgun accounts can use IMAP for inbox functionality.';
