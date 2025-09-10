-- Enhanced Gmail-style Sidebar Folders Migration with Email Sync
-- Creates 3 system folders per organization plus email sync capabilities
-- Version: 2025-01-30 Enhanced

-- System folders table (3 predefined Gmail-style folders per organization)
CREATE TABLE IF NOT EXISTS system_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('inbox', 'sent', 'untracked_replies')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for system folders
CREATE INDEX IF NOT EXISTS idx_system_folders_org_type ON system_folders(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_system_folders_sort ON system_folders(organization_id, sort_order);

-- Ensure one folder per type per organization (constraint for 3 folders only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_folders_unique ON system_folders(organization_id, type);

-- Add email sync tracking columns to conversation_messages table
ALTER TABLE conversation_messages 
ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS outlook_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20) CHECK (provider_type IN ('gmail', 'outlook', 'smtp')) DEFAULT 'smtp',
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) CHECK (sync_status IN ('synced', 'pending', 'failed', 'local')) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for email sync columns (performance optimization)
CREATE INDEX IF NOT EXISTS idx_conversation_messages_gmail_id ON conversation_messages(gmail_message_id) WHERE gmail_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_outlook_id ON conversation_messages(outlook_message_id) WHERE outlook_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sync_status ON conversation_messages(organization_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_provider ON conversation_messages(organization_id, provider_type);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_last_synced ON conversation_messages(last_synced_at) WHERE last_synced_at IS NOT NULL;

-- Add archive column to conversations if not exists (required for folder logic)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add index for archived conversations
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(organization_id, is_archived) WHERE is_archived = true;

-- Function to automatically create the 3 system folders for new organizations
CREATE OR REPLACE FUNCTION create_system_folders_for_org(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert exactly 3 system folders per organization
  INSERT INTO system_folders (organization_id, name, icon, type, sort_order) VALUES
    (org_id, 'Inbox', 'Inbox', 'inbox', 1),
    (org_id, 'Sent', 'Send', 'sent', 2),
    (org_id, 'Untracked Replies', 'MessageCircle', 'untracked_replies', 3)
  ON CONFLICT (organization_id, type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create the 3 system folders for all existing organizations
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    PERFORM create_system_folders_for_org(org.id);
  END LOOP;
END $$;

-- Trigger to automatically create the 3 system folders for new organizations
CREATE OR REPLACE FUNCTION trigger_create_system_folders()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_system_folders_for_org(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'auto_create_system_folders' 
    AND tgrelid = 'organizations'::regclass
  ) THEN
    CREATE TRIGGER auto_create_system_folders
      AFTER INSERT ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION trigger_create_system_folders();
  END IF;
END $$;

-- Optimized folder_counts view for the 3 Gmail-style folders
CREATE OR REPLACE VIEW folder_counts AS
SELECT 
  sf.organization_id,
  sf.type,
  sf.name,
  sf.icon,
  sf.sort_order,
  CASE 
    -- Inbox: Campaign conversations only (active, not archived)
    WHEN sf.type = 'inbox' THEN (
      SELECT COUNT(*) 
      FROM conversations c 
      WHERE c.organization_id = sf.organization_id 
        AND c.conversation_type = 'campaign'
        AND c.status = 'active'
        AND c.is_archived = false
    )
    
    -- Sent: All conversations that have sent messages (organic + campaign)
    WHEN sf.type = 'sent' THEN (
      SELECT COUNT(DISTINCT c.id)
      FROM conversations c
      JOIN conversation_messages cm ON c.id = cm.conversation_id
      WHERE c.organization_id = sf.organization_id 
        AND cm.direction = 'sent'
        AND c.status = 'active'
    )
    
    -- Untracked Replies: Organic conversations not linked to campaigns
    WHEN sf.type = 'untracked_replies' THEN (
      SELECT COUNT(*)
      FROM conversations c
      WHERE c.organization_id = sf.organization_id
        AND c.conversation_type = 'organic'
        AND c.status = 'active'
        AND c.is_archived = false
    )
    
    ELSE 0
  END as count
FROM system_folders sf
WHERE sf.organization_id IS NOT NULL
ORDER BY sf.organization_id, sf.sort_order;

-- Create materialized view for performance (optional, for high-volume organizations)
CREATE MATERIALIZED VIEW IF NOT EXISTS folder_counts_materialized AS
SELECT * FROM folder_counts;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_counts_mat_org_type 
ON folder_counts_materialized(organization_id, type);

-- Function to refresh materialized view (call periodically or on data changes)
CREATE OR REPLACE FUNCTION refresh_folder_counts()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY folder_counts_materialized;
END;
$$ LANGUAGE plpgsql;

-- Function to get folder counts for a specific organization (optimized query)
CREATE OR REPLACE FUNCTION get_folder_counts_for_org(org_id UUID)
RETURNS TABLE(
  type VARCHAR(30),
  name VARCHAR(50),
  icon VARCHAR(50),
  sort_order INTEGER,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sf.type,
    sf.name,
    sf.icon,
    sf.sort_order,
    CASE 
      WHEN sf.type = 'inbox' THEN (
        SELECT COUNT(*) 
        FROM conversations c 
        WHERE c.organization_id = org_id 
          AND c.conversation_type = 'campaign'
          AND c.status = 'active'
          AND c.is_archived = false
      )
      WHEN sf.type = 'sent' THEN (
        SELECT COUNT(DISTINCT c.id)
        FROM conversations c
        JOIN conversation_messages cm ON c.id = cm.conversation_id
        WHERE c.organization_id = org_id 
          AND cm.direction = 'sent'
          AND c.status = 'active'
      )
      WHEN sf.type = 'untracked_replies' THEN (
        SELECT COUNT(*)
        FROM conversations c
        WHERE c.organization_id = org_id
          AND c.conversation_type = 'organic'
          AND c.status = 'active'
          AND c.is_archived = false
      )
      ELSE 0
    END as count
  FROM system_folders sf
  WHERE sf.organization_id = org_id
  ORDER BY sf.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Function to sync email message with provider IDs
CREATE OR REPLACE FUNCTION sync_email_message(
  msg_id UUID,
  provider VARCHAR(20),
  provider_msg_id VARCHAR(255),
  sync_stat VARCHAR(20) DEFAULT 'synced'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the message with sync information
  IF provider = 'gmail' THEN
    UPDATE conversation_messages 
    SET gmail_message_id = provider_msg_id,
        provider_type = provider,
        sync_status = sync_stat,
        last_synced_at = NOW()
    WHERE id = msg_id;
  ELSIF provider = 'outlook' THEN
    UPDATE conversation_messages 
    SET outlook_message_id = provider_msg_id,
        provider_type = provider,
        sync_status = sync_stat,
        last_synced_at = NOW()
    WHERE id = msg_id;
  ELSE
    UPDATE conversation_messages 
    SET provider_type = provider,
        sync_status = sync_stat,
        last_synced_at = NOW()
    WHERE id = msg_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments for documentation
COMMENT ON TABLE system_folders IS 'System-defined folders: exactly 3 per organization (inbox, sent, untracked_replies)';
COMMENT ON VIEW folder_counts IS 'Optimized view for real-time folder count display in sidebar (3 folders only)';
COMMENT ON COLUMN conversation_messages.gmail_message_id IS 'Gmail API message ID for sync tracking';
COMMENT ON COLUMN conversation_messages.outlook_message_id IS 'Outlook/Exchange message ID for sync tracking';
COMMENT ON COLUMN conversation_messages.provider_type IS 'Email provider type: gmail, outlook, or smtp';
COMMENT ON COLUMN conversation_messages.sync_status IS 'Sync status: synced, pending, failed, or local';
COMMENT ON COLUMN conversation_messages.last_synced_at IS 'Timestamp of last successful sync with email provider';
COMMENT ON FUNCTION get_folder_counts_for_org(UUID) IS 'Optimized function to get folder counts for specific organization';
COMMENT ON FUNCTION sync_email_message(UUID, VARCHAR, VARCHAR, VARCHAR) IS 'Function to update message sync information';

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_campaign_active ON conversations(organization_id, conversation_type, status, is_archived) 
WHERE conversation_type = 'campaign' AND status = 'active' AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_conversations_organic_active ON conversations(organization_id, conversation_type, status, is_archived) 
WHERE conversation_type = 'organic' AND status = 'active' AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_sent ON conversation_messages(organization_id, direction) 
WHERE direction = 'sent';