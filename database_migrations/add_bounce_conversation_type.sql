-- Add 'bounce' conversation type to conversations table check constraint
-- This allows bounce email detection to create bounce conversations

-- Drop the existing check constraint
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_conversation_type_check;

-- Recreate the constraint with 'bounce' included
ALTER TABLE conversations
ADD CONSTRAINT conversations_conversation_type_check
CHECK (conversation_type IN ('campaign', 'organic', 'bounce'));

-- Add comment to document the change
COMMENT ON CONSTRAINT conversations_conversation_type_check ON conversations IS 'Allowed conversation types: campaign (from campaigns), organic (user-initiated), bounce (email bounce notifications)';
