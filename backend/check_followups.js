const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkScheduled() {
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, status')
    .order('created_at', { ascending: true })
    .limit(5);

  console.log('\n=== Campaigns ===');
  campaigns.forEach((c, i) => console.log(`${i+1}. ${c.name} (${c.status})`));

  if (!campaigns || campaigns.length === 0) {
    console.log('No campaigns found');
    return;
  }

  const firstCampaign = campaigns[0];
  console.log(`\n=== Scheduled emails for: ${firstCampaign.name} ===\n`);

  const { data: scheduled } = await supabase
    .from('scheduled_emails')
    .select('id, status, send_at, sequence_step')
    .eq('campaign_id', firstCampaign.id)
    .order('send_at', { ascending: true });

  const byStep = {};
  scheduled.forEach(e => {
    const step = e.sequence_step || 0;
    if (!byStep[step]) byStep[step] = { count: 0, statuses: {}, times: [] };
    byStep[step].count++;
    byStep[step].statuses[e.status] = (byStep[step].statuses[e.status] || 0) + 1;
    byStep[step].times.push(e.send_at);
  });

  console.log(`Total scheduled emails: ${scheduled.length}\n`);
  console.log('Breakdown by sequence step:');
  Object.keys(byStep).sort((a,b) => a-b).forEach(step => {
    const label = step == 0 ? 'Initial email' : `Follow-up ${step}`;
    const statusStr = Object.entries(byStep[step].statuses).map(([s,c]) => `${s}: ${c}`).join(', ');
    console.log(`\n  ${label}: ${byStep[step].count} emails`);
    console.log(`    Status: ${statusStr}`);
    console.log(`    First 3 send times:`);
    byStep[step].times.slice(0, 3).forEach((t, i) => {
      console.log(`      ${i+1}. ${t}`);
    });
  });
}

checkScheduled().catch(console.error);
