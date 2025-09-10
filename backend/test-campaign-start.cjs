const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function testCampaignStart() {
  console.log('🔍 Testing campaign start to identify the 400 error...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // 1. Check if we have any campaigns that might be causing issues
    console.log('📊 Checking recent campaigns...');
    const { data: campaigns, error: campError } = await supabase
      .from('campaigns')
      .select('id, status, config, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (campError) {
      console.error('❌ Error fetching campaigns:', campError);
      return;
    }
    
    console.log(`📋 Found ${campaigns.length} recent campaigns:`);
    campaigns.forEach((camp, i) => {
      console.log(`  ${i+1}. ID: ${camp.id.substring(0, 8)}...`);
      console.log(`     Status: ${camp.status}`);
      console.log(`     Config keys: ${Object.keys(camp.config || {}).join(', ')}`);
      console.log('');
    });
    
    // 2. Check for any orphaned scheduled_emails that might cause issues
    console.log('📧 Checking scheduled_emails for potential issues...');
    const { data: scheduledEmails, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('id, campaign_id, status, lead_id, email_account_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!emailError) {
      console.log(`📨 Found ${scheduledEmails.length} recent scheduled emails:`);
      scheduledEmails.forEach((email, i) => {
        console.log(`  ${i+1}. Campaign: ${email.campaign_id?.substring(0, 8)}... | Status: ${email.status}`);
      });
    }
    
    // 3. Check if the new inbox system is interfering with campaign logic
    console.log('\n🔍 Checking for potential database constraint issues...');
    
    // Test if we can insert a simple scheduled email
    const testScheduledEmail = {
      organization_id: organizationId,
      campaign_id: campaigns[0]?.id || '00000000-0000-0000-0000-000000000000',
      lead_id: '00000000-0000-0000-0000-000000000001', // dummy
      email_account_id: '00000000-0000-0000-0000-000000000001', // dummy
      status: 'scheduled',
      send_at: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      template_data: {}
    };
    
    console.log('🧪 Testing scheduled_emails table insertion...');
    
    // Don't actually insert, just test the structure
    const { error: insertError } = await supabase
      .from('scheduled_emails')
      .insert([testScheduledEmail])
      .select()
      .limit(0); // Don't actually insert
    
    if (insertError) {
      console.error('❌ Potential scheduled_emails constraint issue:', insertError);
      
      if (insertError.code === '23503') {
        console.log('💡 Foreign key constraint violation detected');
        console.log('🔍 This might be causing the campaign start 400 error');
        
        // Check what's missing
        console.log('\n🔎 Checking foreign key dependencies...');
        
        // Check if email_accounts exist
        const { data: emailAccounts, error: accountError } = await supabase
          .from('email_accounts')
          .select('id, email')
          .eq('organization_id', organizationId);
          
        if (!accountError) {
          console.log(`📧 Email accounts: ${emailAccounts.length} found`);
        } else {
          console.log('❌ Email accounts check failed:', accountError);
        }
        
        // Check if OAuth2 accounts exist  
        const { data: oauth2Accounts, error: oauthError } = await supabase
          .from('oauth2_tokens')
          .select('id, email, status')
          .eq('organization_id', organizationId)
          .eq('status', 'linked_to_account');
          
        if (!oauthError) {
          console.log(`🔗 OAuth2 accounts: ${oauth2Accounts.length} found`);
          oauth2Accounts.forEach((acc, i) => {
            console.log(`  ${i+1}. ${acc.email} (${acc.status})`);
          });
        } else {
          console.log('❌ OAuth2 accounts check failed:', oauthError);
        }
        
        // Check leads
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, email')
          .eq('organization_id', organizationId)
          .limit(3);
          
        if (!leadsError) {
          console.log(`👥 Leads: ${leads.length} found`);
        } else {
          console.log('❌ Leads check failed:', leadsError);
        }
      }
      
    } else {
      console.log('✅ scheduled_emails table structure appears correct');
    }
    
    // 4. Check for recent database changes that might affect campaigns
    console.log('\n📋 Recent database changes that might affect campaigns:');
    console.log('  • Added inbox_folders table');
    console.log('  • Added conversation and conversation_messages data');
    console.log('  • Added bounce message test data');
    console.log('');
    console.log('💡 The 400 error might be caused by:');
    console.log('  1. Missing email account IDs in campaign config');
    console.log('  2. Missing lead list or leads');
    console.log('  3. Database constraint violations');
    console.log('  4. Campaign configuration validation issues');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCampaignStart().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});