const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';
  
  const { data: followups } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, send_at, status, sequence_step')
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 1)
    .limit(5);
  
  console.log('Sample follow-up emails (sequence_step = 1):\n');
  followups.forEach((e, i) => {
    const sendDate = new Date(e.send_at);
    const now = new Date();
    const isPast = sendDate < now;
    
    console.log(`${i + 1}. Lead: ${e.lead_id.substring(0, 8)}...`);
    console.log(`   Send at: ${sendDate.toLocaleString()}`);
    console.log(`   Status: ${e.status}`);
    console.log(`   Is past due: ${isPast ? 'YES (will try to send)' : 'NO'}`);
    console.log('');
  });
  
  const { data: stats } = await supabase
    .from('scheduled_emails')
    .select('send_at, status')
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 1);
  
  const now = new Date();
  const pastDue = stats.filter(e => new Date(e.send_at) < now).length;
  const future = stats.filter(e => new Date(e.send_at) >= now).length;
  const scheduled = stats.filter(e => e.status === 'scheduled').length;
  
  console.log('Follow-up email summary:');
  console.log(`  Total: ${stats.length}`);
  console.log(`  Past due: ${pastDue} (will attempt to send)`);
  console.log(`  Future: ${future}`);
  console.log(`  Status 'scheduled': ${scheduled}`);
}

check().catch(console.error);
