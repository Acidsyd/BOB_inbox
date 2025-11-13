-- Database Size Analysis for Mailsender Platform
-- Run this in Supabase SQL Editor to identify space usage

-- 1. Overall database size
SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;

-- 2. Table sizes (sorted by largest first)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY size_bytes DESC
LIMIT 20;

-- 3. Row counts for main tables
SELECT 'scheduled_emails' as table_name, COUNT(*) as row_count FROM scheduled_emails
UNION ALL
SELECT 'conversation_messages', COUNT(*) FROM conversation_messages
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL
SELECT 'lead_lists', COUNT(*) FROM lead_lists
ORDER BY row_count DESC;

-- 4. Scheduled emails breakdown by status
SELECT
  status,
  COUNT(*) as count,
  pg_size_pretty(SUM(LENGTH(email_content::text) + LENGTH(email_subject::text))) as approx_content_size
FROM scheduled_emails
GROUP BY status
ORDER BY count DESC;

-- 5. Old scheduled emails (potential cleanup candidates)
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM scheduled_emails
WHERE created_at < NOW() - INTERVAL '30 days'
GROUP BY status;

-- 6. Conversation messages breakdown
SELECT
  direction,
  COUNT(*) as count,
  pg_size_pretty(SUM(LENGTH(COALESCE(body, '')))) as approx_body_size
FROM conversation_messages
GROUP BY direction;

-- 7. Old conversation messages (potential cleanup candidates)
SELECT
  direction,
  COUNT(*) as count,
  MIN(sent_at) as oldest,
  MAX(sent_at) as newest
FROM conversation_messages
WHERE sent_at < NOW() - INTERVAL '90 days'
GROUP BY direction;
