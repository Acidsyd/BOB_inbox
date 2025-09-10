-- Comprehensive System Verification
-- Run these queries after applying the migration

-- 1. Verify all tables and views were created
SELECT 'Tables Created' as check_type,
       string_agg(table_name, ', ') as tables_found
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('account_rate_limits', 'account_usage_history', 'account_rotation_log');

-- 2. Verify email_accounts has new rate limiting columns
SELECT 'Enhanced Columns' as check_type,
       string_agg(column_name, ', ') as new_columns_found
FROM information_schema.columns 
WHERE table_name = 'email_accounts' 
  AND column_name IN ('daily_limit', 'hourly_limit', 'rotation_priority', 'rotation_weight', 'status', 'health_score', 'max_daily_limit', 'warmup_enabled');

-- 3. Test core database functions
SELECT 'Function Tests' as check_type,
       'Daily reset function: ' || reset_daily_rate_limits()::text || ' accounts reset' as daily_reset_result,
       'Hourly reset function: ' || reset_hourly_rate_limits()::text || ' accounts reset' as hourly_reset_result;

-- 4. Check initialized accounts
SELECT 'Account Rate Limits' as check_type,
       COUNT(*)::text || ' accounts have rate limit records' as initialized_status
FROM account_rate_limits;

-- 5. Test get_available_accounts function (replace with your org ID)
SELECT 'Available Accounts Test' as check_type,
       COUNT(*)::text || ' accounts available for rotation' as available_count
FROM get_available_accounts('00000000-0000-0000-0000-000000000000'::uuid, 10);

-- 6. Show sample account data with new fields
SELECT 'Sample Enhanced Accounts' as info,
       email, daily_limit, hourly_limit, rotation_priority, health_score, status
FROM email_accounts 
LIMIT 3;

-- 7. Test record_email_sent function (replace with your account/org IDs)
SELECT 'Email Recording Test' as check_type,
       record_email_sent(
         '00000000-0000-0000-0000-000000000000'::uuid, 
         '00000000-0000-0000-0000-000000000000'::uuid, 
         1
       )::text as recording_result;

-- 8. Verify rate limit tracking after recording
SELECT 'Rate Limit Tracking' as check_type,
       email_account_id, daily_sent, hourly_sent, current_date, current_hour
FROM account_rate_limits
LIMIT 3;