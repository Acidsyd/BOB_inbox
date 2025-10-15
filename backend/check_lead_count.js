const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkLeadCount() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

  console.log('\n=== Investigating Lead Count Discrepancy ===\n');

  // Get campaign's lead list ID
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('config, organization_id')
    .eq('id', campaignId)
    .single();

  const leadListId = campaign.config.leadListId;
  const orgId = campaign.organization_id;

  console.log('Campaign Lead List ID:', leadListId);
  console.log('Organization ID:', orgId);

  // Get total leads in the list
  const { count: totalLeads, error: leadError } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('lead_list_id', leadListId);

  if (leadError) {
    console.error('Error counting leads:', leadError.message);
    return;
  }

  console.log('\nTotal leads in list:', totalLeads);

  // Get scheduled emails count
  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 0);

  console.log('Scheduled initial emails:', scheduledCount);

  // Get sent count
  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 0)
    .eq('status', 'sent');

  console.log('Sent emails:', sentCount);

  // Calculate discrepancy
  const missing = totalLeads - scheduledCount;
  const expectedScheduled = totalLeads - sentCount;

  console.log('\n=== Analysis ===');
  console.log('Expected total scheduled:', totalLeads);
  console.log('Actual total scheduled:', scheduledCount);
  console.log('Missing leads:', missing);
  console.log('\nExpected remaining scheduled:', expectedScheduled);
  console.log('Actual remaining scheduled:', scheduledCount - sentCount);

  if (missing > 0) {
    console.log('\n❌ Discrepancy found!');
    console.log(`${missing} leads were not scheduled when campaign started`);

    // Check if there are any leads not in scheduled_emails
    const { data: scheduledLeads } = await supabase
      .from('scheduled_emails')
      .select('lead_id')
      .eq('campaign_id', campaignId)
      .eq('sequence_step', 0);

    const scheduledLeadIds = scheduledLeads.map(e => e.lead_id);

    const { data: allLeads } = await supabase
      .from('leads')
      .select('id, email')
      .eq('lead_list_id', leadListId)
      .limit(10);

    const missingLeadExamples = allLeads.filter(l => !scheduledLeadIds.includes(l.id));

    if (missingLeadExamples.length > 0) {
      console.log('\nSample missing leads:');
      missingLeadExamples.slice(0, 5).forEach((lead, i) => {
        console.log(`${i+1}. ${lead.email} (${lead.id.substring(0, 8)}...)`);
      });
    }
  } else {
    console.log('\n✅ All leads are scheduled');
  }
}

checkLeadCount().catch(console.error);
