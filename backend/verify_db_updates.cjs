require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

  console.log('🔍 Checking database for out-of-order timestamps...\n');

  // Get first 20 scheduled emails ordered by send_at
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, to_email, from_email, sequence_step')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(20);

  const now = new Date();
  console.log(`Current time: ${now.toISOString()}\n`);

  let previousTime = null;
  let outOfOrderCount = 0;

  emails.forEach((email, idx) => {
    const sendAt = new Date(email.send_at);
    const isPast = sendAt < now;

    let orderIndicator = '';
    if (previousTime && sendAt < previousTime) {
      orderIndicator = ' ⚠️ OUT OF ORDER!';
      outOfOrderCount++;
    }

    console.log(`${idx + 1}. ${sendAt.toISOString()} ${isPast ? '❌ PAST' : '✅ FUTURE'}${orderIndicator}`);
    console.log(`   → ${email.to_email}`);
    console.log(`   From: ${email.from_email}`);
    console.log(`   ID: ${email.id}`);
    console.log('');

    previousTime = sendAt;
  });

  console.log(`\nFound ${outOfOrderCount} out-of-order timestamps`);

  if (outOfOrderCount > 0) {
    console.log('\n💡 Solution: Stop and restart the campaign via UI to regenerate all schedules');
  }
})();
