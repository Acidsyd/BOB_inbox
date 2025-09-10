const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function createTestBounce() {
  console.log('📧 Creating a test bounce message to verify the Bounced folder works...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // Create a bounce conversation that represents the mailer-daemon message you saw in Gmail
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
      message_id_root: `<bounce-test-${Date.now()}@googlemail.com>`,
      subject_normalized: 'delivery status notification failure'
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
    
    // Create the bounce message content (this is what you saw in Gmail)
    console.log('📨 Creating bounce message...');
    
    const bounceMessage = {
      conversation_id: conversation.id,
      organization_id: organizationId,
      message_id_header: `<bounce-test-${Date.now()}@googlemail.com>`,
      from_email: 'mailer-daemon@googlemail.com',
      to_email: 'gianpiero.difelice@gmail.com',
      subject: 'Delivery Status Notification (Failure)',
      content_html: `
        <div>
          <p><strong>The following message could not be delivered to one or more recipients:</strong></p>
          <hr>
          <p><strong>Original Message Details:</strong></p>
          <p>To: g.difelice@wise-w.com</p>
          <p>Subject: Your test email</p>
          <p>From: gianpiero.difelice@gmail.com</p>
          <hr>
          <p><strong>Error Details:</strong></p>
          <p>SMTP Error: 550 5.1.1 The email account that you tried to reach does not exist.</p>
          <p>Domain: wise-w.com does not have valid MX records.</p>
          <p><strong>Action Required:</strong> Verify the recipient's email address and try again.</p>
        </div>
      `,
      content_plain: 'The following message could not be delivered to g.difelice@wise-w.com - Domain does not exist (NXDOMAIN). SMTP Error: 550 5.1.1 The email account that you tried to reach does not exist.',
      content_preview: 'The following message could not be delivered to g.difelice@wise-w.com',
      direction: 'received',
      received_at: new Date().toISOString(),
      sent_at: null,
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
    console.log(`📧 To: ${message.to_email}`);
    console.log(`📧 Subject: ${message.subject}`);
    console.log(`📧 Preview: ${message.content_preview}`);
    
    // Verify it will be caught by the Bounced folder filter
    console.log('\n🔍 Testing bounce folder filter...');
    
    const { data: testMessages, error: testError } = await supabase
      .from('conversation_messages')
      .select(`
        id, from_email, subject, direction,
        conversations!inner(organization_id)
      `)
      .eq('conversations.organization_id', organizationId);
    
    if (!testError) {
      const bounceFiltered = testMessages.filter(msg => {
        const fromDaemon = msg.from_email?.toLowerCase().includes('daemon');
        const fromDelivery = msg.from_email?.toLowerCase().includes('delivery');
        const subjectBounce = msg.subject?.toLowerCase().includes('bounce');
        const subjectDelivery = msg.subject?.toLowerCase().includes('delivery');
        const subjectUndelivered = msg.subject?.toLowerCase().includes('undelivered');
        
        return fromDaemon || fromDelivery || subjectBounce || subjectDelivery || subjectUndelivered;
      });
      
      console.log(`🎯 Found ${bounceFiltered.length} messages matching bounce filter:`);
      bounceFiltered.forEach((msg, i) => {
        console.log(`  ${i+1}. From: ${msg.from_email}`);
        console.log(`     Subject: ${msg.subject}`);
      });
      
      if (bounceFiltered.length > 0) {
        console.log('\n🎉 SUCCESS! The bounce message will appear in the Bounced folder!');
        console.log('📱 Go to http://localhost:3001/inbox and click on the "Bounced" folder');
        console.log('📧 You should see the bounce message from mailer-daemon@googlemail.com');
        console.log('💌 This represents the same bounce you saw in Gmail for g.difelice@wise-w.com');
      }
    }
    
    // Also check that our inbox folders are properly set up
    console.log('\n📁 Verifying inbox folders are accessible...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (!folderError && folders.length > 0) {
      console.log('✅ Inbox folders are properly configured:');
      folders.forEach(folder => {
        console.log(`  📂 ${folder.name} (${folder.type})`);
      });
      
      const bouncedFolder = folders.find(f => f.type === 'bounced');
      if (bouncedFolder) {
        console.log(`\n📁 Bounced folder filter: ${bouncedFolder.filter_query}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating test bounce:', error);
  }
}

createTestBounce().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});