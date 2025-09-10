-- Check if Rate Limiting Database Setup is Working
-- Run this in your Supabase SQL Editor or psql

-- 1. Check if all required tables exist
SELECT 'Tables Check' as check_type, 
       CASE 
         WHEN COUNT(*) = 4 THEN '✅ All tables exist' 
         ELSE '❌ Missing tables: ' || (4 - COUNT(*)::text)
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('email_accounts', 'account_rate_limits', 'account_usage_history', 'account_rotation_log');

-- 2. Check if required columns were added to email_accounts
SELECT 'Columns Check' as check_type,
       CASE 
         WHEN COUNT(*) >= 8 THEN '✅ All rate limiting columns exist'
         ELSE '❌ Missing columns in email_accounts'
       END as status
FROM information_schema.columns 
WHERE table_name = 'email_accounts' 
  AND column_name IN ('daily_limit', 'hourly_limit', 'rotation_priority', 'rotation_weight', 'status', 'health_score', 'warmup_enabled', 'warmup_progress');

-- 3. Check if views exist
SELECT 'Views Check' as check_type,
       CASE 
         WHEN COUNT(*) = 2 THEN '✅ All views exist'
         ELSE '❌ Missing views'
       END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('account_usage_summary', 'account_performance_summary');

-- 4. Check if functions exist
SELECT 'Functions Check' as check_type,
       CASE 
         WHEN COUNT(*) >= 4 THEN '✅ All functions exist'
         ELSE '❌ Missing functions'
       END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('reset_daily_rate_limits', 'reset_hourly_rate_limits', 'get_available_accounts', 'record_email_sent');

-- 5. Test a function call
SELECT 'Function Test' as check_type,
       '✅ Functions working - initialized ' || initialize_account_rate_limits() || ' accounts' as status;

-- 6. Show current account setup (if any accounts exist)
SELECT 'Current Accounts' as check_type,
       COALESCE('Found ' || COUNT(*)::text || ' email accounts', 'No accounts found') as status
FROM email_accounts;

-- 7. Check rate limits table
SELECT 'Rate Limits Data' as check_type,
       COALESCE('Found ' || COUNT(*)::text || ' rate limit records', 'No rate limit records') as status
FROM account_rate_limits;