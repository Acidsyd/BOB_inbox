-- Add parent_email_id column to scheduled_emails table for follow-up email linking
-- This column links follow-up emails to their original parent email

-- Add the column (nullable since existing emails won't have a parent)
ALTER TABLE scheduled_emails
ADD COLUMN IF NOT EXISTS parent_email_id UUID REFERENCES scheduled_emails(id) ON DELETE SET NULL;

-- Add index for faster lookups of follow-up emails by parent
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_parent_email_id
ON scheduled_emails(parent_email_id)
WHERE parent_email_id IS NOT NULL;

-- Add index for faster lookups combining campaign and parent_email_id
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_parent
ON scheduled_emails(campaign_id, parent_email_id)
WHERE parent_email_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN scheduled_emails.parent_email_id IS 'References the original email that this follow-up is responding to. NULL for initial emails, set for follow-ups.';
