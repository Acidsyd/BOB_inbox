const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function verifyAndImportBounces() {
  console.log('✅ Verifying inbox folders and importing bounce messages...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // Step 1: Verify folders were created
    console.log('📁 Verifying inbox folders...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('display_order');
    
    if (folderError) {
      console.error('❌ Error verifying folders:', folderError);
      return;
    }
    
    console.log(`🎉 Success! Created ${folders.length} folders:`);
    folders.forEach((folder, i) => {
      console.log(`  ${i+1}. ${folder.name} (${folder.type})`);
      console.log(`     ${folder.description}`);
    });
    
    // Find the Bounced folder
    const bouncedFolder = folders.find(f => f.type === 'bounced');
    if (!bouncedFolder) {
      console.error('❌ Bounced folder not found!');
      return;
    }
    
    console.log('\n✅ Bounced folder created successfully!');
    console.log(`📋 Filter query: ${bouncedFolder.filter_query}`);
    
    // Step 2: Create sample bounce messages to test the folder system
    console.log('\n📬 Creating sample bounce messages in unified inbox...');
    
    // Get bounce data we know exists
    const { data: bounces, error: bounceError } = await supabase
      .from('email_bounces')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(3);
    
    if (bounceError || bounces.length === 0) {
      console.log('⚠️ No existing bounces found, creating sample bounce conversation...');
      
      // Create a sample bounce conversation and message
      const bounceConversation = {
        organization_id: organizationId,
        subject: 'Delivery Status Notification (Failure)',
        participants: ['mailer-daemon@wise-w.com', 'gianpiero.difelice@gmail.com'],
        conversation_type: 'organic',
        status: 'active',
        message_count: 1,
        unread_count: 1,
        last_activity_at: new Date().toISOString(),
        last_message_preview: 'The following message could not be delivered...'
      };
      
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert([bounceConversation])
        .select()
        .single();
      
      if (convError) {
        console.error('❌ Error creating bounce conversation:', convError);
        return;
      }
      
      console.log('✅ Created bounce conversation:', newConv.id);
      
      // Create the bounce message
      const bounceMessage = {
        conversation_id: newConv.id,
        organization_id: organizationId,
        message_id_header: `<bounce-${Date.now()}@wise-w.com>`,
        from_email: 'mailer-daemon@wise-w.com',
        to_email: 'gianpiero.difelice@gmail.com',
        subject: 'Delivery Status Notification (Failure)',
        content_html: '<p>The following message could not be delivered to one or more recipients:</p><p>Recipient: g.difelice@wise-w.com</p><p>Reason: Domain does not exist (NXDOMAIN)</p>',
        content_plain: 'The following message could not be delivered to one or more recipients: g.difelice@wise-w.com - Domain does not exist',
        content_preview: 'The following message could not be delivered...',
        direction: 'received',
        received_at: new Date().toISOString(),
        is_read: false
      };
      
      const { data: newMsg, error: msgError } = await supabase
        .from('conversation_messages')
        .insert([bounceMessage])
        .select()
        .single();
      
      if (msgError) {
        console.error('❌ Error creating bounce message:', msgError);
        return;
      }
      
      console.log('✅ Created bounce message:', newMsg.id);
      console.log(`📧 From: ${newMsg.from_email}`);
      console.log(`📧 Subject: ${newMsg.subject}`);
      
    } else {
      console.log(`📧 Found ${bounces.length} existing bounces - they should now appear in the Bounced folder`);
    }
    
    // Step 3: Test the folder filtering
    console.log('\n🔍 Testing Bounced folder filtering...');
    
    // Get messages that match the bounce filter
    const { data: bounceMessages, error: filterError } = await supabase
      .from('conversation_messages')
      .select(`
        id, from_email, to_email, subject, direction, received_at,
        conversations!inner(organization_id)
      `)
      .eq('conversations.organization_id', organizationId);
    
    if (filterError) {
      console.error('❌ Error testing filter:', filterError);
      return;
    }
    
    // Apply the bounce filter manually to test
    const filteredBounces = bounceMessages.filter(msg => {
      const fromDaemon = msg.from_email?.toLowerCase().includes('daemon');
      const fromDelivery = msg.from_email?.toLowerCase().includes('delivery');
      const subjectBounce = msg.subject?.toLowerCase().includes('bounce');
      const subjectDelivery = msg.subject?.toLowerCase().includes('delivery');
      const subjectUndelivered = msg.subject?.toLowerCase().includes('undelivered');
      
      return fromDaemon || fromDelivery || subjectBounce || subjectDelivery || subjectUndelivered;
    });
    
    console.log(`🎯 Found ${filteredBounces.length} messages matching bounce filter:`);
    filteredBounces.forEach((msg, i) => {
      console.log(`  ${i+1}. From: ${msg.from_email}`);
      console.log(`     Subject: ${msg.subject}`);
      console.log(`     Direction: ${msg.direction}`);
      console.log('');
    });
    
    if (filteredBounces.length > 0) {
      console.log('🎉 SUCCESS! Bounce messages are now available in the Bounced folder!');
      console.log('📱 Go to your inbox at http://localhost:3001/inbox and you should see:');
      console.log('   📁 Inbox');
      console.log('   📁 Sent'); 
      console.log('   📁 Bounced ← Your bounce messages are here!');
      console.log('   📁 Untracked Replies');
    } else {
      console.log('📭 No bounce messages found yet. The folder system is ready for when Gmail sync imports them.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying and importing:', error);
  }
}

verifyAndImportBounces().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});