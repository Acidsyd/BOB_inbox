require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function compareCampaigns() {
  const campaigns = [
    { id: 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e', label: 'Problematic' },
    { id: '3afa6a78-2101-404c-a911-13e36eeb5298', label: 'Working' }
  ];

  for (const { id, label } of campaigns) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, config, status')
      .eq('id', id)
      .single();

    if (error) {
      console.log(`\n❌ Error fetching ${label} campaign:`, error);
    } else {
      console.log(`\n=== ${label} Campaign: ${data.name || id} ===`);
      console.log('Status:', data.status);
      console.log('\nConfig:');
      console.log('  timezone:', data.config?.timezone);
      console.log('  sendingHours:', JSON.stringify(data.config?.sendingHours));
      console.log('  sendingInterval:', data.config?.sendingInterval);
      console.log('  emailsPerDay:', data.config?.emailsPerDay);
      console.log('  activeDays:', JSON.stringify(data.config?.activeDays));
      console.log('  enableJitter:', data.config?.enableJitter);
      console.log('  jitterMinutes:', data.config?.jitterMinutes);
      console.log('  Full config:', JSON.stringify(data.config, null, 2));
    }
  }

  // Check ACTIVE scheduled emails for the problematic campaign
  console.log('\n=== Checking ACTIVE scheduled emails for problematic campaign ===');
  const { data: scheduledEmails, error: schedError } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, status, lead_id')
    .eq('campaign_id', 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e')
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(20);

  if (schedError) {
    console.log('Error fetching scheduled emails:', schedError);
  } else {
    console.log(`\nFirst 20 ACTIVE (scheduled) emails:`);
    scheduledEmails.forEach((email, i) => {
      // Convert to Rome time for verification
      const dateObj = new Date(email.send_at.endsWith('Z') ? email.send_at : email.send_at + 'Z');
      const romeTime = dateObj.toLocaleString('en-US', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ${i + 1}. UTC: ${email.send_at} → Rome: ${romeTime} (${email.status})`);
    });
  }
}

compareCampaigns()
  .catch(console.error)
  .finally(() => process.exit(0));
