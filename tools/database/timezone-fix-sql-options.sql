-- ====================================================================
-- TIMEZONE FIX SQL OPTIONS
-- Choose the approach that fits your preference
-- ====================================================================

-- ====================================================================
-- OPTION 1: QUICK CHECK - See what timezone formats exist
-- ====================================================================
-- This query shows you the mix of UTC vs local timestamps

SELECT 
  'campaigns' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN updated_at::text LIKE '%+00:00' OR updated_at::text LIKE '%Z' THEN 1 END) as utc_count,
  COUNT(CASE WHEN updated_at::text NOT LIKE '%+00:00' AND updated_at::text NOT LIKE '%Z' THEN 1 END) as local_count,
  -- Sample timestamps to see formats
  MIN(updated_at) as earliest_timestamp,
  MAX(updated_at) as latest_timestamp
FROM campaigns
WHERE updated_at IS NOT NULL

UNION ALL

SELECT 
  'scheduled_emails',
  COUNT(*),
  COUNT(CASE WHEN send_at::text LIKE '%+00:00' OR send_at::text LIKE '%Z' THEN 1 END),
  COUNT(CASE WHEN send_at::text NOT LIKE '%+00:00' AND send_at::text NOT LIKE '%Z' THEN 1 END),
  MIN(send_at),
  MAX(send_at)
FROM scheduled_emails
WHERE send_at IS NOT NULL

UNION ALL

SELECT 
  'conversation_messages',
  COUNT(*),
  COUNT(CASE WHEN COALESCE(sent_at, received_at) LIKE '%+00:00' OR COALESCE(sent_at, received_at) LIKE '%Z' THEN 1 END),
  COUNT(CASE WHEN COALESCE(sent_at, received_at) NOT LIKE '%+00:00' AND COALESCE(sent_at, received_at) NOT LIKE '%Z' THEN 1 END),
  MIN(COALESCE(sent_at, received_at)),
  MAX(COALESCE(sent_at, received_at))
FROM conversation_messages
WHERE COALESCE(sent_at, received_at) IS NOT NULL;

-- ====================================================================
-- OPTION 2: CONSERVATIVE APPROACH - Only fix new data (Recommended)
-- ====================================================================
-- This approach leaves existing data alone and only fixes future timestamps
-- The backend fix with dateUtils.js handles this automatically
-- NO SQL changes needed - just deploy the code fix!

-- Check if the code fix is working:
-- Look for new records with local timestamps (no +00:00 suffix)
SELECT 
  id, 
  updated_at,
  CASE 
    WHEN updated_at LIKE '%+00:00' OR updated_at LIKE '%Z' THEN 'UTC_FORMAT'
    ELSE 'LOCAL_FORMAT'
  END as format_type
FROM campaigns 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC 
LIMIT 10;

-- ====================================================================
-- OPTION 3: AGGRESSIVE APPROACH - Fix all existing timestamps
-- ====================================================================
-- WARNING: This modifies existing data. Backup first!
-- Adjust 'Europe/Rome' to your actual timezone

-- Step 3a: Backup tables first (SAFETY FIRST!)
CREATE TABLE campaigns_backup_timezone AS SELECT * FROM campaigns;
CREATE TABLE scheduled_emails_backup_timezone AS SELECT * FROM scheduled_emails;
CREATE TABLE conversation_messages_backup_timezone AS SELECT * FROM conversation_messages;

-- Step 3b: Fix campaigns table
UPDATE campaigns 
SET 
  updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text,
  created_at = (created_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text
WHERE 
  (updated_at LIKE '%+00:00' OR updated_at LIKE '%Z')
  OR (created_at LIKE '%+00:00' OR created_at LIKE '%Z');

-- Step 3c: Fix scheduled_emails table
UPDATE scheduled_emails 
SET 
  send_at = (send_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text,
  updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text,
  sent_at = CASE 
    WHEN sent_at IS NOT NULL AND (sent_at LIKE '%+00:00' OR sent_at LIKE '%Z') 
    THEN (sent_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text
    ELSE sent_at
  END
WHERE 
  (send_at LIKE '%+00:00' OR send_at LIKE '%Z')
  OR (updated_at LIKE '%+00:00' OR updated_at LIKE '%Z')
  OR (sent_at LIKE '%+00:00' OR sent_at LIKE '%Z');

-- Step 3d: Fix conversation_messages table (be careful with inbox data!)
UPDATE conversation_messages 
SET 
  sent_at = CASE 
    WHEN sent_at IS NOT NULL AND (sent_at LIKE '%+00:00' OR sent_at LIKE '%Z') 
    THEN (sent_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text
    ELSE sent_at
  END,
  received_at = CASE 
    WHEN received_at IS NOT NULL AND (received_at LIKE '%+00:00' OR received_at LIKE '%Z') 
    THEN (received_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text
    ELSE received_at
  END
WHERE 
  (sent_at LIKE '%+00:00' OR sent_at LIKE '%Z')
  OR (received_at LIKE '%+00:00' OR received_at LIKE '%Z');

-- ====================================================================
-- OPTION 4: HYBRID APPROACH - Fix only campaign-related timestamps
-- ====================================================================
-- This fixes campaign timing issues but leaves inbox data untouched

-- Fix only campaign and scheduled_emails tables
UPDATE campaigns 
SET updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text
WHERE updated_at LIKE '%+00:00' OR updated_at LIKE '%Z';

UPDATE scheduled_emails 
SET 
  send_at = (send_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text,
  updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::text
WHERE 
  (send_at LIKE '%+00:00' OR send_at LIKE '%Z')
  OR (updated_at LIKE '%+00:00' OR updated_at LIKE '%Z');

-- Leave conversation_messages alone (Gmail sync handles these correctly)

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- After applying any option, run these to verify:

-- Check format consistency
SELECT 
  table_name,
  total,
  utc_count,
  local_count,
  ROUND(local_count * 100.0 / NULLIF(total, 0), 1) as local_percentage
FROM (
  SELECT 
    'campaigns' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN updated_at LIKE '%+00:00' OR updated_at LIKE '%Z' THEN 1 END) as utc_count,
    COUNT(CASE WHEN updated_at NOT LIKE '%+00:00' AND updated_at NOT LIKE '%Z' THEN 1 END) as local_count
  FROM campaigns
  WHERE updated_at IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'scheduled_emails',
    COUNT(*),
    COUNT(CASE WHEN send_at LIKE '%+00:00' OR send_at LIKE '%Z' THEN 1 END),
    COUNT(CASE WHEN send_at NOT LIKE '%+00:00' AND send_at NOT LIKE '%Z' THEN 1 END)
  FROM scheduled_emails
  WHERE send_at IS NOT NULL
) t;

-- Check recent timestamps look correct (should show your local time)
SELECT 
  'Recent campaign updates' as source,
  id,
  updated_at,
  -- This should show reasonable local times (like morning/afternoon hours)
  EXTRACT(HOUR FROM updated_at::timestamp) as hour_of_day
FROM campaigns 
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC 
LIMIT 5;

-- ====================================================================
-- CLEANUP (After verifying everything works)
-- ====================================================================

-- Remove backup tables (only after confirming fix works!)
-- DROP TABLE IF EXISTS campaigns_backup_timezone;
-- DROP TABLE IF EXISTS scheduled_emails_backup_timezone; 
-- DROP TABLE IF EXISTS conversation_messages_backup_timezone;

-- ====================================================================
-- MY RECOMMENDATION
-- ====================================================================
-- 1. Start with OPTION 2 (Conservative) - just deploy the code fix
-- 2. If you want perfect consistency, use OPTION 4 (Hybrid)
-- 3. Only use OPTION 3 if you really want to fix everything
-- 4. Always run OPTION 1 first to see the current state
-- ====================================================================