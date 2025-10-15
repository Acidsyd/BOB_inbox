require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

  // Search for specific emails with past timestamps
  const pastEmails = [
    'c.bonomo@tootech.it',
    'clorenzi@4wardconsulting.it',
    'letizia@pontexspa.it',
    'mirkotramontano@mycreditspa.it'
  ];

  console.log('Checking specific emails with past timestamps:\n');

  for (const email of pastEmails) {
    const { data } = await supabase
      .from('scheduled_emails')
      .select('send_at, from_email, to_email, created_at')
      .eq('campaign_id', campaignId)
      .eq('to_email', email)
      .eq('status', 'scheduled')
      .single();

    if (data) {
      const sendAt = new Date(data.send_at);
      const now = new Date();
      const isPast = sendAt < now;

      console.log(`Email: ${data.to_email}`);
      console.log(`  From: ${data.from_email}`);
      console.log(`  Send At (UTC): ${sendAt.toISOString()}`);
      console.log(`  Send At (Rome): ${sendAt.toLocaleString('en-US', { timeZone: 'Europe/Rome' })}`);
      console.log(`  Created At: ${data.created_at}`);
      console.log(`  Is Past: ${isPast} (now is ${now.toISOString()})`);
      console.log('');
    }
  }

  // Get ALL scheduled emails and show current time vs scheduled times
  const { data: all } = await supabase
    .from('scheduled_emails')
    .select('send_at, to_email, from_email')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(30);

  const now = new Date();
  console.log(`\nCurrent time: ${now.toISOString()} (${now.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} Rome)`);
  console.log('\nFirst 30 scheduled emails:\n');

  all.forEach((email, idx) => {
    const sendAt = new Date(email.send_at);
    const isPast = sendAt < now;
    const romeTime = sendAt.toLocaleString('en-US', {
      timeZone: 'Europe/Rome',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    console.log(`${idx + 1}. ${romeTime} ${isPast ? '❌ PAST' : '✅ FUTURE'} - ${email.from_email} → ${email.to_email}`);
  });
})();
