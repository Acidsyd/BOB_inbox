-- Migration: Add storage columns to conversation_messages
-- Purpose: Track emails archived to Supabase Storage
-- Date: 2025-01-13

-- Add storage path columns
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS storage_html_path TEXT;

ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS storage_plain_path TEXT;

ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN conversation_messages.storage_html_path IS 'Path to archived HTML content in Supabase Storage (e.g., 2025/01/message-id.html)';
COMMENT ON COLUMN conversation_messages.storage_plain_path IS 'Path to archived plain text content in Supabase Storage (e.g., 2025/01/message-id.txt)';
COMMENT ON COLUMN conversation_messages.archived_at IS 'Timestamp when email content was moved to storage';

-- Create index for querying archived emails
CREATE INDEX IF NOT EXISTS idx_conversation_messages_archived
ON conversation_messages(archived_at)
WHERE archived_at IS NOT NULL;

-- Create index for storage paths
CREATE INDEX IF NOT EXISTS idx_conversation_messages_storage_html
ON conversation_messages(storage_html_path)
WHERE storage_html_path IS NOT NULL;

-- Note: This migration is backward compatible
-- Emails without storage paths will still have content_html/content_plain in database
