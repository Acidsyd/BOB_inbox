-- Create inbox_folders table for Gmail-style folder system
-- This enables the "Bounced" folder where bounce messages will appear

CREATE TABLE IF NOT EXISTS inbox_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  filter_query TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inbox_folders_org_id ON inbox_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_inbox_folders_type ON inbox_folders(organization_id, type);

-- Insert default folders for your organization
INSERT INTO inbox_folders (organization_id, name, type, description, filter_query, display_order) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Inbox', 'inbox', 'All incoming messages', 'direction = ''received''', 1),
  ('00000000-0000-0000-0000-000000000001', 'Sent', 'sent', 'Messages you have sent', 'direction = ''sent''', 2),
  ('00000000-0000-0000-0000-000000000001', 'Bounced', 'bounced', 'Bounced email messages', 'from_email ILIKE ''%daemon%'' OR from_email ILIKE ''%delivery%'' OR subject ILIKE ''%bounce%'' OR subject ILIKE ''%delivery%'' OR subject ILIKE ''%undelivered%''', 3),
  ('00000000-0000-0000-0000-000000000001', 'Untracked Replies', 'untracked', 'Replies not linked to campaigns', 'direction = ''received'' AND conversation_type = ''organic''', 4)
ON CONFLICT (organization_id, type) DO NOTHING;