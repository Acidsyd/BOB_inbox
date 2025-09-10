const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function createSimpleBounce() {
  console.log('📧 Creating a simple test bounce message...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // Create a simple bounce conversation (no generated columns)
    console.log('💌 Creating bounce conversation...');
    
    const bounceConversation = {
      organization_id: organizationId,
      subject: 'Delivery Status Notification (Failure)',
      participants: ['mailer-daemon@googlemail.com', 'gianpiero.difelice@gmail.com'],
      conversation_type: 'organic',
      status: 'active',
      message_count: 1,
      unread_count: 1,
      last_activity_at: new Date().toISOString(),
      last_message_preview: 'The following message could not be delivered to g.difelice@wise-w.com',
      message_id_root: `<bounce-${Date.now()}@googlemail.com>`
    };
    
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert([bounceConversation])
      .select()
      .single();
    
    if (convError) {
      console.error('❌ Error creating conversation:', convError);
      return;
    }
    
    console.log('✅ Created bounce conversation:', conversation.id);
    console.log(`📋 Subject: ${conversation.subject}`);
    console.log(`👥 Participants: ${conversation.participants.join(', ')}`);
    
    // Create the bounce message
    console.log('\n📨 Creating bounce message...');
    
    const bounceMessage = {
      conversation_id: conversation.id,
      organization_id: organizationId,
      message_id_header: `<bounce-${Date.now()}@googlemail.com>`,
      from_email: 'mailer-daemon@googlemail.com',
      to_email: 'gianpiero.difelice@gmail.com',
      subject: 'Delivery Status Notification (Failure)',
      content_html: '<p><strong>The following message could not be delivered:</strong></p><p>To: g.difelice@wise-w.com</p><p>Error: Domain does not exist (NXDOMAIN)</p>',
      content_plain: 'The following message could not be delivered to g.difelice@wise-w.com - Domain does not exist',
      content_preview: 'The following message could not be delivered to g.difelice@wise-w.com',
      direction: 'received',
      received_at: new Date().toISOString(),
      is_read: false
    };
    
    const { data: message, error: msgError } = await supabase
      .from('conversation_messages')
      .insert([bounceMessage])
      .select()
      .single();
    
    if (msgError) {
      console.error('❌ Error creating message:', msgError);
      return;
    }
    
    console.log('✅ Created bounce message:', message.id);
    console.log(`📧 From: ${message.from_email}`);
    console.log(`📧 Subject: ${message.subject}`);
    console.log(`📧 Content: ${message.content_preview}`);
    
    // Test the bounce folder filter
    console.log('\n🔍 Testing if message will appear in Bounced folder...');
    
    const { data: allMessages, error: testError } = await supabase
      .from('conversation_messages')
      .select(`
        id, from_email, subject, direction, received_at,
        conversations!inner(organization_id)
      `)
      .eq('conversations.organization_id', organizationId);
    
    if (!testError) {
      // Apply bounce filter
      const bounceMessages = allMessages.filter(msg => {
        const fromMatch = msg.from_email?.toLowerCase().includes('daemon') || 
                         msg.from_email?.toLowerCase().includes('delivery');
        const subjectMatch = msg.subject?.toLowerCase().includes('bounce') ||
                            msg.subject?.toLowerCase().includes('delivery') ||
                            msg.subject?.toLowerCase().includes('undelivered');
        return fromMatch || subjectMatch;
      });
      
      console.log(`🎯 Total messages: ${allMessages.length}`);
      console.log(`📁 Messages matching Bounced folder filter: ${bounceMessages.length}`);
      
      bounceMessages.forEach((msg, i) => {
        console.log(`  ${i+1}. From: ${msg.from_email}`);
        console.log(`     Subject: ${msg.subject}`);
        console.log(`     Direction: ${msg.direction}`);
        console.log('');
      });
      
      if (bounceMessages.length > 0) {
        console.log('🎉 SUCCESS! The bounce message should now appear in your inbox!');
        console.log('\n📱 NEXT STEPS:');
        console.log('1. Go to: http://localhost:3001/inbox');
        console.log('2. Look for the "Bounced" folder in the sidebar');
        console.log('3. Click on "Bounced" to see your bounce messages');
        console.log('4. You should see: "Delivery Status Notification (Failure)"');
        console.log('\n💌 This represents the bounce message you saw in Gmail!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating bounce:', error);
  }
}

createSimpleBounce().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});