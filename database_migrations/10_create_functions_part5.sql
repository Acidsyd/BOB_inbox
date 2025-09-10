-- Part 10: Create record email sent function
-- Apply this after Part 9

-- Function to record email sent (atomic operation)
CREATE OR REPLACE FUNCTION record_email_sent(
    account_id UUID,
    org_id UUID,
    emails_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    current_hour_val INTEGER := EXTRACT(HOUR FROM NOW());
    current_date_val DATE := CURRENT_DATE;
BEGIN
    -- Insert or update rate limits atomically
    INSERT INTO account_rate_limits (
        email_account_id, 
        organization_id, 
        daily_sent, 
        hourly_sent, 
        tracked_date, 
        tracked_hour
    )
    VALUES (account_id, org_id, emails_count, emails_count, current_date_val, current_hour_val)
    ON CONFLICT (email_account_id, organization_id) 
    DO UPDATE SET 
        daily_sent = CASE 
            WHEN account_rate_limits.tracked_date = current_date_val 
            THEN account_rate_limits.daily_sent + emails_count
            ELSE emails_count
        END,
        hourly_sent = CASE 
            WHEN account_rate_limits.tracked_hour = current_hour_val 
            THEN account_rate_limits.hourly_sent + emails_count
            ELSE emails_count
        END,
        tracked_date = current_date_val,
        tracked_hour = current_hour_val,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;