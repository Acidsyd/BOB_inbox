const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaign() {
  console.log('Checking campaign 392fcb59-5ca3-4991-b05d-7b24a3a35884...');

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, config, status')
    .eq('id', '392fcb59-5ca3-4991-b05d-7b24a3a35884');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('Campaign not found');
    return;
  }

  const campaign = data[0];
  console.log('Campaign name:', campaign.name);
  console.log('Status:', campaign.status);

  if (campaign.config && campaign.config.sendingHours) {
    console.log('Sending Hours:', campaign.config.sendingHours);
  } else {
    console.log('No sending hours configured');
  }

  if (campaign.config && campaign.config.timezone) {
    console.log('Timezone:', campaign.config.timezone);
  } else {
    console.log('No timezone configured');
  }

  // Check current time in campaign timezone
  if (campaign.config && campaign.config.timezone) {
    const now = new Date();
    const timeInCampaignTz = now.toLocaleString('en-US', {
      timeZone: campaign.config.timezone,
      hour12: false,
      hour: 'numeric',
      minute: 'numeric'
    });
    console.log('Current time in campaign timezone (' + campaign.config.timezone + '):', timeInCampaignTz);
  }

  // Check scheduled emails for this campaign
  console.log('\nChecking scheduled emails...');
  const { data: scheduledEmails, error: emailError } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, status')
    .eq('campaign_id', '392fcb59-5ca3-4991-b05d-7b24a3a35884')
    .order('send_at', { ascending: true })
    .limit(10);

  if (emailError) {
    console.error('Error fetching scheduled emails:', emailError);
  } else {
    console.log('Found ' + scheduledEmails.length + ' scheduled emails:');
    scheduledEmails.forEach((email, index) => {
      const sendTime = new Date(email.send_at);
      const timeStr = campaign.config && campaign.config.timezone ?
        sendTime.toLocaleString('en-US', { timeZone: campaign.config.timezone }) :
        sendTime.toLocaleString();
      console.log((index + 1) + '. ' + email.status + ' - ' + timeStr + ' (' + email.send_at + ')');
    });
  }
}

checkCampaign().catch(console.error);
