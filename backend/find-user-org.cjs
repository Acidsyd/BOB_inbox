const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function findUserOrganization() {
  console.log('🔍 Finding your actual organization based on campaigns and bounces...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Check which organization has campaigns
    console.log('🏢 Checking campaigns by organization...');
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('id, organization_id, status')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!campError && campaigns.length > 0) {
      console.log(`📊 Found ${campaigns.length} campaigns:`);
      const orgCounts = {};
      campaigns.forEach(camp => {
        orgCounts[camp.organization_id] = (orgCounts[camp.organization_id] || 0) + 1;
      });
      
      Object.entries(orgCounts).forEach(([orgId, count]) => {
        console.log(`  Organization ${orgId}: ${count} campaigns`);
      });
      
      const mostActiveOrgId = Object.keys(orgCounts)[0];
      console.log(`\n🎯 Most active organization: ${mostActiveOrgId}`);
      
      // Check bounces for this organization
      const { data: bounces, error: bounceError } = await supabase
        .from('email_bounces')
        .select('id, recipient_email, organization_id')
        .eq('organization_id', mostActiveOrgId);
      
      if (!bounceError) {
        console.log(`💥 Found ${bounces.length} bounces for this organization`);
        if (bounces.length > 0) {
          console.log('📧 Bounce emails:');
          bounces.forEach((bounce, i) => {
            console.log(`  ${i+1}. ${bounce.recipient_email}`);
          });
        }
      }
      
      // Generate SQL with correct organization ID
      console.log('\n📄 CORRECTED SQL (use this in Supabase):');
      console.log('=========================================');
      
      const sql = `
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
  ('${mostActiveOrgId}', 'Inbox', 'inbox', 'All incoming messages', 'direction = ''received''', 1),
  ('${mostActiveOrgId}', 'Sent', 'sent', 'Messages you have sent', 'direction = ''sent''', 2),
  ('${mostActiveOrgId}', 'Bounced', 'bounced', 'Bounced email messages', 'from_email ILIKE ''%daemon%'' OR from_email ILIKE ''%delivery%'' OR subject ILIKE ''%bounce%'' OR subject ILIKE ''%delivery%'' OR subject ILIKE ''%undelivered%''', 3),
  ('${mostActiveOrgId}', 'Untracked Replies', 'untracked', 'Replies not linked to campaigns', 'direction = ''received'' AND conversation_type = ''organic''', 4)
ON CONFLICT (organization_id, type) DO NOTHING;
      `;
      
      console.log(sql);
      console.log('=========================================');
      
      // Save corrected SQL
      const fs = require('fs');
      fs.writeFileSync('create-inbox-folders-final.sql', sql.trim());
      console.log('✅ Final corrected SQL saved to: create-inbox-folders-final.sql');
      
    } else {
      console.log('❌ No campaigns found. Using default organization.');
    }
    
  } catch (error) {
    console.error('❌ Error finding user organization:', error);
  }
}

findUserOrganization().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});