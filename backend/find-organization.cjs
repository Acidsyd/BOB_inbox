const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function findOrganization() {
  console.log('🔍 Finding your organization ID...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // First, let's check what organizations exist
    console.log('🏢 Checking organizations table...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);
    
    if (orgError) {
      console.error('❌ Error fetching organizations:', orgError);
      return;
    }
    
    console.log(`📋 Found ${orgs.length} organizations:`);
    orgs.forEach((org, i) => {
      console.log(`  ${i+1}. ID: ${org.id}`);
      console.log(`     Name: ${org.name || 'N/A'}`);
      console.log(`     Created: ${org.created_at}`);
      console.log('');
    });
    
    if (orgs.length > 0) {
      const correctOrgId = orgs[0].id;
      console.log(`✅ Using organization ID: ${correctOrgId}`);
      
      // Generate the corrected SQL
      console.log('\n📄 Corrected SQL for Supabase:');
      console.log('=====================================');
      
      const sql = `
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
  ('${correctOrgId}', 'Inbox', 'inbox', 'All incoming messages', 'direction = ''received''', 1),
  ('${correctOrgId}', 'Sent', 'sent', 'Messages you have sent', 'direction = ''sent''', 2),
  ('${correctOrgId}', 'Bounced', 'bounced', 'Bounced email messages', 'from_email ILIKE ''%daemon%'' OR from_email ILIKE ''%delivery%'' OR subject ILIKE ''%bounce%'' OR subject ILIKE ''%delivery%'' OR subject ILIKE ''%undelivered%''', 3),
  ('${correctOrgId}', 'Untracked Replies', 'untracked', 'Replies not linked to campaigns', 'direction = ''received'' AND conversation_type = ''organic''', 4)
ON CONFLICT (organization_id, type) DO NOTHING;
      `;
      
      console.log(sql);
      console.log('=====================================');
      console.log('💡 Copy this SQL and run it in Supabase SQL Editor');
      
      // Save the corrected SQL to file
      const fs = require('fs');
      fs.writeFileSync('create-inbox-folders-corrected.sql', sql.trim());
      console.log('✅ Corrected SQL saved to: create-inbox-folders-corrected.sql');
      
    } else {
      console.log('❌ No organizations found. This might indicate a database setup issue.');
    }
    
  } catch (error) {
    console.error('❌ Error finding organization:', error);
  }
}

findOrganization().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});