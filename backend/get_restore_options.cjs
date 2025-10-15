require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  console.log('📋 Campaign:', campaign.name);
  console.log('🏢 Organization ID:', campaign.organization_id);
  console.log('📧 Current Subject:', campaign.config?.emailSubject || 'MISSING');
  console.log('');

  // Get all lead lists for this organization
  const { data: leadLists } = await supabase
    .from('lead_lists')
    .select('id, name, lead_count, created_at')
    .eq('organization_id', campaign.organization_id)
    .order('created_at', { ascending: false });

  console.log('📝 Available Lead Lists:');
  leadLists?.forEach((list, idx) => {
    console.log(`  ${idx + 1}. ${list.name} (ID: ${list.id}, Count: ${list.lead_count})`);
  });
  console.log('');

  // Get all email accounts
  const { data: accounts } = await supabase
    .from('oauth2_tokens')
    .select('id, email')
    .eq('organization_id', campaign.organization_id)
    .eq('status', 'linked_to_account');

  console.log('📧 Available Email Accounts:');
  accounts?.forEach((acc, idx) => {
    console.log(`  ${idx + 1}. ${acc.email} (ID: ${acc.id})`);
  });
})();
