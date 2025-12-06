const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCampaignFollowUps() {
  const campaignId = '958ea778-928e-41f2-99c0-053b65b5ee4b';

  // Get campaign info
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, status, config')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    console.log('Campaign error:', campaignError);
    return;
  }

  console.log('=== CAMPAIGN INFO ===');
  console.log('Name:', campaign.name);
  console.log('Status:', campaign.status);
  console.log('Email Sequence:', JSON.stringify(campaign.config?.emailSequence, null, 2));

  // Get all scheduled emails for this campaign
  const { data: emails, error: emailsError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, send_at, sequence_step, subject')
    .eq('campaign_id', campaignId)
    .order('send_at', { ascending: true });

  if (emailsError) {
    console.log('Emails error:', emailsError);
    return;
  }

  console.log('\n=== SCHEDULED EMAILS SUMMARY ===');
  console.log('Total emails:', emails.length);

  // Group by sequence step
  const byStep = {};
  emails.forEach(e => {
    const step = e.sequence_step || 0;
    if (!byStep[step]) byStep[step] = { total: 0, scheduled: 0, sent: 0, failed: 0, cancelled: 0, skipped: 0 };
    byStep[step].total++;
    byStep[step][e.status] = (byStep[step][e.status] || 0) + 1;
  });

  console.log('\nBy Sequence Step:');
  Object.keys(byStep).sort((a,b) => a-b).forEach(step => {
    console.log('  Step ' + step + ':', JSON.stringify(byStep[step]));
  });

  // Show follow-up emails (sequence_step > 0)
  const followUps = emails.filter(e => (e.sequence_step || 0) > 0);
  console.log('\n=== FOLLOW-UP EMAILS (sequence_step > 0) ===');
  console.log('Total follow-ups:', followUps.length);

  if (followUps.length > 0) {
    console.log('\nScheduled follow-ups:');
    followUps.filter(e => e.status === 'scheduled').slice(0, 30).forEach(e => {
      console.log('  - ' + e.to_email + ' | Step ' + e.sequence_step + ' | ' + e.send_at + ' | ' + e.status);
    });

    const scheduledCount = followUps.filter(e => e.status === 'scheduled').length;
    if (scheduledCount > 30) {
      console.log('  ... and ' + (scheduledCount - 30) + ' more');
    }
  }

  // Show status breakdown
  console.log('\n=== STATUS BREAKDOWN ===');
  const byStatus = {};
  emails.forEach(e => {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
  });
  Object.keys(byStatus).forEach(status => {
    console.log('  ' + status + ': ' + byStatus[status]);
  });
}

checkCampaignFollowUps().catch(console.error);
