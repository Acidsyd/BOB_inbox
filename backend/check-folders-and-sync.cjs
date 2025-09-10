const { createClient } = require('@supabase/supabase-js');
const OAuth2Service = require('./src/services/OAuth2Service');

require('dotenv').config();

async function checkFoldersAndSync() {
  console.log('📁 Checking inbox folders and syncing Gmail bounce messages...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const oauth2Service = new OAuth2Service();
  
  try {
    const organizationId = '3812dc8a-1de0-4e83-ad09-cc9bac26a753';
    
    // 1. Check existing folders
    console.log('📁 Checking existing inbox folders...');
    const { data: folders, error: folderError } = await supabase
      .from('inbox_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('display_order');
    
    if (folderError) {
      console.error('❌ Error fetching folders:', folderError);
    } else {
      console.log(`📂 Found ${folders.length} folders:`);
      folders.forEach((folder, index) => {
        console.log(`  ${index + 1}. ${folder.name} (${folder.type}) - ${folder.description}`);
      });
    }
    
    // 2. Check OAuth2 accounts
    console.log('\n📧 Checking OAuth2 accounts...');
    const { data: accounts, error: accountError } = await supabase
      .from('oauth2_tokens')
      .select('id, email, provider, status')
      .eq('organization_id', organizationId)
      .eq('status', 'linked_to_account');
    
    if (accountError) {
      console.error('❌ Error fetching accounts:', accountError);
      return;
    }
    
    console.log(`📧 Found ${accounts.length} linked accounts:`);
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.email} (${account.provider})`);
    });
    
    // 3. Sync Gmail to get bounce messages
    console.log('\n🔄 Syncing Gmail to import bounce messages...');
    
    for (const account of accounts) {
      if (account.provider === 'google') {
        try {
          console.log(`📬 Syncing Gmail account: ${account.email}`);
          
          // Get Gmail messages that might be bounces
          const messages = await oauth2Service.getGmailMessages(account.id, {
            query: 'from:mailer-daemon OR from:"mail delivery subsystem" OR subject:bounced OR subject:"delivery failed"',
            maxResults: 10
          });
          
          console.log(`📨 Found ${messages.length} potential bounce messages in Gmail`);
          
          if (messages.length > 0) {
            console.log('💌 Recent bounce messages from Gmail:');
            messages.forEach((msg, index) => {
              console.log(`  ${index + 1}. From: ${msg.from || 'Unknown'}`);
              console.log(`     To: ${msg.to || 'Unknown'}`);
              console.log(`     Subject: ${msg.subject || 'No Subject'}`);
              console.log(`     Date: ${msg.date || 'Unknown'}`);
              console.log('');
            });
            
            console.log('💡 These messages should be imported into the Bounced folder.');
            console.log('🔄 The UnifiedInboxService should process these automatically.');
          }
          
        } catch (syncError) {
          console.error(`❌ Error syncing Gmail account ${account.email}:`, syncError.message);
        }
      }
    }
    
    // 4. Check if bounce messages are in conversation_messages
    console.log('\n📋 Checking conversation_messages for bounce content...');
    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('id, from_email, to_email, subject, direction, received_at')
      .eq('organization_id', organizationId)
      .or('from_email.ilike.%daemon%,subject.ilike.%bounce%,subject.ilike.%delivery%,subject.ilike.%undelivered%')
      .order('received_at', { ascending: false })
      .limit(5);
    
    if (!msgError && messages.length > 0) {
      console.log(`💬 Found ${messages.length} bounce-related messages in conversation_messages:`);
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. From: ${msg.from_email}`);
        console.log(`     Subject: ${msg.subject}`);
        console.log(`     Direction: ${msg.direction}`);
        console.log('');
      });
    } else {
      console.log('📭 No bounce messages found in conversation_messages yet.');
      console.log('🔄 Need to trigger Gmail sync to import these messages.');
    }
    
  } catch (error) {
    console.error('❌ Error in folder check and sync:', error);
  }
}

checkFoldersAndSync().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});