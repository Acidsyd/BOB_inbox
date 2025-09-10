-- Create scheduled_emails table for cron-based email processing
CREATE TABLE scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  email_account_id uuid, -- References both email_accounts and oauth2_tokens
  provider varchar DEFAULT 'gmail',
  from_email varchar NOT NULL,
  to_email varchar NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  send_at timestamp NOT NULL,
  status varchar DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'skipped')),
  sent_at timestamp,
  message_id varchar,
  error_message text,
  attempts integer DEFAULT 0,
  organization_id uuid NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_scheduled_emails_send_at_status ON scheduled_emails(send_at, status);
CREATE INDEX idx_scheduled_emails_organization ON scheduled_emails(organization_id);
CREATE INDEX idx_scheduled_emails_campaign ON scheduled_emails(campaign_id);
CREATE INDEX idx_scheduled_emails_email_account ON scheduled_emails(email_account_id);

-- Enable RLS
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS policy for user isolation  
CREATE POLICY "Users can only access their own scheduled emails" ON scheduled_emails
  FOR ALL USING (organization_id::text = auth.jwt() ->> 'organizationId');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scheduled_emails_updated_at 
    BEFORE UPDATE ON scheduled_emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();