require('dotenv').config();
const OAuth2Service = require('./src/services/OAuth2Service');

async function sendTestForReply() {
  console.log('📧 Sending test email specifically for reply testing...');
  
  const oauth2Service = new OAuth2Service();
  
  try {
    const result = await oauth2Service.sendEmail({
      fromEmail: 'gianpiero@wise-glow.com',
      toEmail: 'gianpiero@wise-glow.com',
      subject: 'REPLY TEST: Please reply to this message',
      htmlBody: `
        <h2>🧪 Reply Detection Test</h2>
        <p>This is a test email for the reply tracking system.</p>
        <p><strong>PLEASE REPLY TO THIS EMAIL</strong> to test the reply detection functionality.</p>
        <p>When you reply, the system should detect it and store the reply in the database.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
      organizationId: '550e8400-e29b-41d4-a716-446655440000'
    });
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📬 Gmail API Message ID:', result.messageId);
      console.log('📧 Actual Message-ID Header:', result.actualMessageId);
      console.log('');
      console.log('🎯 TO TEST REPLY DETECTION:');
      console.log('1. Check your Gmail inbox for the test email');
      console.log('2. Reply to the email with any message');
      console.log('3. Wait for the reply monitoring service to run (every 15 minutes)');
      console.log('4. Check the email_replies table for the detected reply');
      console.log('');
      console.log('📊 Expected reply detection:');
      console.log(`   - Looking for Message-ID: ${result.actualMessageId || result.messageId}`);
      console.log(`   - Fallback Gmail API ID: ${result.messageId}`);
    } else {
      console.error('❌ Failed to send test email:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

sendTestForReply();