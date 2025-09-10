-- Part 11: Initialize rate limits and complete migration
-- Apply this LAST after all previous parts

-- Initialize rate limits for all existing accounts
SELECT initialize_account_rate_limits() as initialized_accounts;

-- Create account usage summary view
CREATE OR REPLACE VIEW account_usage_summary AS
SELECT 
    ea.id,
    ea.email,
    ea.organization_id,
    ea.status,
    ea.daily_limit,
    ea.hourly_limit,
    ea.health_score,
    ea.rotation_priority,
    ea.rotation_weight,
    COALESCE(arl.daily_sent, 0) as daily_sent,
    COALESCE(arl.hourly_sent, 0) as hourly_sent,
    GREATEST(0, ea.daily_limit - COALESCE(arl.daily_sent, 0)) as daily_remaining,
    GREATEST(0, ea.hourly_limit - COALESCE(arl.hourly_sent, 0)) as hourly_remaining,
    CASE 
        WHEN COALESCE(arl.daily_sent, 0) >= ea.daily_limit THEN 'daily_limit_reached'
        WHEN COALESCE(arl.hourly_sent, 0) >= ea.hourly_limit THEN 'hourly_limit_reached'
        WHEN ea.status != 'active' THEN 'inactive'
        ELSE 'available'
    END as availability_status,
    arl.last_reset_date,
    arl.last_reset_hour,
    arl.tracked_date,
    arl.tracked_hour,
    ea.updated_at
FROM email_accounts ea
LEFT JOIN account_rate_limits arl ON ea.id = arl.email_account_id;

-- Create performance monitoring view
CREATE OR REPLACE VIEW account_performance_summary AS
SELECT 
    ea.id,
    ea.email,
    ea.organization_id,
    ea.health_score,
    AVG(auh.delivery_rate) as avg_delivery_rate,
    AVG(auh.bounce_rate) as avg_bounce_rate,
    AVG(auh.complaint_rate) as avg_complaint_rate,
    AVG(auh.open_rate) as avg_open_rate,
    AVG(auh.click_rate) as avg_click_rate,
    SUM(auh.emails_sent) as total_emails_sent,
    COUNT(auh.id) as days_active,
    MAX(auh.created_at) as last_activity
FROM email_accounts ea
LEFT JOIN account_usage_history auh ON ea.id = auh.email_account_id
WHERE auh.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ea.id, ea.email, ea.organization_id, ea.health_score;