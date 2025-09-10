const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function createInboxFolders() {
  console.log('📁 Creating Gmail-style inbox folder system...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const organizationId = '3812dc8a-1de0-4e83-ad09-cc9bac26a753';
    
    // Step 1: Create the table using raw SQL execution
    console.log('🗃️ Creating inbox_folders table...');
    
    const createTableSQL = `
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
      
      CREATE INDEX IF NOT EXISTS idx_inbox_folders_org_id ON inbox_folders(organization_id);
      CREATE INDEX IF NOT EXISTS idx_inbox_folders_type ON inbox_folders(organization_id, type);
    `;
    
    // Try to execute SQL directly
    try {
      const { error: sqlError } = await supabase.rpc('exec', { query: createTableSQL });
      if (sqlError) {
        console.error('❌ SQL execution failed:', sqlError);
        console.log('\n💡 Please run this SQL manually in Supabase SQL Editor:');
        console.log(createTableSQL);
        return;
      } else {
        console.log('✅ inbox_folders table created successfully!');
      }
    } catch (err) {
      console.log('⚠️ Could not execute SQL directly. Please run this in Supabase SQL Editor:');
      console.log(createTableSQL);
      console.log('\nThen run this script again to create the folders.');
      return;
    }
    
    // Step 2: Create default folders
    console.log('\n📂 Creating default folders...');
    
    const defaultFolders = [
      { 
        name: 'Inbox', 
        type: 'inbox', 
        description: 'All incoming messages', 
        display_order: 1,
        filter_query: "direction = 'received'"
      },
      { 
        name: 'Sent', 
        type: 'sent', 
        description: 'Messages you have sent', 
        display_order: 2,
        filter_query: "direction = 'sent'"
      },
      { 
        name: 'Bounced', 
        type: 'bounced', 
        description: 'Bounced email messages', 
        display_order: 3,
        filter_query: "from_email ILIKE '%daemon%' OR from_email ILIKE '%delivery%' OR subject ILIKE '%bounce%' OR subject ILIKE '%delivery%' OR subject ILIKE '%undelivered%'"
      },
      { 
        name: 'Untracked Replies', 
        type: 'untracked', 
        description: 'Replies not linked to campaigns', 
        display_order: 4,
        filter_query: "direction = 'received' AND conversation_type = 'organic'"
      }
    ];
    
    const { data, error } = await supabase
      .from('inbox_folders')
      .upsert(
        defaultFolders.map(folder => ({
          ...folder,
          organization_id: organizationId
        })),
        { onConflict: 'organization_id,type' }
      )
      .select();
    
    if (error) {
      console.error('❌ Error creating folders:', error);
    } else {
      console.log(`✅ Created ${data.length} default folders:`);
      data.forEach((folder, i) => {
        console.log(`  ${i+1}. ${folder.name} (${folder.type})`);
        console.log(`     ${folder.description}`);
      });
      
      console.log('\n🎉 Gmail-style inbox system is now ready!');
      console.log('💌 Bounce messages will appear in the "Bounced" folder');
      console.log('📧 Now we need to import bounce messages from Gmail...');
    }
    
  } catch (error) {
    console.error('❌ Error creating inbox folders system:', error);
  }
}

createInboxFolders().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});