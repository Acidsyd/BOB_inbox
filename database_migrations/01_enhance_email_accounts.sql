-- Part 1: Enhance email_accounts table with rate limiting fields
-- Apply this first in Supabase SQL Editor

ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS hourly_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS rotation_priority INTEGER DEFAULT 1 CHECK (rotation_priority >= 1 AND rotation_priority <= 10),
ADD COLUMN IF NOT EXISTS rotation_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (rotation_weight >= 0.1 AND rotation_weight <= 10.0),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'warming', 'error')),
ADD COLUMN IF NOT EXISTS max_daily_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 85 CHECK (health_score >= 0 AND health_score <= 100),
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS warmup_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warmup_progress INTEGER DEFAULT 0 CHECK (warmup_progress >= 0 AND warmup_progress <= 100);