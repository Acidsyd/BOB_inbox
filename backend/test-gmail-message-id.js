require('dotenv').config();
const OAuth2Service = require('./src/services/OAuth2Service');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testGmailMessageId() {
  console.log('🧪 Testing Gmail Message ID format...');
  
  const oauth2Service = new OAuth2Service();
  
  try {
    // Send a test email
    console.log('📧 Sending test email via Gmail API...');
    const result = await oauth2Service.sendEmail({
      fromEmail: 'gianpiero@wise-glow.com',
      toEmail: 'gianpiero@wise-glow.com', // Send to self for testing
      subject: 'TEST: Reply tracking message ID format',
      htmlBody: 'This is a test email to verify Message-ID format for reply tracking. Please reply to this email.',
      organizationId: '550e8400-e29b-41d4-a716-446655440000'
    });
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📧 Gmail returned Message ID:', result.messageId);
      
      // Now let's check what the actual Message-ID header looks like
      // by fetching the message from Gmail API
      console.log('🔍 Fetching message from Gmail to check headers...');
      
      const gmail = await oauth2Service.getGmailClient('gianpiero@wise-glow.com', '550e8400-e29b-41d4-a716-446655440000');
      if (gmail) {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: result.messageId,
          format: 'full'
        });
        
        const headers = messageData.data.payload.headers;
        const messageIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id')?.value;
        
        console.log('📧 Actual Message-ID header:', messageIdHeader);
        console.log('🔍 Gmail API returned ID:', result.messageId);
        console.log('📊 Comparison:');
        console.log('  - Does header contain Gmail ID?', messageIdHeader?.includes(result.messageId) ? '✅ YES' : '❌ NO');
        console.log('  - Header format:', messageIdHeader);
        console.log('  - Gmail ID format:', result.messageId);
        
        // Test what we should be looking for in replies
        console.log('🎯 For reply tracking, we should look for:');
        console.log('  1. Raw Gmail ID:', result.messageId);
        console.log('  2. Full Message-ID:', messageIdHeader);
        console.log('  3. Gmail mail format: <' + result.messageId + '@mail.gmail.com>');
        
      } else {
        console.error('❌ Could not get Gmail client');
      }
      
    } else {
      console.error('❌ Failed to send email:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGmailMessageId();