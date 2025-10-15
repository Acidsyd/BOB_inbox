-- Add provider_thread_id column to conversations table
-- This column stores the email provider's thread identifier (e.g., Gmail thread ID)

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations'
    AND column_name = 'provider_thread_id'
  ) THEN
    ALTER TABLE conversations
    ADD COLUMN provider_thread_id TEXT;

    RAISE NOTICE 'Column provider_thread_id added successfully';
  ELSE
    RAISE NOTICE 'Column provider_thread_id already exists';
  END IF;
END $$;

-- Add index for faster provider_thread_id lookups
CREATE INDEX IF NOT EXISTS idx_conversations_provider_thread_id
ON conversations(provider_thread_id);

-- Add comment to document the column
COMMENT ON COLUMN conversations.provider_thread_id IS 'Email provider thread identifier (e.g., Gmail thread ID) for linking conversations to provider threads';
