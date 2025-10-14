const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '943f4c22-5898-4137-b86a-beb99e625188';

async function checkFollowUps() {
  console.log('🔍 CHECKING FOLLOW-UP STATUS\n');
  console.log(`Campaign ID: ${CAMPAIGN_ID}\n`);

  // Get campaign info
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('name, status, config')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found:', campaignError);
    return;
  }

  console.log('📊 Campaign Info:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Lead List ID: ${campaign.config?.leadListId}`);
  console.log('');

  // Check if campaign has follow-up configuration
  const emailSequence = campaign.config?.emailSequence || [];
  console.log('📧 Follow-up Configuration:');
  console.log(`   Initial email: ${campaign.config?.emailSubject || 'N/A'}`);
  console.log(`   Follow-ups configured: ${emailSequence.length}`);

  if (emailSequence.length > 0) {
    emailSequence.forEach((followUp, index) => {
      console.log(`   Follow-up ${index + 1}:`);
      console.log(`     Subject: ${followUp.subject}`);
      console.log(`     Delay: ${followUp.delay} days`);
      console.log(`     Reply to same thread: ${followUp.replyToSameThread || false}`);
    });
  }
  console.log('');

  // Count scheduled emails by type
  const { count: totalEmails } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID);

  const { count: initialEmails } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', false);

  const { count: followUpEmails } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', true);

  console.log('📊 Scheduled Emails Status:');
  console.log(`   Total emails: ${totalEmails || 0}`);
  console.log(`   Initial emails: ${initialEmails || 0}`);
  console.log(`   Follow-up emails: ${followUpEmails || 0}`);
  console.log('');

  // Check expected vs actual
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', campaign.config?.leadListId)
    .eq('status', 'active');

  const expectedTotal = (totalLeads || 0) * (1 + emailSequence.length);

  console.log('🧮 Expected vs Actual:');
  console.log(`   Total leads: ${totalLeads || 0}`);
  console.log(`   Emails per lead: ${1 + emailSequence.length} (1 initial + ${emailSequence.length} follow-ups)`);
  console.log(`   Expected total emails: ${expectedTotal}`);
  console.log(`   Actual total emails: ${totalEmails || 0}`);
  console.log('');

  if (followUpEmails === 0 && emailSequence.length > 0) {
    console.log('⚠️  FOLLOW-UPS NOT SCHEDULED!');
    console.log('   Campaign has follow-ups configured but none are scheduled yet.');
    console.log('   This is EXPECTED behavior - follow-ups are scheduled when initial emails are sent.');
    console.log('');
  } else if (followUpEmails > 0) {
    console.log('✅ Follow-ups are scheduled!');
    console.log('');

    // Get sample follow-ups
    const { data: sampleFollowUps } = await supabase
      .from('scheduled_emails')
      .select('to_email, subject, send_at, sequence_step, status')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('is_follow_up', true)
      .order('send_at', { ascending: true })
      .limit(5);

    console.log('📧 Sample Follow-ups:');
    sampleFollowUps?.forEach(email => {
      console.log(`   ${email.to_email} - Step ${email.sequence_step} - ${email.status} - ${email.send_at}`);
    });
  }

  // Check for sent initial emails (which should trigger follow-ups)
  const { count: sentInitial } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('is_follow_up', false)
    .eq('status', 'sent');

  console.log('');
  console.log('📤 Sent Status:');
  console.log(`   Initial emails sent: ${sentInitial || 0}/${initialEmails || 0}`);
  console.log('');

  if (sentInitial > 0 && followUpEmails === 0 && emailSequence.length > 0) {
    console.log('⚠️  WARNING: Initial emails have been sent but follow-ups not scheduled!');
    console.log('   This might indicate an issue with follow-up scheduling logic.');
  }
}

checkFollowUps().catch(console.error);
