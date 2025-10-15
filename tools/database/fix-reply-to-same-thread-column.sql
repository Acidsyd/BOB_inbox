-- Fix missing 'reply_to_same_thread' column in scheduled_emails table
-- This column is needed for email sequence threading functionality

-- Add the missing column
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS reply_to_same_thread BOOLEAN DEFAULT false;

-- Update existing records to have proper default values
UPDATE scheduled_emails 
SET reply_to_same_thread = false 
WHERE reply_to_same_thread IS NULL;

-- Add an index for better performance on threading queries
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_reply_to_same_thread 
ON scheduled_emails(reply_to_same_thread, campaign_id);

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'scheduled_emails' 
  AND column_name IN ('is_follow_up', 'reply_to_same_thread');