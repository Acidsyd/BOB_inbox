-- Part 5: Create indexes for optimal query performance
-- Apply this after Part 4

CREATE INDEX IF NOT EXISTS idx_account_rate_limits_org_account 
    ON account_rate_limits(organization_id, email_account_id);
    
CREATE INDEX IF NOT EXISTS idx_account_rate_limits_date_hour 
    ON account_rate_limits(tracked_date, tracked_hour);
    
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