-- RPC function to get conversations that have sent messages
-- This avoids the "414 Request-URI Too Large" error when using IN with 800+ conversation IDs

CREATE OR REPLACE FUNCTION get_conversations_with_sent_messages(
  org_id UUID,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  participants TEXT[],
  conversation_type TEXT,
  status TEXT,
  message_count INTEGER,
  unread_count INTEGER,
  last_activity_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.id,
    c.subject,
    c.participants,
    c.conversation_type,
    c.status,
    c.message_count,
    c.unread_count,
    c.last_activity_at,
    c.last_message_preview,
    c.created_at
  FROM conversations c
  WHERE c.organization_id = org_id
    AND c.status = 'active'
    AND EXISTS (
      SELECT 1 
      FROM conversation_messages cm 
      WHERE cm.conversation_id = c.id 
        AND cm.organization_id = org_id
        AND cm.direction = 'sent'
    )
  ORDER BY c.last_activity_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;