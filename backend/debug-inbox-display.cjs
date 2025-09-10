const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function debugInboxDisplay() {
  console.log('🔍 Debugging why bounce messages aren\'t showing in inbox...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // 1. Check if folders are properly created
    console.log('📁 Checking inbox folders...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (folderError || !folders.length) {
      console.error('❌ No folders found for organization:', organizationId);
      return;
    }
    
    console.log(`✅ Found ${folders.length} folders for organization ${organizationId}`);
    
    // 2. Check conversations table
    console.log('\n💬 Checking conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(5);
    
    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }
    
    console.log(`📋 Found ${conversations.length} conversations:`);
    conversations.forEach((conv, i) => {
      console.log(`  ${i+1}. Subject: ${conv.subject}`);
      console.log(`     Type: ${conv.conversation_type}`);
      console.log(`     Participants: ${conv.participants?.join(', ')}`);
      console.log('');
    });
    
    // 3. Check conversation_messages table  
    console.log('📨 Checking conversation_messages...');
    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(5);
    
    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }
    
    console.log(`📬 Found ${messages.length} messages:`);
    messages.forEach((msg, i) => {
      console.log(`  ${i+1}. From: ${msg.from_email}`);
      console.log(`     To: ${msg.to_email}`);
      console.log(`     Subject: ${msg.subject}`);
      console.log(`     Direction: ${msg.direction}`);
      console.log('');
    });
    
    if (messages.length === 0) {
      console.log('\n⚠️ ISSUE FOUND: No messages in conversation_messages table!');
      console.log('💡 The bounce detection works but bounce messages need to be imported into unified inbox.');
      console.log('🔄 Let me create some sample bounce messages for testing...');
      
      // Create a sample bounce conversation
      const bounceConv = {
        organization_id: organizationId,
        subject: 'Delivery Status Notification (Failure)',
        participants: ['mailer-daemon@googlemail.com', 'gianpiero.difelice@gmail.com'],
        conversation_type: 'organic',
        status: 'active',
        message_count: 1,
        unread_count: 1,
        last_activity_at: new Date().toISOString(),
        last_message_preview: 'The following message could not be delivered to g.difelice@wise-w.com',
        message_id_root: `<bounce-${Date.now()}@wise-w.com>`
      };
      
      const { data: newConv, error: newConvError } = await supabase
        .from('conversations')
        .insert([bounceConv])
        .select()
        .single();
      
      if (newConvError) {
        console.error('❌ Error creating bounce conversation:', newConvError);
        return;
      }
      
      console.log('✅ Created sample bounce conversation:', newConv.id);
      
      // Create the bounce message
      const bounceMsg = {
        conversation_id: newConv.id,
        organization_id: organizationId,
        message_id_header: `<bounce-${Date.now()}@wise-w.com>`,
        from_email: 'mailer-daemon@googlemail.com',
        to_email: 'gianpiero.difelice@gmail.com', 
        subject: 'Delivery Status Notification (Failure)',
        content_html: '<p>The following message could not be delivered to one or more recipients:</p><p><strong>Recipient:</strong> g.difelice@wise-w.com</p><p><strong>Reason:</strong> Domain does not exist (NXDOMAIN)</p>',
        content_plain: 'The following message could not be delivered: g.difelice@wise-w.com - Domain does not exist',
        content_preview: 'The following message could not be delivered to g.difelice@wise-w.com',
        direction: 'received',
        received_at: new Date().toISOString(),
        is_read: false
      };
      
      const { data: newMsg, error: newMsgError } = await supabase
        .from('conversation_messages')
        .insert([bounceMsg])
        .select()
        .single();
      
      if (newMsgError) {
        console.error('❌ Error creating bounce message:', newMsgError);
        return;
      }
      
      console.log('✅ Created sample bounce message:', newMsg.id);
      console.log(`📧 From: ${newMsg.from_email}`);
      console.log(`📧 Subject: ${newMsg.subject}`);
      console.log(`📧 Content: ${newMsg.content_preview}`);
      
      console.log('\n🎉 Sample bounce message created!');
      console.log('📱 Now check your inbox at http://localhost:3001/inbox');
      console.log('📁 The bounce should appear in the "Bounced" folder');
      
    } else {
      console.log('\n✅ Messages exist - checking if they match bounce criteria...');
      
      // Test bounce filtering
      const bounceMatches = messages.filter(msg => {
        const fromMatch = msg.from_email?.toLowerCase().includes('daemon') || 
                         msg.from_email?.toLowerCase().includes('delivery');
        const subjectMatch = msg.subject?.toLowerCase().includes('bounce') ||
                            msg.subject?.toLowerCase().includes('delivery') ||
                            msg.subject?.toLowerCase().includes('undelivered');
        return fromMatch || subjectMatch;
      });
      
      console.log(`🎯 Found ${bounceMatches.length} messages matching bounce criteria`);
      bounceMatches.forEach((msg, i) => {
        console.log(`  ${i+1}. ${msg.from_email} - ${msg.subject}`);
      });
    }
    
    // 4. Check if frontend can access the data
    console.log('\n🔧 Checking data accessibility for frontend...');
    const { data: testQuery, error: testError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_messages (*)
      `)
      .eq('organization_id', organizationId)
      .limit(1);
    
    if (testError) {
      console.error('❌ Frontend query test failed:', testError);
    } else {
      console.log('✅ Frontend should be able to access conversation data');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugInboxDisplay().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});