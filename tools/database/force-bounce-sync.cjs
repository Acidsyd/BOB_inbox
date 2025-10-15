require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const OAuth2Service = require('./backend/src/services/OAuth2Service');
const UnifiedInboxService = require('./backend/src/services/UnifiedInboxService');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function forceBounceSync() {
  try {
    console.log('🚀 === FORCING BOUNCE MESSAGE SYNC ===');
    
    // Get OAuth2 account
    const { data: accounts, error } = await supabase
      .from('oauth2_tokens')
      .select('email, organization_id')
      .eq('status', 'linked_to_account')
      .limit(1);
      
    if (error || !accounts || accounts.length === 0) {
      console.log('❌ No OAuth2 accounts found');
      return;
    }
    
    const account = accounts[0];
    console.log('📧 Processing account:', account.email);
    console.log('🏢 Organization:', account.organization_id);
    
    // Initialize services
    const oauth2Service = new OAuth2Service();
    const unifiedInboxService = new UnifiedInboxService();
    
    // Get Gmail client
    const gmail = await oauth2Service.getGmailClient(account.email, account.organization_id);
    
    // Search for recent bounce messages specifically
    console.log('🔍 Searching for bounce messages...');
    const bounceQuery = 'from:mailer-daemon OR from:(Mail Delivery Subsystem) newer_than:2d';
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: bounceQuery,
      maxResults: 10
    });
    
    if (!response.data.messages) {
      console.log('❌ No bounce messages found to sync');
      return;
    }
    
    console.log(`📧 Found ${response.data.messages.length} bounce messages to process`);
    
    // Process each bounce message
    for (let i = 0; i < response.data.messages.length; i++) {
      const messageId = response.data.messages[i].id;
      
      console.log(`\n📧 Processing message ${i + 1}/${response.data.messages.length}: ${messageId}`);
      
      try {
        // Get full message details
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full'
        });
        
        const message = messageDetails.data;
        const headers = message.payload.headers || [];
        
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value;
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value;
        
        console.log('  From:', fromHeader);
        console.log('  Subject:', subjectHeader);
        
        // Check if already exists in unified inbox
        const { data: existingMessage } = await supabase
          .from('conversation_messages')
          .select('id')
          .eq('provider_message_id', messageId)
          .eq('organization_id', account.organization_id);
          
        if (existingMessage && existingMessage.length > 0) {
          console.log('  ⚠️  Already exists in unified inbox, skipping...');
          continue;
        }
        
        // Normalize message data (simulate what sync would do)
        const normalizedMessage = {
          providerMessageId: messageId,
          messageIdHeader: headers.find(h => h.name.toLowerCase() === 'message-id')?.value,
          fromEmail: fromHeader,
          toEmail: headers.find(h => h.name.toLowerCase() === 'to')?.value,
          subject: subjectHeader,
          receivedAt: new Date().toISOString(), // Use current time as received
          direction: 'received',
          isRead: false,
          provider: 'gmail'
        };
        
        // Extract message body
        let bodyText = '';
        let bodyHtml = '';
        
        if (message.payload.body && message.payload.body.data) {
          bodyText = Buffer.from(message.payload.body.data, 'base64').toString();
        } else if (message.payload.parts) {
          for (const part of message.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
              bodyText += Buffer.from(part.body.data, 'base64').toString();
            } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
              bodyHtml += Buffer.from(part.body.data, 'base64').toString();
            }
          }
        }
        
        normalizedMessage.contentPlain = bodyText;
        normalizedMessage.contentHtml = bodyHtml || bodyText;
        normalizedMessage.contentPreview = bodyText.substring(0, 200);
        
        // Process through unified inbox service
        console.log('  📦 Adding to unified inbox...');
        const result = await unifiedInboxService.addEmailToInbox(normalizedMessage, account.organization_id);
        
        if (result.conversationId) {
          console.log('  ✅ Added to conversation:', result.conversationId);
          
          // Check if this is a bounce message that should be processed
          if (fromHeader && fromHeader.includes('mailer-daemon')) {
            console.log('  🏀 Processing as bounce message...');
            // The UnifiedInboxService should automatically detect and process bounces
          }
        } else {
          console.log('  ❌ Failed to add to unified inbox');
        }
        
      } catch (messageError) {
        console.error(`  ❌ Error processing message ${messageId}:`, messageError.message);
      }
    }
    
    console.log('\n✅ Bounce sync completed!');
    
    // Check results
    const { data: newMessages } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('organization_id', account.organization_id)
      .eq('direction', 'received')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });
      
    console.log(`\n📊 Result: ${newMessages?.length || 0} new messages added to unified inbox`);
    
    if (newMessages && newMessages.length > 0) {
      console.log('\n📧 New messages:');
      newMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.from_email} - ${msg.subject}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Force bounce sync failed:', error.message);
    console.error(error.stack);
  }
}

forceBounceSync();