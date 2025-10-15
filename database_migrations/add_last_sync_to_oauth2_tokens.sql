-- Add last_sync_at column to oauth2_tokens table
ALTER TABLE oauth2_tokens 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_last_sync_at ON oauth2_tokens(last_sync_at);

-- Add comment
COMMENT ON COLUMN oauth2_tokens.last_sync_at IS 'Timestamp of last successful email sync';
