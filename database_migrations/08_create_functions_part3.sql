-- Part 8: Create reset functions for cron jobs
-- Apply this after Part 7

-- Function to reset daily counters (for cron job)
CREATE OR REPLACE FUNCTION reset_daily_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER := 0;
BEGIN
    UPDATE account_rate_limits 
    SET 
        daily_sent = 0,
        tracked_date = CURRENT_DATE,
        last_reset_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE tracked_date < CURRENT_DATE;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset hourly counters
CREATE OR REPLACE FUNCTION reset_hourly_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER := 0;
    current_hour_val INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
    UPDATE account_rate_limits 
    SET 
        hourly_sent = 0,
        tracked_hour = current_hour_val,
        last_reset_hour = current_hour_val,
        updated_at = NOW()
    WHERE tracked_hour != current_hour_val;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;