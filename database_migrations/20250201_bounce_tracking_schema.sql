-- Bounce Tracking Database Schema Migration
-- This creates the necessary tables and columns for email bounce detection and tracking
-- Run this in Supabase SQL Editor

-- 1. Create email_bounces table for detailed bounce tracking
CREATE TABLE IF NOT EXISTS email_bounces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_email_id UUID REFERENCES scheduled_emails(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  message_id_header TEXT, -- Gmail Message-ID or SMTP Message-ID for correlation
  provider VARCHAR(20) NOT NULL DEFAULT 'smtp', -- 'gmail', 'outlook', 'smtp'
  bounce_type VARCHAR(10) NOT NULL, -- 'hard', 'soft', 'unknown'
  bounce_code VARCHAR(10), -- SMTP response code (e.g., '550') or API error code
  bounce_reason TEXT, -- Detailed bounce reason/error message
  recipient_email TEXT NOT NULL,
  bounced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Indexes for efficient queries
  CONSTRAINT bounce_type_check CHECK (bounce_type IN ('hard', 'soft', 'unknown')),
  CONSTRAINT provider_check CHECK (provider IN ('gmail', 'outlook', 'smtp', 'other'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_bounces_campaign_id ON email_bounces(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_bounces_lead_id ON email_bounces(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_bounces_organization_id ON email_bounces(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_bounces_bounced_at ON email_bounces(bounced_at);
CREATE INDEX IF NOT EXISTS idx_email_bounces_bounce_type ON email_bounces(bounce_type);
CREATE INDEX IF NOT EXISTS idx_email_bounces_scheduled_email_id ON email_bounces(scheduled_email_id);

-- 2. Add bounce tracking columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bounces INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hard_bounces INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS soft_bounces INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_bounce_check TIMESTAMP WITH TIME ZONE;

-- 3. Add bounce status to leads table  
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS is_bounced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bounce_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for bounce_type in leads table
ALTER TABLE leads 
ADD CONSTRAINT IF NOT EXISTS leads_bounce_type_check 
CHECK (bounce_type IS NULL OR bounce_type IN ('hard', 'soft'));

-- 4. Update scheduled_emails table to track bounce status
-- (These columns may already exist, using IF NOT EXISTS to prevent errors)
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS bounce_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Add constraint for scheduled_emails bounce_type
ALTER TABLE scheduled_emails 
ADD CONSTRAINT IF NOT EXISTS scheduled_emails_bounce_type_check 
CHECK (bounce_type IS NULL OR bounce_type IN ('hard', 'soft', 'unknown'));

-- 5. Create a view for campaign bounce statistics (optional, for easier reporting)
CREATE OR REPLACE VIEW campaign_bounce_stats AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.organization_id,
  -- Total emails sent/attempted
  COUNT(se.id) as total_emails,
  COUNT(CASE WHEN se.status = 'sent' THEN 1 END) as emails_sent,
  COUNT(CASE WHEN se.status = 'bounced' THEN 1 END) as emails_bounced,
  
  -- Bounce counts by type
  COUNT(CASE WHEN eb.bounce_type = 'hard' THEN 1 END) as hard_bounces,
  COUNT(CASE WHEN eb.bounce_type = 'soft' THEN 1 END) as soft_bounces,
  
  -- Bounce rates
  CASE 
    WHEN COUNT(CASE WHEN se.status IN ('sent', 'bounced') THEN 1 END) > 0 
    THEN ROUND(
      (COUNT(CASE WHEN se.status = 'bounced' THEN 1 END)::DECIMAL / 
       COUNT(CASE WHEN se.status IN ('sent', 'bounced') THEN 1 END)) * 100, 
      2
    )
    ELSE 0
  END as bounce_rate,
  
  CASE 
    WHEN COUNT(CASE WHEN se.status IN ('sent', 'bounced') THEN 1 END) > 0 
    THEN ROUND(
      (COUNT(CASE WHEN eb.bounce_type = 'hard' THEN 1 END)::DECIMAL / 
       COUNT(CASE WHEN se.status IN ('sent', 'bounced') THEN 1 END)) * 100, 
      2
    )
    ELSE 0
  END as hard_bounce_rate,
  
  -- Latest bounce information
  MAX(eb.bounced_at) as last_bounce_at,
  MAX(se.sent_at) as last_sent_at
  
FROM campaigns c
LEFT JOIN scheduled_emails se ON c.id = se.campaign_id
LEFT JOIN email_bounces eb ON se.id = eb.scheduled_email_id
WHERE c.status != 'deleted'
GROUP BY c.id, c.name, c.organization_id;

-- 6. Create function to update campaign bounce rates (called after each bounce)
CREATE OR REPLACE FUNCTION update_campaign_bounce_rate(p_campaign_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_sent INTEGER;
  v_total_bounces INTEGER;
  v_hard_bounces INTEGER;
  v_soft_bounces INTEGER;
  v_bounce_rate DECIMAL(5,2);
BEGIN
  -- Get bounce statistics for the campaign
  SELECT 
    COUNT(CASE WHEN status IN ('sent', 'bounced') THEN 1 END) as total_sent,
    COUNT(CASE WHEN status = 'bounced' THEN 1 END) as total_bounces,
    COUNT(CASE WHEN bounce_type = 'hard' THEN 1 END) as hard_bounces,
    COUNT(CASE WHEN bounce_type = 'soft' THEN 1 END) as soft_bounces
  INTO v_total_sent, v_total_bounces, v_hard_bounces, v_soft_bounces
  FROM scheduled_emails 
  WHERE campaign_id = p_campaign_id;
  
  -- Calculate bounce rate
  v_bounce_rate := CASE 
    WHEN v_total_sent > 0 THEN ROUND((v_total_bounces::DECIMAL / v_total_sent) * 100, 2)
    ELSE 0
  END;
  
  -- Update campaign with latest bounce statistics
  UPDATE campaigns 
  SET 
    bounce_rate = v_bounce_rate,
    total_bounces = v_total_bounces,
    hard_bounces = v_hard_bounces,
    soft_bounces = v_soft_bounces,
    last_bounce_check = NOW()
  WHERE id = p_campaign_id;
  
END;
$$;

-- 7. Create function to check if campaign should be auto-paused due to high bounce rate
CREATE OR REPLACE FUNCTION check_campaign_bounce_rate_for_pause(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bounce_rate DECIMAL(5,2);
  v_campaign_status TEXT;
  v_total_sent INTEGER;
  v_min_emails_for_pause INTEGER := 10; -- Minimum emails sent before auto-pause kicks in
BEGIN
  -- Get current campaign status and bounce rate
  SELECT 
    c.status,
    c.bounce_rate,
    COUNT(CASE WHEN se.status IN ('sent', 'bounced') THEN 1 END)
  INTO v_campaign_status, v_bounce_rate, v_total_sent
  FROM campaigns c
  LEFT JOIN scheduled_emails se ON c.id = se.campaign_id
  WHERE c.id = p_campaign_id
  GROUP BY c.id, c.status, c.bounce_rate;
  
  -- Only auto-pause if:
  -- 1. Campaign is currently active
  -- 2. Bounce rate is 5% or higher
  -- 3. At least minimum number of emails have been sent
  IF v_campaign_status = 'active' 
     AND v_bounce_rate >= 5.0 
     AND v_total_sent >= v_min_emails_for_pause THEN
    
    -- Pause the campaign
    UPDATE campaigns 
    SET 
      status = 'paused',
      updated_at = NOW()
    WHERE id = p_campaign_id;
    
    -- Cancel all pending scheduled emails for this campaign
    UPDATE scheduled_emails 
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE campaign_id = p_campaign_id 
      AND status = 'scheduled';
    
    -- Log the auto-pause event (could be expanded to notification system)
    INSERT INTO email_bounces (
      campaign_id,
      provider,
      bounce_type,
      bounce_reason,
      recipient_email,
      organization_id
    )
    SELECT 
      p_campaign_id,
      'system',
      'campaign_paused',
      'Campaign auto-paused due to high bounce rate: ' || v_bounce_rate || '%',
      'system@auto-pause',
      organization_id
    FROM campaigns 
    WHERE id = p_campaign_id;
    
    RETURN TRUE; -- Campaign was paused
  END IF;
  
  RETURN FALSE; -- Campaign was not paused
END;
$$;

-- 8. Create indexes for the view and better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_status ON scheduled_emails(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_bounce_type ON scheduled_emails(bounce_type) WHERE bounce_type IS NOT NULL;

-- 9. Add comments for documentation
COMMENT ON TABLE email_bounces IS 'Tracks all email bounce events with detailed information for analysis and lead management';
COMMENT ON COLUMN email_bounces.bounce_type IS 'hard: permanent failure, soft: temporary failure, unknown: unclassified';
COMMENT ON COLUMN email_bounces.provider IS 'Email service provider: gmail, outlook, smtp, other';
COMMENT ON FUNCTION update_campaign_bounce_rate IS 'Updates campaign bounce statistics after a bounce event occurs';
COMMENT ON FUNCTION check_campaign_bounce_rate_for_pause IS 'Checks and auto-pauses campaigns with bounce rate >= 5%';
COMMENT ON VIEW campaign_bounce_stats IS 'Provides real-time bounce statistics for all campaigns';

-- 10. Grant necessary permissions (adjust based on your RLS policies)
-- These are example permissions - modify based on your security requirements
-- ALTER TABLE email_bounces ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_bounces FORCE ROW LEVEL SECURITY;

-- Example RLS policy (uncomment and modify if needed)
/*
CREATE POLICY "Users can only see bounces from their organization" ON email_bounces
  FOR ALL USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
*/

-- 11. Insert initial test data (optional, remove in production)
-- This helps verify the schema is working correctly
/*
-- Test bounce record (remove in production)
INSERT INTO email_bounces (
  campaign_id,
  provider,
  bounce_type,
  bounce_code,
  bounce_reason,
  recipient_email,
  organization_id
) VALUES (
  (SELECT id FROM campaigns LIMIT 1),
  'gmail',
  'hard',
  '550',
  'User not found',
  'test@example.com',
  (SELECT organization_id FROM campaigns LIMIT 1)
);
*/

-- Migration complete
-- After running this migration:
-- 1. Test the functions with: SELECT update_campaign_bounce_rate('your-campaign-id');
-- 2. Verify the view with: SELECT * FROM campaign_bounce_stats LIMIT 5;
-- 3. Check that indexes were created: \d email_bounces in psql
-- 4. Implement the BounceTrackingService to use these database structures