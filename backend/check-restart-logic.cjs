require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const campaignId = '82ebcf15-7a68-4091-bbf8-3e599c91ed3f';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkRestartLogic() {
  console.log('🔍 Checking campaign restart logic...');
  
  // Get all scheduled emails with their statuses grouped by creation time
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, created_at, sequence_step')
    .eq('campaign_id', campaignId)
    .order('created_at');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📧 Total emails: ${emails.length}`);
  
  // Group by creation waves
  const waves = {};
  emails.forEach(email => {
    const wave = email.created_at.split('T')[1].slice(0,8); // Get time part
    if (!waves[wave]) waves[wave] = [];
    waves[wave].push(email);
  });
  
  console.log('\n📊 Email creation waves:');
  Object.entries(waves).forEach(([time, emails]) => {
    const statusCounts = {};
    emails.forEach(email => {
      if (!statusCounts[email.status]) statusCounts[email.status] = 0;
      statusCounts[email.status]++;
    });
    
    console.log(`⏰ ${time}: ${emails.length} emails`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  });
  
  // Check what would be cancelled by restart logic
  const { data: scheduledEmails, error: scheduledError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, created_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled');
    
  if (!scheduledError) {
    console.log(`\n🔄 Emails that WOULD be cancelled by restart: ${scheduledEmails.length}`);
    
    // Group by creation time to see if older waves have non-scheduled status
    const scheduledWaves = {};
    scheduledEmails.forEach(email => {
      const wave = email.created_at.split('T')[1].slice(0,8);
      if (!scheduledWaves[wave]) scheduledWaves[wave] = 0;
      scheduledWaves[wave]++;
    });
    
    console.log('📅 Scheduled emails by wave:');
    Object.entries(scheduledWaves).forEach(([time, count]) => {
      console.log(`   ${time}: ${count} scheduled`);
    });
  }
  
  // Check sequence steps (main email vs follow-ups)
  const sequenceSteps = {};
  emails.forEach(email => {
    const step = email.sequence_step || 0;
    if (!sequenceSteps[step]) sequenceSteps[step] = 0;
    sequenceSteps[step]++;
  });
  
  console.log('\n📝 Emails by sequence step:');
  Object.entries(sequenceSteps).forEach(([step, count]) => {
    const stepName = step === '0' ? 'Main email' : `Follow-up ${step}`;
    console.log(`   ${stepName}: ${count} emails`);
  });
  
  // Check if this is a multi-step campaign
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', campaignId)
    .single();
    
  if (!campError && campaign?.config?.emailSequence) {
    const sequence = campaign.config.emailSequence;
    console.log(`\n📧 Campaign has ${sequence.length} follow-up emails configured`);
    console.log('Expected total emails per lead:', 1 + sequence.length);
    console.log('Actual emails per lead:', Math.round(emails.length / 22));
    
    if (sequence.length + 1 === 3) {
      console.log('✅ This explains the 3x duplication - each restart creates main + 2 follow-ups');
    }
  }
  
  console.log('\n✅ Analysis complete');
}

checkRestartLogic().catch(console.error);