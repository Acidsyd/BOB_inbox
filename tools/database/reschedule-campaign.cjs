const { createClient } = require('@supabase/supabase-js');
const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function rescheduleCampaign() {
  const campaignId = '392fcb59-5ca3-4991-b05d-7b24a3a35884';
  
  console.log('Fetching campaign configuration...');
  
  // Get campaign config
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', campaignId)
    .single();
    
  if (campError || !campaign) {
    console.error('Error fetching campaign:', campError);
    return;
  }
  
  console.log('Campaign config:', JSON.stringify(campaign.config, null, 2));
  
  // Get scheduled emails that haven't been sent yet
  const { data: scheduledEmails, error: emailError } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, email_account_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true });
    
  if (emailError) {
    console.error('Error fetching scheduled emails:', emailError);
    return;
  }
  
  console.log('Found ' + scheduledEmails.length + ' scheduled emails to reschedule');
  
  if (scheduledEmails.length === 0) {
    console.log('No scheduled emails to reschedule');
    return;
  }
  
  // Create scheduler with campaign config
  const scheduler = new CampaignScheduler({
    timezone: campaign.config.timezone || 'UTC',
    sendingHours: campaign.config.sendingHours || { start: 9, end: 17 },
    emailsPerHour: campaign.config.emailsPerHour || 10,
    sendingInterval: campaign.config.sendingInterval || 15,
    emailsPerDay: campaign.config.emailsPerDay || 100,
    activeDays: campaign.config.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enableJitter: campaign.config.enableJitter,
    jitterMinutes: campaign.config.jitterMinutes || 3
  });
  
  // Create fake leads for rescheduling (we just need the count)
  const fakeLeads = scheduledEmails.map((email, index) => ({
    id: email.lead_id,
    email: 'lead' + index + '@example.com'
  }));
  
  // Get unique email accounts
  const uniqueAccountIds = [...new Set(scheduledEmails.map(e => e.email_account_id))];
  
  console.log('Rescheduling with ' + uniqueAccountIds.length + ' email accounts...');
  
  // Generate new schedule
  const newSchedules = scheduler.scheduleEmails(fakeLeads, uniqueAccountIds);
  
  console.log('\nNew schedule:');
  newSchedules.slice(0, 5).forEach((schedule, index) => {
    const timeInRome = schedule.sendAt.toLocaleString('en-US', { timeZone: campaign.config.timezone });
    console.log((index + 1) + '. ' + timeInRome + ' (' + schedule.sendAt.toISOString() + ')');
  });
  
  // Update scheduled emails with new times
  console.log('\nUpdating scheduled emails...');
  
  for (let i = 0; i < scheduledEmails.length; i++) {
    const email = scheduledEmails[i];
    const newTime = newSchedules[i].sendAt;
    
    const { error: updateError } = await supabase
      .from('scheduled_emails')
      .update({ send_at: newTime.toISOString() })
      .eq('id', email.id);
      
    if (updateError) {
      console.error('Error updating email ' + email.id + ':', updateError);
    } else if (i < 5) {
      console.log('Updated email ' + (i + 1) + ' to ' + newTime.toLocaleString('en-US', { timeZone: campaign.config.timezone }));
    }
  }
  
  console.log('\n✅ Successfully rescheduled ' + scheduledEmails.length + ' emails');
}

rescheduleCampaign().catch(console.error);
