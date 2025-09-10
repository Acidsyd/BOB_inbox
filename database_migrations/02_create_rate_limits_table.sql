-- Part 2: Create account_rate_limits table for real-time usage tracking
-- Apply this after Part 1

CREATE TABLE IF NOT EXISTS account_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    daily_sent INTEGER DEFAULT 0,
    hourly_sent INTEGER DEFAULT 0,
    tracked_date DATE,
    tracked_hour INTEGER,
    last_reset_date DATE,
    last_reset_hour INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_account_rate_limits_email_account 
        FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
    CONSTRAINT unique_account_org_rate_limit 
        UNIQUE (email_account_id, organization_id)
);