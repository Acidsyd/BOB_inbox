const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function traceEmails() {
  console.log('=== Tracing Midnight Emails ===\n');

  // Get campaign details
  const campaignId = 'f1acbb40-dcb3-4165-936b-bf013b5a4032';

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  console.log('Campaign timezone:', campaign.config.timezone);
  console.log('Sending hours:', campaign.config.sendingHours);
  console.log('\n');

  // Get emails around midnight
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('campaign_id', campaignId)
    .gte('send_at', '2025-11-25T22:00:00Z')
    .lte('send_at', '2025-11-26T01:00:00Z')
    .order('send_at', { ascending: true })
    .limit(10);

  console.log(`Found ${emails.length} emails between 22:00 and 01:00 UTC:\n`);

  emails.forEach(email => {
    const sendAtUTC = new Date(email.send_at);
    const sendAtRome = sendAtUTC.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour12: false});
    const hourRome = parseInt(sendAtUTC.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour: 'numeric', hour12: false}));

    const updatedAt = new Date(email.updated_at);
    const updatedAtRome = updatedAt.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour12: false});

    const emailIdShort = email.id.substring(0, 8);
    console.log(`Email ID: ${emailIdShort}...`);
    console.log(`  To: ${email.to_email}`);
    console.log(`  Send at (UTC): ${email.send_at}`);
    console.log(`  Send at (Rome): ${sendAtRome}`);
    console.log(`  Hour in Rome: ${hourRome} ${hourRome < 9 || hourRome >= 17 ? '⚠️  OUTSIDE HOURS!' : ''}`);
    console.log(`  Status: ${email.status}`);
    console.log(`  Updated at: ${email.updated_at}`);
    console.log(`  Updated at (Rome): ${updatedAtRome}`);
    console.log(`  Follow-up level: ${email.follow_up_level || 0}`);
    console.log('');
  });
}

traceEmails().catch(console.error);
