require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

  console.log('🔧 Restoring campaign configuration...\n');

  // First, let's get the available options
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  console.log('📋 Current Campaign:', campaign.name);
  console.log('🏢 Organization ID:', campaign.organization_id);
  console.log('\n📋 Current Config:', JSON.stringify(campaign.config, null, 2));

  // Get lead lists
  const { data: leadLists } = await supabase
    .from('lead_lists')
    .select('id, name, lead_count')
    .eq('organization_id', campaign.organization_id)
    .order('created_at', { ascending: false });

  console.log('\n📝 Available Lead Lists:');
  leadLists?.forEach((list, idx) => {
    console.log(`  ${idx + 1}. ${list.name} (ID: ${list.id}, Count: ${list.lead_count})`);
  });

  // Get email accounts
  const { data: accounts } = await supabase
    .from('oauth2_tokens')
    .select('id, email')
    .eq('organization_id', campaign.organization_id)
    .eq('status', 'linked_to_account');

  console.log('\n📧 Available Email Accounts:');
  accounts?.forEach((acc, idx) => {
    console.log(`  ${idx + 1}. ${acc.email} (ID: ${acc.id})`);
  });

  console.log('\n\n🔧 To restore the campaign, please provide:');
  console.log('1. Which lead list ID to use? (copy from above)');
  console.log('2. Which email account IDs to use? (comma-separated, copy from above)');
  console.log('3. What should the email subject be?');
  console.log('4. What should the email content be?');
  console.log('\nOnce you provide these, I\'ll create a script to restore the configuration.');
})();
