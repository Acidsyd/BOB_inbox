const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkOct16Emails() {
  // Get emails scheduled for Oct 16
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('created_at, send_at, to_email, status')
    .eq('campaign_id', '55205d7b-9ebf-414a-84bc-52c8b724dd30')
    .gte('send_at', '2025-10-16T00:00:00')
    .lt('send_at', '2025-10-17T00:00:00')
    .order('send_at', { ascending: true })
    .limit(10);

  console.log('\n📅 Emails scheduled for October 16, 2025:');
  console.log('='.repeat(80));

  if (!emails || emails.length === 0) {
    console.log('No emails found for October 16');
  } else {
    emails.forEach((e, i) => {
      const createdAt = new Date(e.created_at);
      const sendAt = new Date(e.send_at);
      const createdRome = createdAt.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false });
      const sendRome = sendAt.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false });

      console.log(`${i+1}. ${e.to_email} [${e.status}]`);
      console.log(`   Created: ${e.created_at} (${createdRome} Rome)`);
      console.log(`   Send at: ${e.send_at} (${sendRome} Rome)`);
      console.log();
    });
  }

  console.log('='.repeat(80) + '\n');
}

checkOct16Emails().catch(console.error);
