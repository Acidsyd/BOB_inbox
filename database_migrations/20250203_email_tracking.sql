-- Email Tracking System Migration
-- Implements comprehensive open and click tracking for campaigns
-- Date: 2025-02-03

-- Create the main tracking events table
CREATE TABLE IF NOT EXISTS email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_email_id UUID NOT NULL REFERENCES scheduled_emails(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL,
  
  -- Event type: 'open' for email opens, 'click' for link clicks
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
  
  -- Tracking metadata
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet', 'unknown'
  browser_name TEXT,
  operating_system TEXT,
  country TEXT,
  city TEXT,
  
  -- Click-specific fields (NULL for open events)
  original_url TEXT, -- The actual URL that was clicked
  click_position INTEGER, -- Position of the link in the email (1st, 2nd, etc.)
  link_text TEXT, -- The text of the clicked link
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate tracking within a short time window (5 minutes)
  -- This helps filter out automatic email client behaviors
  CONSTRAINT unique_tracking_event UNIQUE (
    scheduled_email_id, 
    event_type, 
    ip_address, 
    created_at
  )
);

-- Create indexes for fast queries
CREATE INDEX idx_tracking_events_campaign ON email_tracking_events(campaign_id, event_type);
CREATE INDEX idx_tracking_events_scheduled_email ON email_tracking_events(scheduled_email_id);
CREATE INDEX idx_tracking_events_organization ON email_tracking_events(organization_id);
CREATE INDEX idx_tracking_events_created_at ON email_tracking_events(created_at DESC);
CREATE INDEX idx_tracking_events_lead ON email_tracking_events(lead_id) WHERE lead_id IS NOT NULL;

-- Create a summary view for quick campaign metrics
CREATE OR REPLACE VIEW campaign_tracking_metrics AS
SELECT 
  c.id as campaign_id,
  c.organization_id,
  c.name as campaign_name,
  COUNT(DISTINCT CASE WHEN te.event_type = 'open' THEN te.scheduled_email_id END) as unique_opens,
  COUNT(CASE WHEN te.event_type = 'open' THEN 1 END) as total_opens,
  COUNT(DISTINCT CASE WHEN te.event_type = 'click' THEN te.scheduled_email_id END) as unique_clicks,
  COUNT(CASE WHEN te.event_type = 'click' THEN 1 END) as total_clicks,
  COUNT(DISTINCT CASE WHEN te.event_type = 'click' THEN te.original_url END) as unique_links_clicked
FROM campaigns c
LEFT JOIN email_tracking_events te ON c.id = te.campaign_id
GROUP BY c.id, c.organization_id, c.name;

-- Add tracking token column to scheduled_emails for secure tracking
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();

-- Create index on tracking token for fast lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_tracking_token 
ON scheduled_emails(tracking_token) WHERE tracking_token IS NOT NULL;

-- Function to get first open time for an email
CREATE OR REPLACE FUNCTION get_first_open_time(email_id UUID)
RETURNS TIMESTAMPTZ AS $$
  SELECT MIN(created_at) 
  FROM email_tracking_events 
  WHERE scheduled_email_id = email_id 
  AND event_type = 'open'
$$ LANGUAGE SQL;

-- Function to get first click time for an email
CREATE OR REPLACE FUNCTION get_first_click_time(email_id UUID)
RETURNS TIMESTAMPTZ AS $$
  SELECT MIN(created_at) 
  FROM email_tracking_events 
  WHERE scheduled_email_id = email_id 
  AND event_type = 'click'
$$ LANGUAGE SQL;

-- Function to check if email was opened
CREATE OR REPLACE FUNCTION is_email_opened(email_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM email_tracking_events 
    WHERE scheduled_email_id = email_id 
    AND event_type = 'open'
  )
$$ LANGUAGE SQL;

-- Function to check if email has clicks
CREATE OR REPLACE FUNCTION is_email_clicked(email_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM email_tracking_events 
    WHERE scheduled_email_id = email_id 
    AND event_type = 'click'
  )
$$ LANGUAGE SQL;

-- Add tracking summary columns to scheduled_emails for performance
ALTER TABLE scheduled_emails
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Create trigger to update scheduled_emails summary when tracking events occur
CREATE OR REPLACE FUNCTION update_email_tracking_summary()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'open' THEN
    UPDATE scheduled_emails
    SET 
      first_opened_at = COALESCE(first_opened_at, NEW.created_at),
      open_count = open_count + 1
    WHERE id = NEW.scheduled_email_id;
  ELSIF NEW.event_type = 'click' THEN
    UPDATE scheduled_emails
    SET 
      first_clicked_at = COALESCE(first_clicked_at, NEW.created_at),
      click_count = click_count + 1
    WHERE id = NEW.scheduled_email_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_tracking_summary
AFTER INSERT ON email_tracking_events
FOR EACH ROW
EXECUTE FUNCTION update_email_tracking_summary();

-- Bot detection patterns table (to filter out automated opens/clicks)
CREATE TABLE IF NOT EXISTS tracking_bot_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_agent_pattern TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common bot patterns
INSERT INTO tracking_bot_patterns (user_agent_pattern, description) VALUES
  ('GoogleImageProxy', 'Gmail image proxy for privacy protection'),
  ('LinkedInBot', 'LinkedIn preview bot'),
  ('Slackbot', 'Slack link preview bot'),
  ('facebookexternalhit', 'Facebook link preview'),
  ('WhatsApp', 'WhatsApp link preview'),
  ('TelegramBot', 'Telegram link preview'),
  ('Twitterbot', 'Twitter link preview'),
  ('Outlook-iOS', 'Outlook mobile app prefetch'),
  ('Outlook-Android', 'Outlook mobile app prefetch'),
  ('GoogleDocs', 'Google Docs preview'),
  ('AdsBot-Google', 'Google Ads bot'),
  ('Mediapartners-Google', 'Google AdSense bot'),
  ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246 Mozilla/5.0', 'Common bot pattern')
ON CONFLICT DO NOTHING;

-- Function to check if a user agent is likely a bot
CREATE OR REPLACE FUNCTION is_bot_user_agent(agent TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM tracking_bot_patterns 
    WHERE is_active = true 
    AND agent ILIKE '%' || user_agent_pattern || '%'
  )
$$ LANGUAGE SQL;

-- Grant permissions (adjust based on your user setup)
GRANT SELECT, INSERT ON email_tracking_events TO authenticated;
GRANT SELECT ON campaign_tracking_metrics TO authenticated;
GRANT SELECT ON tracking_bot_patterns TO authenticated;
GRANT SELECT, UPDATE ON scheduled_emails TO authenticated;