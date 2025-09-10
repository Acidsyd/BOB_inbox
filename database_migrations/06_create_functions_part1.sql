-- Part 6: Create trigger functions and triggers
-- Apply this after Part 5

-- Create trigger function to update account_rate_limits.updated_at
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS trigger_update_rate_limits_updated_at ON account_rate_limits;
CREATE TRIGGER trigger_update_rate_limits_updated_at
    BEFORE UPDATE ON account_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limits_updated_at();