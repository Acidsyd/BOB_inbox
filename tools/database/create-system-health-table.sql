-- Create system_health table for HealthCheckService
-- This table stores heartbeat data for system monitoring

CREATE TABLE IF NOT EXISTS system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service varchar(50) NOT NULL UNIQUE,
  status varchar(20) NOT NULL,
  last_heartbeat timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_health_service 
ON system_health(service);

CREATE INDEX IF NOT EXISTS idx_system_health_heartbeat 
ON system_health(last_heartbeat DESC);

-- Insert initial cron_processor entry to prevent immediate failures
INSERT INTO system_health (service, status, last_heartbeat, updated_at)
VALUES ('cron_processor', 'running', now(), now())
ON CONFLICT (service) DO UPDATE SET
  status = EXCLUDED.status,
  last_heartbeat = EXCLUDED.last_heartbeat,
  updated_at = EXCLUDED.updated_at;

SELECT 'System health table created successfully' as result;