-- Fix scheduled_emails table schema mismatch
-- This adds all the missing columns that the campaign start handler expects

ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS message_id_header varchar,
ADD COLUMN IF NOT EXISTS sequence_step integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_follow_up boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_to_same_thread boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS personalization jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variables jsonb DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_sequence_step 
ON scheduled_emails(sequence_step);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_is_follow_up 
ON scheduled_emails(is_follow_up);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_message_id_header 
ON scheduled_emails(message_id_header);

SELECT 'Scheduled emails schema fixed - missing columns added' as result;