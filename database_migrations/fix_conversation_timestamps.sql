-- Fix conversation timestamp trigger to use email time instead of sync time
-- This replaces the trigger function to remove the GREATEST(..., now()) that was 
-- causing conversations to show sync time instead of actual email time

CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversation stats and preview
    UPDATE conversations SET
        message_count = (
            SELECT COUNT(*) FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
        ),
        unread_count = (
            SELECT COUNT(*) FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            AND direction = 'received' 
            AND is_read = false
        ),
        -- FIXED: Use only the actual email timestamp, not sync time
        -- Removed GREATEST(..., now()) which was overriding with sync time
        last_activity_at = (
            SELECT MAX(COALESCE(sent_at, received_at)) FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            AND COALESCE(sent_at, received_at) IS NOT NULL
        ),
        last_message_preview = (
            SELECT content_preview FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            ORDER BY COALESCE(sent_at, received_at) DESC NULLS LAST
            LIMIT 1
        ),
        updated_at = now()
    WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update existing conversations to use correct timestamps
UPDATE conversations SET
    last_activity_at = (
        SELECT MAX(COALESCE(cm.sent_at, cm.received_at)) 
        FROM conversation_messages cm 
        WHERE cm.conversation_id = conversations.id
        AND COALESCE(cm.sent_at, cm.received_at) IS NOT NULL
    )
WHERE id IN (
    SELECT DISTINCT conversation_id 
    FROM conversation_messages 
    WHERE COALESCE(sent_at, received_at) IS NOT NULL
);

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE 'Conversation timestamp fix applied - emails will now show actual email time instead of sync time';
END $$;