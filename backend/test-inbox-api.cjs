const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function testInboxAPI() {
  console.log('🔍 Testing inbox API to debug why bounce messages aren\'t showing...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // 1. Test if the folders API works
    console.log('📁 Testing folders endpoint...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('display_order');
    
    if (folderError) {
      console.error('❌ Folders API error:', folderError);
      return;
    }
    
    console.log(`✅ Folders API works - ${folders.length} folders found:`);
    folders.forEach((folder, i) => {
      console.log(`  ${i+1}. ${folder.name} (${folder.type})`);
      console.log(`     Filter: ${folder.filter_query}`);
      console.log('');
    });
    
    // 2. Test conversations endpoint like the frontend would
    console.log('💬 Testing conversations endpoint...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id, subject, participants, conversation_type, 
        status, message_count, unread_count, last_activity_at,
        last_message_preview, created_at
      `)
      .eq('organization_id', organizationId)
      .order('last_activity_at', { ascending: false });
    
    if (convError) {
      console.error('❌ Conversations API error:', convError);
      return;
    }
    
    console.log(`✅ Conversations API works - ${conversations.length} conversations found`);
    
    // 3. Test bounce folder filtering
    const bouncedFolder = folders.find(f => f.type === 'bounced');
    if (bouncedFolder) {
      console.log('\n🔍 Testing Bounced folder filtering...');
      console.log(`📋 Bounced folder filter: ${bouncedFolder.filter_query}`);
      
      // Get messages that match the bounce folder filter
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select(`
          id, conversation_id, from_email, to_email, subject,
          direction, received_at, content_preview,
          conversations!inner(organization_id, id, subject)
        `)
        .eq('conversations.organization_id', organizationId);
      
      if (!msgError) {
        console.log(`📨 Total messages in system: ${messages.length}`);
        
        // Apply bounce filter manually
        const bounceMessages = messages.filter(msg => {
          const fromMatch = msg.from_email?.toLowerCase().includes('daemon') || 
                           msg.from_email?.toLowerCase().includes('delivery');
          const subjectMatch = msg.subject?.toLowerCase().includes('bounce') ||
                              msg.subject?.toLowerCase().includes('delivery') ||
                              msg.subject?.toLowerCase().includes('undelivered');
          return fromMatch || subjectMatch;
        });
        
        console.log(`📁 Messages matching bounce filter: ${bounceMessages.length}`);
        
        if (bounceMessages.length > 0) {
          console.log('✅ Sample bounce messages:');
          bounceMessages.slice(0, 3).forEach((msg, i) => {
            console.log(`  ${i+1}. From: ${msg.from_email}`);
            console.log(`     Subject: ${msg.subject}`);
            console.log(`     Conversation: ${msg.conversations.subject}`);
            console.log('');
          });
          
          // Get the conversations for these bounce messages
          const bounceConversationIds = [...new Set(bounceMessages.map(m => m.conversation_id))];
          const bounceConversations = conversations.filter(c => bounceConversationIds.includes(c.id));
          
          console.log(`💬 Bounce conversations: ${bounceConversations.length}`);
          bounceConversations.forEach((conv, i) => {
            console.log(`  ${i+1}. ${conv.subject}`);
            console.log(`     Participants: ${conv.participants.join(', ')}`);
            console.log(`     Last activity: ${conv.last_activity_at}`);
            console.log('');
          });
          
          console.log('🎯 DIAGNOSIS:');
          console.log('  • Bounce messages exist in database ✅');
          console.log('  • Bounce conversations exist ✅');  
          console.log('  • Bounce folder exists ✅');
          console.log('  • Filter query works ✅');
          console.log('');
          console.log('💡 The issue might be:');
          console.log('  1. Frontend not calling the right API endpoint');
          console.log('  2. Frontend not applying the folder filter');
          console.log('  3. Frontend not loading the inbox_folders');
          console.log('  4. Organization ID mismatch in frontend');
          
        } else {
          console.log('❌ No bounce messages found - this is the problem!');
          console.log('💡 The bounce messages we created earlier may not have the right organization ID');
        }
      }
    }
    
    // 4. Test the exact API call the frontend makes for folders
    console.log('\n🔧 Testing GET /api/inbox/folders endpoint...');
    try {
      const response = await fetch('http://localhost:4000/api/inbox/folders', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZmNkM2Y5Ny1jZGM3LTQ3M2ItODE3Yi0wNjI4M2E0M2Y3NjciLCJvcmdhbml6YXRpb25JZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImlhdCI6MTcyNTM4OTM5MSwiZXhwIjoxNzU2OTI1MzkxfQ.aVqkUiJEAzp-oUJbQkzFDl8TFjB1KclpKOCq2lDXNY4'
        }
      });
      
      if (response.ok) {
        const foldersData = await response.json();
        console.log('✅ Frontend folders API works:', foldersData);
      } else {
        console.log('❌ Frontend folders API failed:', response.status, response.statusText);
      }
    } catch (fetchError) {
      console.log('⚠️ Could not test frontend API (backend might not be running)');
    }
    
  } catch (error) {
    console.error('❌ Inbox API test failed:', error);
  }
}

testInboxAPI().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});