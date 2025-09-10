-- Verify Migration Applied Successfully
-- Run this after applying the migration

-- 1. Check all tables exist
SELECT 'Tables Created' as check_type,
       string_agg(table_name, ', ') as tables_found
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('account_rate_limits', 'account_usage_history', 'account_rotation_log');

-- 2. Check email_accounts has new columns
SELECT 'Enhanced Columns' as check_type,
       string_agg(column_name, ', ') as new_columns_found
FROM information_schema.columns 
WHERE table_name = 'email_accounts' 
  AND column_name IN ('daily_limit', 'hourly_limit', 'rotation_priority', 'rotation_weight', 'status', 'health_score');

-- 3. Check views exist
SELECT 'Views Created' as check_type,
       string_agg(table_name, ', ') as views_found
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('account_usage_summary', 'account_performance_summary');

-- 4. Test the account_usage_summary view
SELECT 'Usage Summary Test' as check_type,
       'Working - found ' || COUNT(*)::text || ' accounts' as status
FROM account_usage_summary;

-- 5. Test database functions
SELECT 'Function Tests' as check_type,
       'reset_daily_rate_limits: ' || reset_daily_rate_limits()::text || ' accounts reset' as status;

-- 6. Show sample data
SELECT 'Sample Account Data' as info,
       email, status, daily_limit, hourly_limit, daily_sent, hourly_sent, availability_status
FROM account_usage_summary 
LIMIT 3;