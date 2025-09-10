-- Create reply templates table
CREATE TABLE IF NOT EXISTS reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content_html TEXT NOT NULL,
  content_plain TEXT,
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(100) DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT reply_templates_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT reply_templates_name_org_unique 
    UNIQUE (name, organization_id)
);

-- Add RLS policies for reply templates
ALTER TABLE reply_templates ENABLE ROW LEVEL SECURITY;

-- Policy for organization isolation
CREATE POLICY "reply_templates_isolation" ON reply_templates
  FOR ALL USING (organization_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_reply_templates_organization_id ON reply_templates(organization_id);
CREATE INDEX idx_reply_templates_category ON reply_templates(category);
CREATE INDEX idx_reply_templates_active ON reply_templates(is_active);

-- Insert some default templates
INSERT INTO reply_templates (organization_id, name, subject, content_html, content_plain, category, sort_order) 
VALUES 
  (
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'Thank You - General',
    'Thank you for your interest',
    '<p>Thank you for reaching out. I appreciate your interest and will get back to you shortly.</p><p>Best regards,<br>{{sender_name}}</p>',
    'Thank you for reaching out. I appreciate your interest and will get back to you shortly.\n\nBest regards,\n{{sender_name}}',
    'general',
    1
  ),
  (
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'Follow Up - Initial',
    'Following up on our conversation',
    '<p>Hi {{recipient_name}},</p><p>I wanted to follow up on our previous conversation. Do you have any questions or would you like to schedule a call to discuss further?</p><p>Looking forward to hearing from you.</p><p>Best,<br>{{sender_name}}</p>',
    'Hi {{recipient_name}},\n\nI wanted to follow up on our previous conversation. Do you have any questions or would you like to schedule a call to discuss further?\n\nLooking forward to hearing from you.\n\nBest,\n{{sender_name}}',
    'follow_up',
    2
  ),
  (
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'Meeting Request',
    'Would you like to schedule a meeting?',
    '<p>Hi {{recipient_name}},</p><p>I hope this email finds you well. Would you be available for a brief 15-minute call to discuss how we might be able to help with {{topic}}?</p><p>I have availability on {{availability}} - please let me know what works best for you.</p><p>Best regards,<br>{{sender_name}}</p>',
    'Hi {{recipient_name}},\n\nI hope this email finds you well. Would you be available for a brief 15-minute call to discuss how we might be able to help with {{topic}}?\n\nI have availability on {{availability}} - please let me know what works best for you.\n\nBest regards,\n{{sender_name}}',
    'meeting',
    3
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reply_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reply_templates_updated_at
  BEFORE UPDATE ON reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_reply_templates_updated_at();