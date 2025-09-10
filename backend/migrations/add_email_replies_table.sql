-- Migration: Add email_replies table for tracking campaign reply interactions
-- Created: 2025-08-28

CREATE TABLE IF NOT EXISTS email_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_email_id UUID REFERENCES scheduled_emails(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    from_email VARCHAR NOT NULL, -- The email that replied
    to_email VARCHAR NOT NULL,   -- Our email account that received the reply
    subject TEXT,
    message_body TEXT,
    reply_message_id VARCHAR,     -- Gmail message ID of the reply
    original_message_id VARCHAR,  -- Our original message ID from scheduled_emails
    thread_id VARCHAR,            -- Gmail thread ID
    reply_received_at TIMESTAMP,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    -- Indexes for performance
    CONSTRAINT email_replies_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_replies_campaign_id ON email_replies(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_organization_id ON email_replies(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_scheduled_email_id ON email_replies(scheduled_email_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_original_message_id ON email_replies(original_message_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_reply_received_at ON email_replies(reply_received_at);

-- Add comment
COMMENT ON TABLE email_replies IS 'Stores email replies received from campaign recipients';