-- Rate Limiting & Account Rotation Schema Migration
-- Date: 2025-01-31
-- Description: Implement sophisticated email account rate limiting and rotation system

-- 1. Enhance email_accounts table with rate limiting and rotation fields
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

-- 2. Create account_rate_limits table for real-time usage tracking
CREATE TABLE IF NOT EXISTS account_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    daily_sent INTEGER DEFAULT 0,
    hourly_sent INTEGER DEFAULT 0,
    current_date DATE DEFAULT CURRENT_DATE,
    current_hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
    last_reset_date DATE DEFAULT CURRENT_DATE,
    last_reset_hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_account_rate_limits_email_account 
        FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
    CONSTRAINT unique_account_org_rate_limit 
        UNIQUE (email_account_id, organization_id)
);

-- 3. Create account_usage_history table for analytics and health monitoring
CREATE TABLE IF NOT EXISTS account_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_complained INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    health_score_snapshot INTEGER DEFAULT 85,
    delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    complaint_rate DECIMAL(5,2) DEFAULT 0.00,
    open_rate DECIMAL(5,2) DEFAULT 0.00,
    click_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_account_usage_history_email_account 
        FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
    CONSTRAINT unique_account_org_date_usage 
        UNIQUE (email_account_id, organization_id, date)
);

-- 4. Create account_rotation_log table for tracking rotation decisions
CREATE TABLE IF NOT EXISTS account_rotation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    email_account_id UUID NOT NULL,
    rotation_strategy VARCHAR(50) DEFAULT 'hybrid',
    rotation_reason TEXT,
    emails_assigned INTEGER DEFAULT 0,
    account_health_score INTEGER DEFAULT 85,
    rotation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_rotation_log_email_account 
        FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE
);

-- 5. Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_account_rate_limits_org_account 
    ON account_rate_limits(organization_id, email_account_id);
    
CREATE INDEX IF NOT EXISTS idx_account_rate_limits_date_hour 
    ON account_rate_limits(current_date, current_hour);
    
CREATE INDEX IF NOT EXISTS idx_account_usage_history_org_account 
    ON account_usage_history(organization_id, email_account_id);
    
CREATE INDEX IF NOT EXISTS idx_account_usage_history_date 
    ON account_usage_history(date DESC);
    
CREATE INDEX IF NOT EXISTS idx_email_accounts_org_status 
    ON email_accounts(organization_id, status);
    
CREATE INDEX IF NOT EXISTS idx_email_accounts_rotation 
    ON email_accounts(organization_id, status, rotation_priority DESC, health_score DESC);

CREATE INDEX IF NOT EXISTS idx_account_rotation_log_org_timestamp 
    ON account_rotation_log(organization_id, rotation_timestamp DESC);

-- 6. Create trigger function to update account_rate_limits.updated_at
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS trigger_update_rate_limits_updated_at ON account_rate_limits;
CREATE TRIGGER trigger_update_rate_limits_updated_at
    BEFORE UPDATE ON account_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limits_updated_at();

-- 8. Create function to initialize rate limits for existing accounts
CREATE OR REPLACE FUNCTION initialize_account_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    account_record RECORD;
    initialized_count INTEGER := 0;
BEGIN
    FOR account_record IN 
        SELECT id, organization_id FROM email_accounts 
        WHERE id NOT IN (SELECT email_account_id FROM account_rate_limits)
    LOOP
        INSERT INTO account_rate_limits (email_account_id, organization_id)
        VALUES (account_record.id, account_record.organization_id);
        initialized_count := initialized_count + 1;
    END LOOP;
    
    RETURN initialized_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to reset daily counters (for cron job)
CREATE OR REPLACE FUNCTION reset_daily_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER := 0;
BEGIN
    UPDATE account_rate_limits 
    SET 
        daily_sent = 0,
        current_date = CURRENT_DATE,
        last_reset_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE current_date < CURRENT_DATE;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to reset hourly counters
CREATE OR REPLACE FUNCTION reset_hourly_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    reset_count INTEGER := 0;
    current_hour_val INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
    UPDATE account_rate_limits 
    SET 
        hourly_sent = 0,
        current_hour = current_hour_val,
        last_reset_hour = current_hour_val,
        updated_at = NOW()
    WHERE current_hour != current_hour_val;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to get available accounts for organization
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

-- 12. Create function to record email sent (atomic operation)
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
        current_date, 
        current_hour
    )
    VALUES (account_id, org_id, emails_count, emails_count, current_date_val, current_hour_val)
    ON CONFLICT (email_account_id, organization_id) 
    DO UPDATE SET 
        daily_sent = CASE 
            WHEN account_rate_limits.current_date = current_date_val 
            THEN account_rate_limits.daily_sent + emails_count
            ELSE emails_count
        END,
        hourly_sent = CASE 
            WHEN account_rate_limits.current_hour = current_hour_val 
            THEN account_rate_limits.hourly_sent + emails_count
            ELSE emails_count
        END,
        current_date = current_date_val,
        current_hour = current_hour_val,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 13. Initialize rate limits for all existing accounts
SELECT initialize_account_rate_limits() as initialized_accounts;

-- 14. Add helpful views for monitoring
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
    ea.updated_at
FROM email_accounts ea
LEFT JOIN account_rate_limits arl ON ea.id = arl.email_account_id;

-- 15. Create performance monitoring view
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

-- Migration completed successfully
-- Summary:
-- - Enhanced email_accounts table with rate limiting fields
-- - Created account_rate_limits table for real-time tracking
-- - Created account_usage_history table for analytics
-- - Created account_rotation_log table for rotation tracking
-- - Added optimized indexes for performance
-- - Created utility functions for rate limiting operations
-- - Added monitoring views for easy querying
-- - Initialized rate limits for existing accounts