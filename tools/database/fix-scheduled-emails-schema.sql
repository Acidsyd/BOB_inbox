-- Fix missing 'is_follow_up' column in scheduled_emails table
-- This column is needed for campaign email sequences

-- Add the missing column
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT false;

-- Update existing records to mark follow-ups appropriately
-- (This is safe since all existing records would be initial emails)
UPDATE scheduled_emails 
SET is_follow_up = false 
WHERE is_follow_up IS NULL;

-- Add an index for better performance on follow-up queries
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_is_follow_up 
ON scheduled_emails(is_follow_up, campaign_id);

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'scheduled_emails' 
  AND column_name = 'is_follow_up';