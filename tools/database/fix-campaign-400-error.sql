-- Fix for Campaign Start 400 Error
-- Missing columns in scheduled_emails table causing campaign.start() to fail

-- Add missing columns to scheduled_emails table
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS personalization JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}';

-- Create indexes for JSONB columns (for performance)
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_template_data ON scheduled_emails USING GIN (template_data);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_email_data ON scheduled_emails USING GIN (email_data);