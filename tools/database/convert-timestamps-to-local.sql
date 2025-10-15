-- ====================================================================
-- CONVERT UTC TIMESTAMPS TO LOCAL TIME (UTC+2 timezone)
-- Based on diagnostic showing 2-hour offset between DB time and local time
-- ====================================================================

-- SAFETY FIRST: Create backups
CREATE TABLE campaigns_backup_utc_conversion AS SELECT * FROM campaigns;
CREATE TABLE scheduled_emails_backup_utc_conversion AS SELECT * FROM scheduled_emails;

-- Show what will change (PREVIEW - run this first to verify)
SELECT 
  'PREVIEW: campaigns conversion' as action,
  id,
  updated_at as current_utc,
  (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp as will_become_local,
  EXTRACT(HOUR FROM updated_at) as current_hour,
  EXTRACT(HOUR FROM (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp) as new_hour
FROM campaigns 
ORDER BY updated_at DESC 
LIMIT 5;

-- Show scheduled emails preview
SELECT 
  'PREVIEW: scheduled_emails conversion' as action,
  id,
  send_at as current_utc,
  (send_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp as will_become_local,
  EXTRACT(HOUR FROM send_at) as current_hour,
  EXTRACT(HOUR FROM (send_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp) as new_hour
FROM scheduled_emails 
WHERE send_at IS NOT NULL
ORDER BY send_at DESC 
LIMIT 5;

-- ====================================================================
-- ACTUAL CONVERSION (run after verifying preview looks correct)
-- ====================================================================

-- Convert campaigns table
UPDATE campaigns 
SET 
  updated_at = (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp,
  created_at = (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp;

-- Convert scheduled_emails table  
UPDATE scheduled_emails 
SET 
  send_at = (send_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp,
  updated_at = (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp,
  sent_at = CASE 
    WHEN sent_at IS NOT NULL 
    THEN (sent_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome')::timestamp
    ELSE sent_at
  END;

-- ====================================================================
-- VERIFICATION
-- ====================================================================

-- Check the conversion worked
SELECT 
  'campaigns after conversion' as table_name,
  COUNT(*) as total_records,
  MIN(updated_at) as earliest,
  MAX(updated_at) as latest,
  ROUND(AVG(EXTRACT(HOUR FROM updated_at))) as avg_hour_of_day
FROM campaigns

UNION ALL

SELECT 
  'scheduled_emails after conversion',
  COUNT(*),
  MIN(send_at),
  MAX(send_at), 
  ROUND(AVG(EXTRACT(HOUR FROM send_at)))
FROM scheduled_emails
WHERE send_at IS NOT NULL;

-- Verify specific recent timestamps now show local times
SELECT 
  'Recent campaigns - should show local times' as verification,
  id,
  updated_at,
  EXTRACT(HOUR FROM updated_at) as hour_of_day,
  CASE 
    WHEN EXTRACT(HOUR FROM updated_at) BETWEEN 8 AND 22 THEN 'Normal business hours ✅'
    ELSE 'Check if this time makes sense'
  END as sanity_check
FROM campaigns 
ORDER BY updated_at DESC 
LIMIT 5;

-- ====================================================================
-- CLEANUP (only after verifying everything works correctly)
-- ====================================================================

-- Uncomment these after confirming conversion is correct:
-- DROP TABLE campaigns_backup_utc_conversion;
-- DROP TABLE scheduled_emails_backup_utc_conversion;