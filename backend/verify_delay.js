const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verify() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';
  
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('lead_id, sequence_step, send_at, status')
    .eq('campaign_id', campaignId)
    .order('lead_id', { ascending: true })
    .order('sequence_step', { ascending: true })
    .limit(100);

  console.log('Checking first 5 leads with both initial and follow-up:\n');
  
  const leadMap = {};
  emails.forEach(e => {
    if (!leadMap[e.lead_id]) leadMap[e.lead_id] = {};
    leadMap[e.lead_id][e.sequence_step] = { send_at: e.send_at, status: e.status };
  });

  let checked = 0;
  for (const leadId in leadMap) {
    if (checked >= 5) break;
    const lead = leadMap[leadId];
    
    if (lead[0] && lead[1]) {
      const initial = new Date(lead[0].send_at);
      const followup = new Date(lead[1].send_at);
      const diffHours = (followup - initial) / (1000 * 60 * 60);
      const diffDays = diffHours / 24;
      
      console.log('Lead', leadId.substring(0, 8) + '...');
      console.log('  Initial:', initial.toLocaleString(), '(' + lead[0].status + ')');
      console.log('  Follow-up:', followup.toLocaleString(), '(' + lead[1].status + ')');
      console.log('  Delay:', diffDays.toFixed(2), 'days');
      console.log('  ✓ Correct:', diffDays >= 0.95 && diffDays <= 1.05 ? 'YES' : 'NO');
      console.log('');
      checked++;
    }
  }

  const totalLeads = Object.keys(leadMap).length;
  const withFollowup = Object.values(leadMap).filter(l => l[0] && l[1]).length;
  const withoutFollowup = Object.values(leadMap).filter(l => l[0] && !l[1]).length;
  
  console.log('Summary:');
  console.log('  Total unique leads:', totalLeads);
  console.log('  Leads with follow-up:', withFollowup);
  console.log('  Leads without follow-up:', withoutFollowup);
}

verify().catch(console.error);
