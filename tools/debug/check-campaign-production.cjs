#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaign() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, status, config')
    .eq('id', '34ef1330-1379-4d97-b6ad-a7ffacf8fedc');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    const campaign = data[0];
    console.log('Campaign found:', campaign.name);
    console.log('Status:', campaign.status);
    console.log('Timezone:', campaign.config?.timezone || 'UTC');
    console.log('Sending hours:', campaign.config?.sendingHours);

    // Check scheduled emails
    const { data: emails, error: emailsError } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, status')
      .eq('campaign_id', campaign.id)
      .limit(5);

    if (!emailsError && emails) {
      console.log('Scheduled emails:', emails.length);
      emails.forEach(email => {
        const sendTime = new Date(email.send_at);
        console.log(`- ${email.status}: ${sendTime.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} CEST`);
      });
    }
  } else {
    console.log('Campaign not found');
  }
}

checkCampaign();