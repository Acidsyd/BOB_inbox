-- Part 7: Create utility functions for rate limiting operations
-- Apply this after Part 6

-- Function to initialize rate limits for existing accounts
CREATE OR REPLACE FUNCTION initialize_account_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    account_record RECORD;
    initialized_count INTEGER := 0;
BEGIN
    FOR account_record IN 
        SELECT id, organization_id FROM email_accounts 
        WHERE id NOT IN (SELECT email_account_id FROM account_rate_limits WHERE email_account_id IS NOT NULL)
    LOOP
        INSERT INTO account_rate_limits (email_account_id, organization_id)
        VALUES (account_record.id, account_record.organization_id);
        initialized_count := initialized_count + 1;
    END LOOP;
    
    RETURN initialized_count;
END;
$$ LANGUAGE plpgsql;