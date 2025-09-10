-- Create inbox_folders table for Gmail-style folder system
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inbox_folders_org_id ON inbox_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_inbox_folders_type ON inbox_folders(organization_id, type);

-- Insert folders for YOUR organization
INSERT INTO inbox_folders (organization_id, name, type, description, filter_query, display_order) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Inbox', 'inbox', 'All incoming messages', 'direction = ''received''', 1),
  ('550e8400-e29b-41d4-a716-446655440000', 'Sent', 'sent', 'Messages you have sent', 'direction = ''sent''', 2),
  ('550e8400-e29b-41d4-a716-446655440000', 'Bounced', 'bounced', 'Bounced email messages', 'from_email ILIKE ''%daemon%'' OR from_email ILIKE ''%delivery%'' OR subject ILIKE ''%bounce%'' OR subject ILIKE ''%delivery%'' OR subject ILIKE ''%undelivered%''', 3),
  ('550e8400-e29b-41d4-a716-446655440000', 'Untracked Replies', 'untracked', 'Replies not linked to campaigns', 'direction = ''received'' AND conversation_type = ''organic''', 4)
ON CONFLICT (organization_id, type) DO NOTHING;