const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getCampaignAllStats() {
  const campaignId = 'c0f9d471-ac96-400f-a942-9c55487a8a53';

  // Query ALL emails for this campaign
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('sequence_step, status')
    .eq('campaign_id', campaignId);

  if (error) {
    console.error('Error querying campaign:', error);
    return;
  }

  // Count by sequence step (all statuses)
  const sequenceCounts = {};
  data.forEach(email => {
    const step = email.sequence_step || 0;
    sequenceCounts[step] = (sequenceCounts[step] || 0) + 1;
  });

  // Count by status
  const statusCounts = {};
  data.forEach(email => {
    statusCounts[email.status] = (statusCounts[email.status] || 0) + 1;
  });

  // Count sent by sequence step
  const sentByStep = {};
  data.filter(e => e.status === 'sent').forEach(email => {
    const step = email.sequence_step || 0;
    sentByStep[step] = (sentByStep[step] || 0) + 1;
  });

  console.log('\nCampaign Complete Breakdown:');
  console.log('============================');
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`Total Emails: ${data.length}\n`);

  console.log('By Sequence Step (ALL statuses):');
  Object.keys(sequenceCounts).sort((a, b) => a - b).forEach(step => {
    const stepNum = parseInt(step);
    const label = stepNum === 0 ? 'Initial Emails (step 0)' : `Follow-up #${stepNum} (step ${stepNum})`;
    console.log(`  ${label}: ${sequenceCounts[step]}`);
  });

  console.log('\nBy Status:');
  Object.keys(statusCounts).sort().forEach(status => {
    console.log(`  ${status}: ${statusCounts[status]}`);
  });

  console.log('\nSent Emails by Sequence Step:');
  Object.keys(sentByStep).sort((a, b) => a - b).forEach(step => {
    const stepNum = parseInt(step);
    const label = stepNum === 0 ? 'Initial Emails' : `Follow-up #${stepNum}`;
    console.log(`  ${label}: ${sentByStep[step]}`);
  });
}

getCampaignAllStats().then(() => process.exit(0));
