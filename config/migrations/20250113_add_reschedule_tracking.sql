-- Migration: Add reschedule tracking fields to campaigns table
-- Purpose: Track nightly automatic reschedules for campaigns
-- Date: 2025-01-13

-- Add reschedule_count column to track number of times campaign has been rescheduled
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- Add last_rescheduled_at column to track when campaign was last rescheduled
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS last_rescheduled_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.reschedule_count IS 'Number of times this campaign has been automatically rescheduled by NightlyRescheduleService';
COMMENT ON COLUMN campaigns.last_rescheduled_at IS 'Timestamp of the last automatic reschedule operation';

-- Create index for querying reschedule history
CREATE INDEX IF NOT EXISTS idx_campaigns_reschedule_tracking
ON campaigns(last_rescheduled_at)
WHERE last_rescheduled_at IS NOT NULL;

-- Note: No rollback needed - these columns can remain with default values if feature is disabled
