-- Add health check and sync tracking fields to email_accounts table
-- Migration: add_health_check_fields.sql

-- Add last_sync_at column to track when account was last synced
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add connection_health JSONB column to track connection status
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS connection_health JSONB DEFAULT '{
  "status": "unknown",
  "last_check_at": null,
  "last_successful_check": null,
  "consecutive_failures": 0,
  "error_message": null
}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_accounts_last_sync ON email_accounts(last_sync_at);
CREATE INDEX IF NOT EXISTS idx_email_accounts_health_check ON email_accounts(last_health_check);

-- Add comment for documentation
COMMENT ON COLUMN email_accounts.last_sync_at IS 'Timestamp of last successful sync with email provider';
COMMENT ON COLUMN email_accounts.connection_health IS 'JSON object tracking connection health status and history';
