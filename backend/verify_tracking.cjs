require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

(async () => {
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, tracking_token')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .limit(5);

  if (!emails || emails.length === 0) {
    console.log('❌ No sent emails found');
    return;
  }

  console.log('📧 Checking tracking pixel in', emails.length, 'sent emails:\n');

  for (const email of emails) {
    const { data: fullEmail } = await supabase
      .from('scheduled_emails')
      .select('content')
      .eq('id', email.id)
      .single();

    const hasPixel = fullEmail?.content?.includes('/api/track/open');
    const hasCorrectToken = fullEmail?.content?.includes(email.tracking_token);

    console.log('To:', email.to_email);
    console.log('  Tracking Token:', email.tracking_token);
    console.log('  Has Tracking Pixel:', hasPixel ? '✅' : '❌');
    console.log('  Token in Content:', hasCorrectToken ? '✅' : '❌');
    console.log('');
  }
})();
