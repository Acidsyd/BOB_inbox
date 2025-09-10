-- Check Current Database State Before Migration
-- Run this in Supabase SQL Editor first

-- 1. Check existing email_accounts table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'email_accounts' 
ORDER BY ordinal_position;

-- 2. Check what tables currently exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Check existing email accounts (if any)
SELECT id, email, organization_id, created_at
FROM email_accounts 
LIMIT 5;

-- 4. Check if rate limiting tables already exist
SELECT 'account_rate_limits' as table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'account_rate_limits'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION
SELECT 'account_usage_history' as table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'account_usage_history'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION  
SELECT 'account_rotation_log' as table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'account_rotation_log'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status;