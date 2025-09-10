const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function createBouncesFolder() {
  console.log('📁 Creating bounces folder for inbox...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // 1. Create inbox_folders table if it doesn't exist
    console.log('📋 Creating inbox_folders table...');
    const createTableSQL = `
CREATE TABLE IF NOT EXISTS inbox_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
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
    `;
    
    // Use raw SQL execution through direct query (we can't use rpc exec)
    const { error: tableError } = await supabase
      .from('inbox_folders')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('❌ inbox_folders table does not exist - needs manual creation');
      console.log('💡 Please run this SQL in Supabase SQL Editor:');
      console.log('=====================================');
      console.log(createTableSQL);
      console.log('=====================================');
    } else {
      console.log('✅ inbox_folders table exists');
    }
    
    // 2. Insert the folders for the correct organization
    console.log(`📁 Creating folders for organization: ${organizationId}`);
    
    const folders = [
      {
        organization_id: organizationId,
        name: 'Inbox',
        type: 'inbox',
        description: 'All incoming messages',
        filter_query: 'direction = \'received\'',
        display_order: 1
      },
      {
        organization_id: organizationId,
        name: 'Sent',
        type: 'sent', 
        description: 'Messages you have sent',
        filter_query: 'direction = \'sent\'',
        display_order: 2
      },
      {
        organization_id: organizationId,
        name: 'Untracked Replies',
        type: 'untracked_replies',
        description: 'Replies not linked to campaigns',
        filter_query: 'direction = \'received\' AND conversation_type = \'organic\'',
        display_order: 3
      },
      {
        organization_id: organizationId,
        name: 'Bounces',
        type: 'bounces',
        description: 'Bounced email messages',
        filter_query: 'from_email ILIKE \'%daemon%\' OR from_email ILIKE \'%delivery%\' OR subject ILIKE \'%bounce%\' OR subject ILIKE \'%delivery%\' OR subject ILIKE \'%undelivered%\'',
        display_order: 4
      }
    ];
    
    // Insert folders one by one to get better error handling
    for (const folder of folders) {
      console.log(`📂 Creating folder: ${folder.name} (${folder.type})`);
      
      const { data, error } = await supabase
        .from('inbox_folders')
        .upsert(folder, { 
          onConflict: 'organization_id,type',
          ignoreDuplicates: true 
        })
        .select();
      
      if (error) {
        console.error(`❌ Error creating ${folder.name}:`, error);
      } else {
        console.log(`✅ Created ${folder.name} folder`);
      }
    }
    
    // 3. Verify the bounces folder was created
    console.log('\\n🔍 Verifying bounces folder...');
    const { data: bounceFolder, error: verifyError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', 'bounces');
    
    if (verifyError) {
      console.error('❌ Error verifying bounces folder:', verifyError);
    } else if (bounceFolder?.length > 0) {
      console.log('✅ Bounces folder verified:');
      console.log(`  Name: ${bounceFolder[0].name}`);
      console.log(`  Filter: ${bounceFolder[0].filter_query}`);
      console.log('');
      console.log('🎉 Setup complete! Bounce messages should now appear in the Bounces folder.');
      console.log('');
      console.log('🔄 Next: Refresh the frontend inbox to see bounced messages.');
    } else {
      console.log('❌ Bounces folder not found after creation');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

createBouncesFolder().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});