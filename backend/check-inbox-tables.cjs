const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function checkInboxTables() {
  console.log('🗃️ Checking inbox-related database tables...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const organizationId = '3812dc8a-1de0-4e83-ad09-cc9bac26a753';
    
    // Check conversations table
    console.log('💬 Checking conversations table...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, subject, conversation_type, status, participants')
      .eq('organization_id', organizationId)
      .limit(3);
    
    if (convError) {
      console.error('❌ conversations table error:', convError.message);
    } else {
      console.log(`✅ conversations table exists - ${conversations.length} records found`);
    }
    
    // Check conversation_messages table
    console.log('\n📨 Checking conversation_messages table...');
    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('id, from_email, to_email, subject, direction')
      .eq('organization_id', organizationId)
      .limit(3);
    
    if (msgError) {
      console.error('❌ conversation_messages table error:', msgError.message);
    } else {
      console.log(`✅ conversation_messages table exists - ${messages.length} records found`);
      if (messages.length > 0) {
        console.log('📧 Sample messages:');
        messages.forEach((msg, i) => {
          console.log(`  ${i+1}. From: ${msg.from_email} | Subject: ${msg.subject} | Direction: ${msg.direction}`);
        });
      }
    }
    
    // Check for inbox_folders table
    console.log('\n📁 Checking inbox_folders table...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(5);
    
    if (folderError) {
      console.error('❌ inbox_folders table does not exist:', folderError.message);
      console.log('\n💡 Solution: Need to create the Gmail-style folder system!');
      console.log('🔧 This includes the "Bounced" folder where bounce messages should appear.');
      
      // Try to create the table and folders
      console.log('\n🚀 Creating inbox folders system...');
      await createInboxFolders(supabase, organizationId);
      
    } else {
      console.log(`✅ inbox_folders table exists - ${folders.length} folders found`);
      folders.forEach((folder, i) => {
        console.log(`  ${i+1}. ${folder.name} (${folder.type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking inbox tables:', error);
  }
}

async function createInboxFolders(supabase, organizationId) {
  try {
    // Create inbox_folders table if it doesn't exist
    console.log('📋 Creating inbox_folders table...');
    
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
    `;
    
    // Note: This might fail if we don't have SQL execution permissions
    // In that case, the user needs to run this in Supabase SQL editor
    console.log('⚠️ SQL to run in Supabase SQL Editor:');
    console.log(createTableSQL);
    
    // Create default folders
    const defaultFolders = [
      { name: 'Inbox', type: 'inbox', description: 'All incoming messages', display_order: 1 },
      { name: 'Sent', type: 'sent', description: 'Messages you have sent', display_order: 2 },
      { name: 'Bounced', type: 'bounced', description: 'Bounced email messages', display_order: 3, 
        filter_query: "from_email ILIKE '%daemon%' OR from_email ILIKE '%delivery%' OR subject ILIKE '%bounce%' OR subject ILIKE '%delivery%' OR subject ILIKE '%undelivered%'" },
      { name: 'Untracked Replies', type: 'untracked', description: 'Replies not linked to campaigns', display_order: 4 }
    ];
    
    console.log('\n📂 Default folders to create:');
    defaultFolders.forEach(folder => {
      console.log(`  • ${folder.name} (${folder.type}): ${folder.description}`);
    });
    
    // Try to insert folders (this will work if the table exists)
    try {
      const { error: insertError } = await supabase
        .from('inbox_folders')
        .upsert(
          defaultFolders.map(folder => ({
            ...folder,
            organization_id: organizationId
          })),
          { onConflict: 'organization_id,type' }
        );
        
      if (insertError) {
        console.error('❌ Could not create folders:', insertError.message);
        console.log('\n💡 Please run the SQL above in Supabase SQL Editor first.');
      } else {
        console.log('✅ Default folders created successfully!');
        console.log('🎉 The Bounced folder is now available for bounce messages!');
      }
      
    } catch (insertErr) {
      console.error('❌ Error inserting folders:', insertErr.message);
    }
    
  } catch (error) {
    console.error('❌ Error creating inbox folders system:', error);
  }
}

checkInboxTables().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});