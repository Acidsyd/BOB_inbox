-- Migration: Create webhooks system for label events
-- This adds webhook functionality to trigger HTTP calls when labels are modified

-- Webhooks configuration table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  events TEXT[] DEFAULT ARRAY['label.assigned', 'label.removed', 'label.created'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT webhooks_org_name_unique UNIQUE(organization_id, name)
);

-- Webhook delivery log table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_webhook_deliveries_webhook
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_organization ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'failed' AND attempts < max_attempts;

-- Note: organization_id is used throughout the system for multi-tenancy
-- but doesn't have a foreign key constraint since it comes from auth/JWT
-- and the users table structure may vary by deployment

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhooks_updated_at();

-- Create function to clean up old webhook deliveries (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_deliveries()
RETURNS void AS $$
BEGIN
  -- Delete deliveries older than 30 days
  DELETE FROM webhook_deliveries
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- Comment the tables
COMMENT ON TABLE webhooks IS 'Webhook configurations for organizations to receive HTTP callbacks on label events';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts with status and retry information';