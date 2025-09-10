-- Part 9: Create get available accounts function
-- Apply this after Part 8

-- Function to get available accounts for organization
CREATE OR REPLACE FUNCTION get_available_accounts(
    org_id UUID,
    required_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    account_id UUID,
    email TEXT,
    daily_remaining INTEGER,
    hourly_remaining INTEGER,
    health_score INTEGER,
    rotation_priority INTEGER,
    rotation_weight DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ea.id as account_id,
        ea.email,
        GREATEST(0, ea.daily_limit - COALESCE(arl.daily_sent, 0)) as daily_remaining,
        GREATEST(0, ea.hourly_limit - COALESCE(arl.hourly_sent, 0)) as hourly_remaining,
        ea.health_score,
        ea.rotation_priority,
        ea.rotation_weight
    FROM email_accounts ea
    LEFT JOIN account_rate_limits arl ON ea.id = arl.email_account_id
    WHERE 
        ea.organization_id = org_id 
        AND ea.status = 'active'
        AND (
            COALESCE(arl.daily_sent, 0) < ea.daily_limit 
            AND COALESCE(arl.hourly_sent, 0) < ea.hourly_limit
        )
    ORDER BY 
        ea.rotation_priority DESC,
        ea.health_score DESC,
        ea.rotation_weight DESC,
        ea.created_at ASC
    LIMIT required_count;
END;
$$ LANGUAGE plpgsql;