-- Fast UTC migration using SQL UPDATE
-- Converts all old local timestamps (before Oct 1, 2025) to UTC by subtracting 2 hours

-- conversation_messages
UPDATE conversation_messages
SET sent_at = (sent_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE sent_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND sent_at < '2025-10-01T00:00:00';

UPDATE conversation_messages
SET received_at = (received_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE received_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND received_at < '2025-10-01T00:00:00';

UPDATE conversation_messages
SET created_at = (created_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE created_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND created_at < '2025-10-01T00:00:00';

-- conversations
UPDATE conversations
SET last_activity = (last_activity::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE last_activity ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND last_activity < '2025-10-01T00:00:00';

UPDATE conversations
SET created_at = (created_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE created_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND created_at < '2025-10-01T00:00:00';

UPDATE conversations
SET updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE updated_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND updated_at < '2025-10-01T00:00:00';

-- scheduled_emails
UPDATE scheduled_emails
SET send_at = (send_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE send_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND send_at < '2025-10-01T00:00:00';

UPDATE scheduled_emails
SET sent_at = (sent_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE sent_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND sent_at < '2025-10-01T00:00:00';

UPDATE scheduled_emails
SET created_at = (created_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE created_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND created_at < '2025-10-01T00:00:00';

UPDATE scheduled_emails
SET updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE updated_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND updated_at < '2025-10-01T00:00:00';

-- campaigns
UPDATE campaigns
SET created_at = (created_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE created_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND created_at < '2025-10-01T00:00:00';

UPDATE campaigns
SET updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE updated_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND updated_at < '2025-10-01T00:00:00';

UPDATE campaigns
SET started_at = (started_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE started_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND started_at < '2025-10-01T00:00:00';

UPDATE campaigns
SET paused_at = (paused_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE paused_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND paused_at < '2025-10-01T00:00:00';

UPDATE campaigns
SET stopped_at = (stopped_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE stopped_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND stopped_at < '2025-10-01T00:00:00';

-- oauth2_tokens
UPDATE oauth2_tokens
SET created_at = (created_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE created_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND created_at < '2025-10-01T00:00:00';

UPDATE oauth2_tokens
SET updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE updated_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND updated_at < '2025-10-01T00:00:00';

-- email_accounts
UPDATE email_accounts
SET created_at = (created_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE created_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND created_at < '2025-10-01T00:00:00';

UPDATE email_accounts
SET updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE updated_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND updated_at < '2025-10-01T00:00:00';

-- system_health
UPDATE system_health
SET last_heartbeat = (last_heartbeat::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE last_heartbeat ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND last_heartbeat < '2025-10-01T00:00:00';

UPDATE system_health
SET created_at = (created_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE created_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND created_at < '2025-10-01T00:00:00';

UPDATE system_health
SET updated_at = (updated_at::timestamp AT TIME ZONE 'UTC' - interval '2 hours')::text
WHERE updated_at ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
  AND updated_at < '2025-10-01T00:00:00';
