const EmailSyncService = require('./src/services/EmailSyncService');

require('dotenv').config();

async function triggerGmailSync() {
  console.log('🔄 Manually triggering Gmail sync to import bounce messages...');
  
  const emailSyncService = new EmailSyncService();
  
  try {
    // Get user's organization ID (using the one from the JWT token)
    const organizationId = '3812dc8a-1de0-4e83-ad09-cc9bac26a753';
    
    console.log(`📧 Syncing emails for organization: ${organizationId}`);
    
    // Trigger sync for all accounts in the organization
    const syncResults = [];
    
    // Get all OAuth2 accounts for the organization
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { data: accounts, error } = await supabase
      .from('oauth2_tokens')
      .select('id, email, provider')
      .eq('organization_id', organizationId)
      .eq('status', 'linked_to_account');
    
    if (error) {
      console.error('❌ Error fetching accounts:', error);
      return;
    }
    
    console.log(`📧 Found ${accounts.length} linked accounts to sync`);
    
    for (const account of accounts) {
      try {
        console.log(`🔄 Syncing account: ${account.email} (${account.provider})`);
        const result = await emailSyncService.syncAccount(account.id, organizationId);
        
        syncResults.push({
          accountId: account.id,
          email: account.email,
          success: true,
          ...result
        });
        
        console.log(`✅ Sync completed for ${account.email}:`, result);
      } catch (syncError) {
        console.error(`⚠️ Sync failed for account ${account.email}:`, syncError.message);
        syncResults.push({
          accountId: account.id,
          email: account.email,
          success: false,
          error: syncError.message
        });
      }
    }
    
    console.log('🎉 Gmail sync completed! Check your unified inbox for bounce messages.');
    console.log('📊 Sync Results Summary:');
    syncResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.email}: ${result.success ? '✅ Success' : '❌ Failed'}`);
      if (result.success && result.newMessages) {
        console.log(`     📬 New messages: ${result.newMessages}`);
      }
      if (!result.success) {
        console.log(`     ⚠️ Error: ${result.error}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Manual Gmail sync failed:', error);
  }
}

triggerGmailSync().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});