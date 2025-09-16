-- Add worldwide timezone support to Mailsender
-- Migration: add_worldwide_timezone_support.sql
-- Created: September 2025
-- Purpose: Enable automatic timezone detection and conversion for global users

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Add timezone support to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_detect_timezone BOOLEAN DEFAULT true;

-- Add timezone preferences to users (if users table exists)
-- Note: This is optional since some systems might not have a dedicated users table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_timezone VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone_auto_detected BOOLEAN DEFAULT true;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone_detected_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add timezone tracking to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS timezone_detected BOOLEAN DEFAULT true;

-- Create timezone validation function
CREATE OR REPLACE FUNCTION is_valid_timezone(tz VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    -- Test if timezone is valid by trying to use it
    PERFORM timezone(tz, NOW());
    RETURN TRUE;
EXCEPTION
    WHEN invalid_parameter_value THEN
        RETURN FALSE;
    WHEN others THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get timezone offset
CREATE OR REPLACE FUNCTION get_timezone_offset(tz VARCHAR(50), at_time TIMESTAMPTZ DEFAULT NOW())
RETURNS INTERVAL AS $$
BEGIN
    IF is_valid_timezone(tz) THEN
        RETURN (timezone(tz, at_time) - timezone('UTC', at_time));
    ELSE
        RETURN INTERVAL '0';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to convert UTC to user timezone
CREATE OR REPLACE FUNCTION convert_to_user_timezone(utc_time TIMESTAMPTZ, user_tz VARCHAR(50))
RETURNS TIMESTAMPTZ AS $$
BEGIN
    IF is_valid_timezone(user_tz) THEN
        RETURN timezone(user_tz, utc_time);
    ELSE
        RETURN utc_time; -- Return UTC if invalid timezone
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing campaigns to have default timezone
UPDATE campaigns
SET user_timezone = 'Europe/Rome', timezone_detected = false
WHERE user_timezone IS NULL;

-- Update organizations with default timezone based on existing data patterns
UPDATE organizations
SET default_timezone = 'Europe/Rome', auto_detect_timezone = true
WHERE default_timezone = 'UTC';

-- Create indexes for timezone-related queries
CREATE INDEX IF NOT EXISTS idx_campaigns_user_timezone ON campaigns(user_timezone);
CREATE INDEX IF NOT EXISTS idx_organizations_default_timezone ON organizations(default_timezone);

-- Add comments for documentation
COMMENT ON COLUMN organizations.default_timezone IS 'Default timezone for the organization (IANA timezone identifier)';
COMMENT ON COLUMN organizations.auto_detect_timezone IS 'Whether to automatically detect user timezone from browser';
COMMENT ON COLUMN campaigns.user_timezone IS 'User timezone when campaign was created (IANA timezone identifier)';
COMMENT ON COLUMN campaigns.timezone_detected IS 'Whether timezone was auto-detected or manually set';

COMMENT ON FUNCTION is_valid_timezone(VARCHAR) IS 'Validates if a timezone string is a valid IANA timezone identifier';
COMMENT ON FUNCTION get_timezone_offset(VARCHAR, TIMESTAMPTZ) IS 'Returns the timezone offset as an interval for a given timezone and time';
COMMENT ON FUNCTION convert_to_user_timezone(TIMESTAMPTZ, VARCHAR) IS 'Converts UTC timestamp to user timezone, returns UTC if invalid timezone';

-- Log migration completion
INSERT INTO migration_log (migration_name, applied_at, description)
VALUES (
    'add_worldwide_timezone_support',
    NOW(),
    'Added worldwide timezone support with auto-detection and conversion functions'
) ON CONFLICT (migration_name) DO UPDATE SET
    applied_at = NOW(),
    description = EXCLUDED.description;