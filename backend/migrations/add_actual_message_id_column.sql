-- Add actual_message_id column to scheduled_emails table for reply tracking
-- This stores the actual Message-ID header (e.g., <CAAz6doV...@mail.gmail.com>)
-- while message_id continues to store the Gmail API ID (e.g., 198f200145d5bae6)

ALTER TABLE scheduled_emails 
ADD COLUMN actual_message_id VARCHAR(500);

-- Add index for reply tracking performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_actual_message_id 
ON scheduled_emails(actual_message_id);

-- Add comments for clarity
COMMENT ON COLUMN scheduled_emails.message_id IS 'Gmail API message ID (e.g., 198f200145d5bae6)';
COMMENT ON COLUMN scheduled_emails.actual_message_id IS 'Actual Message-ID header for reply tracking (e.g., <CAAz6doV...@mail.gmail.com>)';