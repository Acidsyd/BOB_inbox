const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function checkFoldersSimple() {
  console.log('📁 Checking inbox folders...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const organizationId = '3812dc8a-1de0-4e83-ad09-cc9bac26a753';
    
    // Check existing folders
    console.log('📁 Checking existing inbox folders...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('display_order');
    
    if (folderError) {
      console.error('❌ Error fetching folders:', folderError);
      return;
    }
    
    console.log(`📂 Found ${folders.length} folders:`);
    folders.forEach((folder, index) => {
      console.log(`  ${index + 1}. ${folder.name} (${folder.type})`);
      console.log(`     Description: ${folder.description}`);
      console.log(`     Query: ${folder.filter_query || 'None'}`);
      console.log('');
    });
    
    // Check if Bounced folder exists
    const bouncedFolder = folders.find(f => f.type === 'bounced' || f.name.toLowerCase().includes('bounce'));
    
    if (bouncedFolder) {
      console.log('✅ Bounced folder exists!');
      console.log(`📋 Folder details:`);
      console.log(`   Name: ${bouncedFolder.name}`);
      console.log(`   Type: ${bouncedFolder.type}`);
      console.log(`   Filter: ${bouncedFolder.filter_query}`);
      
      // Check messages in bounced folder
      const { data: folderMessages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('id, from_email, subject, received_at, direction')
        .eq('organization_id', organizationId);
      
      if (!msgError) {
        // Filter messages that would match bounce criteria
        const bounceMessages = folderMessages.filter(msg => 
          msg.from_email?.includes('daemon') ||
          msg.from_email?.includes('delivery') ||
          msg.subject?.toLowerCase().includes('bounce') ||
          msg.subject?.toLowerCase().includes('delivery') ||
          msg.subject?.toLowerCase().includes('undelivered')
        );
        
        console.log(`\n💌 Messages matching bounce criteria: ${bounceMessages.length}`);
        bounceMessages.forEach((msg, index) => {
          console.log(`  ${index + 1}. From: ${msg.from_email}`);
          console.log(`     Subject: ${msg.subject}`);
          console.log(`     Direction: ${msg.direction}`);
          console.log('');
        });
      }
      
    } else {
      console.log('❌ No Bounced folder found!');
      console.log('💡 You need to create the Bounced folder first.');
    }
    
    // Check total conversation messages
    const { data: allMessages, error: allError } = await supabase
      .from('conversation_messages')
      .select('id')
      .eq('organization_id', organizationId);
    
    if (!allError) {
      console.log(`📊 Total conversation messages in system: ${allMessages.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking folders:', error);
  }
}

checkFoldersSimple().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});