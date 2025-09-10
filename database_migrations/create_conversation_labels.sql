-- Migration: Create conversation labels/tags system
-- This adds a flexible labeling system for conversations with many-to-many relationships

-- Labels/tags table
CREATE TABLE IF NOT EXISTS conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, organization_id)
);

-- Many-to-many relationship between conversations and labels
CREATE TABLE IF NOT EXISTS conversation_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  label_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID, -- User who assigned the label
  UNIQUE(conversation_id, label_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_labels_org ON conversation_labels(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_labels_name ON conversation_labels(name, organization_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_conversation ON conversation_label_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_label ON conversation_label_assignments(label_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_org ON conversation_label_assignments(organization_id);

-- Add foreign key constraints (if tables exist)
DO $$
BEGIN
  -- Check if conversations table exists before adding constraint
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    ALTER TABLE conversation_label_assignments 
    ADD CONSTRAINT fk_conversation_label_assignments_conversation 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
  END IF;
  
  -- Add constraint for label reference
  ALTER TABLE conversation_label_assignments 
  ADD CONSTRAINT fk_conversation_label_assignments_label 
  FOREIGN KEY (label_id) REFERENCES conversation_labels(id) ON DELETE CASCADE;
  
EXCEPTION
  WHEN duplicate_object THEN
    -- Foreign key constraints already exist, skip
    NULL;
END $$;

-- Insert some default labels for organizations (optional - can be removed if not needed)
-- These will be created when users first use the system
INSERT INTO conversation_labels (organization_id, name, color, description) 
SELECT 
  DISTINCT organization_id,
  'Important',
  '#DC2626',
  'High priority conversations'
FROM users 
WHERE organization_id IS NOT NULL
ON CONFLICT (name, organization_id) DO NOTHING;

INSERT INTO conversation_labels (organization_id, name, color, description) 
SELECT 
  DISTINCT organization_id,
  'Follow-up',
  '#F59E0B',
  'Conversations requiring follow-up'
FROM users 
WHERE organization_id IS NOT NULL
ON CONFLICT (name, organization_id) DO NOTHING;

INSERT INTO conversation_labels (organization_id, name, color, description) 
SELECT 
  DISTINCT organization_id,
  'Lead',
  '#10B981',
  'Potential sales opportunities'
FROM users 
WHERE organization_id IS NOT NULL
ON CONFLICT (name, organization_id) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_labels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_labels_updated_at
  BEFORE UPDATE ON conversation_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_labels_updated_at();