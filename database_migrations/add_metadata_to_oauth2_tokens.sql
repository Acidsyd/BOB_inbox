-- Add metadata column to oauth2_tokens table for storing connection health and other data
ALTER TABLE oauth2_tokens 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_oauth2_tokens_metadata ON oauth2_tokens USING gin(metadata);

-- Add comment
COMMENT ON COLUMN oauth2_tokens.metadata IS 'JSONB field for storing connection_health and other account metadata';
