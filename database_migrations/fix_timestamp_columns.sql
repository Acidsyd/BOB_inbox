-- Fix timestamp columns to use timestamptz (with timezone) instead of timestamp (without timezone)
-- This ensures UTC timezone information is preserved when storing ISO strings with 'Z' suffix
--
-- IMPORTANT: Run this in Supabase SQL Editor
--
-- Background: PostgreSQL 'timestamp' type strips timezone info, causing 'Z' to be removed.
-- When JavaScript reads back timestamps without 'Z', it interprets them as local time,
-- causing a timezone shift (e.g., 10 AM becomes 8 AM on a UTC+2 system).
--
-- Solution: Use 'timestamptz' which preserves timezone information.

-- Step 1: Alter scheduled_emails.send_at to timestamptz
ALTER TABLE scheduled_emails
ALTER COLUMN send_at TYPE timestamptz USING send_at AT TIME ZONE 'UTC';

-- Step 2: Alter scheduled_emails.sent_at to timestamptz
ALTER TABLE scheduled_emails
ALTER COLUMN sent_at TYPE timestamptz USING sent_at AT TIME ZONE 'UTC';

-- Step 3: Alter scheduled_emails.created_at to timestamptz (if not already)
ALTER TABLE scheduled_emails
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- Step 4: Alter scheduled_emails.updated_at to timestamptz (if not already)
ALTER TABLE scheduled_emails
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Step 5: Verify the changes
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'scheduled_emails'
  AND column_name IN ('send_at', 'sent_at', 'created_at', 'updated_at')
ORDER BY column_name;

-- Expected output: all columns should show 'timestamp with time zone' (timestamptz)
