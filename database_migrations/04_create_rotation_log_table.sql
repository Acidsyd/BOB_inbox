-- Part 4: Create account_rotation_log table for tracking rotation decisions
-- Apply this after Part 3

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