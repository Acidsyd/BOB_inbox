-- Simple fix for Campaign Start 400 Error
-- The application code doesn't actually use these columns, but the database expects them
-- Add them with empty defaults to make the insert work

ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS personalization JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}';