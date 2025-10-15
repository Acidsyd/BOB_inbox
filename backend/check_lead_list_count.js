const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

async function checkLeadListCount() {
  // Get campaign config
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', CAMPAIGN_ID)
    .single();

  const leadListId = campaign.config.leadListId;

  console.log('Lead List Analysis');
  console.log('='.repeat(80));
  console.log(`Lead List ID: ${leadListId}\n`);

  // Count total leads
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', leadListId);

  console.log(`Total leads in list: ${totalLeads}`);

  // Check how many initial emails exist
  const { count: initialEmailCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', false);

  console.log(`Initial emails created: ${initialEmailCount}`);
  console.log(`Missing initial emails: ${totalLeads - initialEmailCount}`);

  // Check how many follow-ups exist
  const { count: followupCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', true);

  console.log(`Follow-ups created: ${followupCount}`);
  console.log(`Missing follow-ups: ${totalLeads - followupCount}`);
  console.log('');

  console.log('Summary:');
  console.log(`Total leads: ${totalLeads}`);
  console.log(`Expected emails (with 1 follow-up): ${totalLeads * 2}`);
  console.log(`Actual emails: ${initialEmailCount + followupCount}`);
  console.log(`Missing emails: ${(totalLeads * 2) - (initialEmailCount + followupCount)}`);
}

checkLeadListCount().catch(console.error);
