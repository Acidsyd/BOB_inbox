require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

  console.log('🔍 Debugging Campaign:', campaignId);
  console.log('=' .repeat(60));

  // Check campaign configuration
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    console.error('❌ Error fetching campaign:', campaignError.message);
    return;
  }

  console.log('\n📊 CAMPAIGN DATA:');
  console.log('  Status:', campaign?.status);
  console.log('  Name:', campaign?.name);
  console.log('  Organization ID:', campaign?.organization_id);
  console.log('  Lead List ID:', campaign?.config?.leadListId);
  console.log('  Email Accounts:', campaign?.config?.emailAccounts?.length || 0);
  console.log('  Full config:', JSON.stringify(campaign?.config, null, 2));

  if (!campaign?.config?.leadListId) {
    console.error('\n❌ PROBLEM: No lead list configured!');
    return;
  }

  // Check lead list
  const { data: leadList, error: listError } = await supabase
    .from('lead_lists')
    .select('*')
    .eq('id', campaign.config.leadListId)
    .single();

  console.log('\n📋 LEAD LIST DATA:');
  if (listError) {
    console.error('  ❌ Error:', listError.message);
  } else {
    console.log('  Name:', leadList?.name);
    console.log('  Lead Count:', leadList?.lead_count);
  }

  // Check leads with different filters
  console.log('\n👥 LEADS CHECK:');

  // All leads for this list
  const { data: allLeads, error: allError } = await supabase
    .from('leads')
    .select('id, email, status')
    .eq('lead_list_id', campaign.config.leadListId)
    .eq('organization_id', campaign.organization_id)
    .limit(10);

  console.log('  Total leads (first 10):', allLeads?.length || 0);
  if (allLeads && allLeads.length > 0) {
    console.log('  Lead statuses:', allLeads.map(l => `${l.email}: ${l.status}`).join('\n    '));
  }

  // Active leads only
  const { data: activeLeads, error: activeError } = await supabase
    .from('leads')
    .select('id, email, status')
    .eq('lead_list_id', campaign.config.leadListId)
    .eq('organization_id', campaign.organization_id)
    .eq('status', 'active')
    .limit(10);

  console.log('  Active leads only:', activeLeads?.length || 0);

  // Get count of all leads
  const { count: totalCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', campaign.config.leadListId)
    .eq('organization_id', campaign.organization_id);

  const { count: activeCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', campaign.config.leadListId)
    .eq('organization_id', campaign.organization_id)
    .eq('status', 'active');

  console.log('\n📊 LEAD COUNTS:');
  console.log('  Total leads:', totalCount);
  console.log('  Active leads:', activeCount);

  // Check scheduled emails
  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled');

  const { count: skippedCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'skipped');

  console.log('\n📧 SCHEDULED EMAILS:');
  console.log('  Scheduled:', scheduledCount);
  console.log('  Skipped:', skippedCount);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Debug complete!');
})();
