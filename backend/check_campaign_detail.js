const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCampaign() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';
  
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, status, config')
    .eq('id', campaignId)
    .single();

  console.log('\n=== Campaign Details ===');
  console.log('Name:', campaign.name);
  console.log('Status:', campaign.status);
  console.log('\nEmail Sequence:');
  if (campaign.config.emailSequence && campaign.config.emailSequence.length > 0) {
    campaign.config.emailSequence.forEach((email, i) => {
      console.log('  Follow-up', i + 1);
      console.log('    Delay:', email.delay, 'days');
    });
  }

  const { data: scheduled } = await supabase
    .from('scheduled_emails')
    .select('id, status, send_at, sequence_step, lead_id')
    .eq('campaign_id', campaignId)
    .order('send_at', { ascending: true });

  console.log('\n=== Scheduled Emails ===');
  console.log('Total:', scheduled.length);

  const byStep = {};
  scheduled.forEach(e => {
    const step = e.sequence_step || 0;
    if (!byStep[step]) byStep[step] = { count: 0, times: [], leads: [] };
    byStep[step].count++;
    byStep[step].times.push(e.send_at);
    byStep[step].leads.push(e.lead_id);
  });

  console.log('\nBy sequence step:');
  Object.keys(byStep).sort((a,b) => a-b).forEach(step => {
    const label = step == 0 ? 'Initial' : 'Follow-up ' + step;
    console.log('  ' + label + ':', byStep[step].count, 'emails');
  });

  if (byStep[0] && byStep[1]) {
    console.log('\n=== Checking 1-day delay ===');
    const lead = byStep[0].leads[0];
    const initialIdx = scheduled.findIndex(e => e.sequence_step === 0 && e.lead_id === lead);
    const followupIdx = scheduled.findIndex(e => e.sequence_step === 1 && e.lead_id === lead);
    
    if (initialIdx >= 0 && followupIdx >= 0) {
      const initial = new Date(scheduled[initialIdx].send_at);
      const followup = new Date(scheduled[followupIdx].send_at);
      const diffMs = followup - initial;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;
      
      console.log('Initial:', initial.toLocaleString());
      console.log('Follow-up:', followup.toLocaleString());
      console.log('Difference:', diffDays.toFixed(2), 'days');
      console.log('Correct:', diffDays >= 0.95 && diffDays <= 1.05 ? 'YES' : 'NO');
    }
  }
}

checkCampaign().catch(console.error);
