-- Add missing provider_thread_id column to conversations table
-- This column is needed for UnifiedInboxService bounce detection

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS provider_thread_id TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_provider_thread_id 
ON conversations(provider_thread_id);

-- Update existing conversations to have null provider_thread_id (they will be populated during future syncs)
-- No UPDATE needed since DEFAULT NULL is implied

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversations' AND column_name = 'provider_thread_id';