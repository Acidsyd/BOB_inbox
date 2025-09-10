-- RPC function to count conversations that have sent messages
-- This avoids the "414 Request-URI Too Large" error when using IN with 800+ conversation IDs

CREATE OR REPLACE FUNCTION count_conversations_with_sent_messages(
  org_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  result_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT c.id) INTO result_count
  FROM conversations c
  WHERE c.organization_id = org_id
    AND c.status = 'active'
    AND EXISTS (
      SELECT 1 
      FROM conversation_messages cm 
      WHERE cm.conversation_id = c.id 
        AND cm.organization_id = org_id
        AND cm.direction = 'sent'
    );
    
  RETURN COALESCE(result_count, 0);
END;
$$;