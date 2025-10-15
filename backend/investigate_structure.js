const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function investigate() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';
  
  console.log('Sample initial emails (step 0):');
  const { data: initial } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, sequence_step, send_at, status')
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 0)
    .limit(3);
  
  initial.forEach((e, i) => {
    console.log(i + 1, 'Lead ID:', e.lead_id, 'Send:', new Date(e.send_at).toLocaleString(), 'Status:', e.status);
  });
  
  console.log('\nSample follow-up emails (step 1):');
  const { data: followup } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, sequence_step, send_at, status')
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 1)
    .limit(3);
  
  followup.forEach((e, i) => {
    console.log(i + 1, 'Lead ID:', e.lead_id, 'Send:', new Date(e.send_at).toLocaleString(), 'Status:', e.status);
  });
  
  console.log('\nChecking if any lead has both steps:');
  const leadIds = initial.map(e => e.lead_id);
  const { data: matching } = await supabase
    .from('scheduled_emails')
    .select('lead_id, sequence_step, send_at')
    .eq('campaign_id', campaignId)
    .in('lead_id', leadIds)
    .order('lead_id')
    .order('sequence_step');
  
  const grouped = {};
  matching.forEach(e => {
    if (!grouped[e.lead_id]) grouped[e.lead_id] = [];
    grouped[e.lead_id].push(e);
  });
  
  Object.entries(grouped).forEach(([leadId, emails]) => {
    console.log('\nLead:', leadId);
    emails.forEach(e => {
      const label = e.sequence_step === 0 ? 'Initial' : 'Follow-up ' + e.sequence_step;
      console.log('  ' + label + ':', new Date(e.send_at).toLocaleString());
    });
    
    if (emails.length === 2) {
      const diff = (new Date(emails[1].send_at) - new Date(emails[0].send_at)) / (1000 * 60 * 60 * 24);
      console.log('  Delay:', diff.toFixed(2), 'days');
    }
  });
}

investigate().catch(console.error);
