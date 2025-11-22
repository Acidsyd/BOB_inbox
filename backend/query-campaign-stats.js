const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getCampaignStats() {
  const campaignId = 'c0f9d471-ac96-400f-a942-9c55487a8a53';

  // Query sent emails grouped by sequence step
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('sequence_step')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent');

  if (error) {
    console.error('Error querying campaign:', error);
    return;
  }

  // Count by sequence step
  const counts = {};
  data.forEach(email => {
    const step = email.sequence_step || 0;
    counts[step] = (counts[step] || 0) + 1;
  });

  console.log('\nCampaign Email Breakdown:');
  console.log('========================');
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`Total Sent: ${data.length}\n`);

  Object.keys(counts).sort((a, b) => a - b).forEach(step => {
    const stepNum = parseInt(step);
    const label = stepNum === 0 ? '1st Email (Initial)' : `Follow-up #${stepNum}`;
    console.log(`${label}: ${counts[step]} emails`);
  });
}

getCampaignStats().then(() => process.exit(0));
