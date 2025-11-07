-- =============================================================================
-- WISE 3 Campaign Complete Verification
-- Run this in Supabase SQL Editor
-- =============================================================================

-- 1. Campaign Overview
SELECT
  '=== CAMPAIGN DETAILS ===' as section,
  c.id as campaign_id,
  c.name,
  c.status,
  c.created_at,
  c.updated_at,
  c.config->>'emailSubject' as subject,
  c.config->>'leadListId' as lead_list_id,
  jsonb_array_length(COALESCE(c.config->'emailAccounts', '[]'::jsonb)) as num_accounts,
  c.config->>'emailsPerDay' as emails_per_day,
  c.config->>'sendingInterval' as interval_minutes,
  c.config->>'stopOnReply' as stop_on_reply
FROM campaigns c
WHERE c.name ILIKE '%WISE 3%'
ORDER BY c.created_at DESC
LIMIT 1;

-- 2. Follow-up Sequence Configuration
SELECT
  '=== FOLLOW-UP SEQUENCE ===' as section,
  step.value->>'subject' as step_subject,
  step.value->>'delay' as delay_days,
  step.value->>'replyToSameThread' as threads_with_parent,
  step.ordinality as step_number
FROM campaigns c,
  jsonb_array_elements(c.config->'emailSequence') WITH ORDINALITY as step
WHERE c.name ILIKE '%WISE 3%'
ORDER BY c.created_at DESC, step.ordinality
LIMIT 10;

-- 3. Email Statistics
SELECT
  '=== EMAIL STATISTICS ===' as section,
  COUNT(*) as total_emails,
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN is_follow_up = true THEN 1 END) as total_follow_ups,
  COUNT(CASE WHEN is_follow_up = true AND reply_to_same_thread = true THEN 1 END) as threaded_follow_ups
FROM campaigns c
JOIN scheduled_emails se ON se.campaign_id = c.id
WHERE c.name ILIKE '%WISE 3%'
GROUP BY c.id;

-- 4. Next 5 Scheduled Emails (with threading details)
SELECT
  '=== NEXT SCHEDULED EMAILS ===' as section,
  se.to_email,
  se.subject,
  se.send_at,
  EXTRACT(EPOCH FROM (se.send_at - NOW())) / 60 as minutes_until_send,
  se.is_follow_up,
  se.reply_to_same_thread,
  se.message_id_header IS NOT NULL as has_message_id,
  se.parent_email_id IS NOT NULL as has_parent_ref
FROM campaigns c
JOIN scheduled_emails se ON se.campaign_id = c.id
WHERE c.name ILIKE '%WISE 3%'
  AND se.status = 'scheduled'
  AND se.send_at >= NOW()
ORDER BY se.send_at ASC
LIMIT 5;

-- 5. Threading Verification for Follow-ups
SELECT
  '=== THREADING VERIFICATION ===' as section,
  f.to_email,
  f.is_follow_up,
  f.reply_to_same_thread,
  f.message_id_header as followup_msg_id,
  p.message_id_header as parent_msg_id,
  (f.message_id_header = p.message_id_header) as threading_correct,
  f.status,
  f.send_at
FROM campaigns c
JOIN scheduled_emails f ON f.campaign_id = c.id
LEFT JOIN scheduled_emails p ON p.id = f.parent_email_id
WHERE c.name ILIKE '%WISE 3%'
  AND f.is_follow_up = true
  AND f.reply_to_same_thread = true
  AND f.status = 'scheduled'
ORDER BY f.send_at ASC
LIMIT 10;

-- 6. Summary Check
SELECT
  '=== FINAL VERIFICATION ===' as section,
  COUNT(*) as total_scheduled_followups,
  COUNT(CASE WHEN f.message_id_header = p.message_id_header THEN 1 END) as correct_threading,
  COUNT(CASE WHEN f.message_id_header != p.message_id_header OR p.message_id_header IS NULL THEN 1 END) as broken_threading,
  CASE
    WHEN COUNT(CASE WHEN f.message_id_header != p.message_id_header OR p.message_id_header IS NULL THEN 1 END) = 0
    THEN '✅ ALL FOLLOW-UPS READY TO THREAD CORRECTLY'
    ELSE '❌ SOME FOLLOW-UPS HAVE THREADING ISSUES'
  END as status
FROM campaigns c
JOIN scheduled_emails f ON f.campaign_id = c.id
LEFT JOIN scheduled_emails p ON p.id = f.parent_email_id
WHERE c.name ILIKE '%WISE 3%'
  AND f.is_follow_up = true
  AND f.reply_to_same_thread = true
  AND f.status = 'scheduled';
