-- Part 3b: Initialize default values for account_usage_history table
-- Apply this immediately after Part 3 (03_create_usage_history_table.sql)

-- Add default value for usage history date
ALTER TABLE account_usage_history 
ALTER COLUMN date SET DEFAULT CURRENT_DATE;