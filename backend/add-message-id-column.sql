-- Add message_id_header column to email_bounces table
-- This allows precise correlation between bounces and original emails

ALTER TABLE email_bounces 
ADD COLUMN IF NOT EXISTS message_id_header TEXT;

-- Add index for faster lookups by message ID
CREATE INDEX IF NOT EXISTS idx_email_bounces_message_id_header 
ON email_bounces(message_id_header) 
WHERE message_id_header IS NOT NULL;

-- Add bounce tracking columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS is_bounced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bounce_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for bounce_type in leads table
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_bounce_type_check;

ALTER TABLE leads 
ADD CONSTRAINT leads_bounce_type_check 
CHECK (bounce_type IS NULL OR bounce_type IN ('hard', 'soft'));