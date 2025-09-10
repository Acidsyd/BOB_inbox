-- Part 2b: Initialize default values for account_rate_limits table
-- Apply this immediately after Part 2 (02_create_rate_limits_table.sql)

-- Add default values using ALTER TABLE (this works better than CREATE TABLE defaults)
ALTER TABLE account_rate_limits 
ALTER COLUMN tracked_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN tracked_hour SET DEFAULT EXTRACT(HOUR FROM NOW()),
ALTER COLUMN last_reset_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN last_reset_hour SET DEFAULT EXTRACT(HOUR FROM NOW());