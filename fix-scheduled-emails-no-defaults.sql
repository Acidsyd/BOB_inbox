-- Fix scheduled_emails table by adding columns without default values
-- This prevents constraint issues while making columns available

ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS template_data JSONB,
ADD COLUMN IF NOT EXISTS email_data JSONB,
ADD COLUMN IF NOT EXISTS personalization JSONB,
ADD COLUMN IF NOT EXISTS variables JSONB;