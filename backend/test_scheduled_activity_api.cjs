require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const TimezoneService = require('./src/services/TimezoneService');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';
  const campaignTimezone = 'Europe/Rome';

  console.log('🧪 Testing scheduled-activity API endpoint logic...\n');

  // Get scheduled emails exactly as API does
  const { data: scheduledEmails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, from_email, send_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(20);

  console.log('📧 Scheduled emails from database (UTC, ordered by send_at):\n');

  scheduledEmails.forEach((email, idx) => {
    // Format exactly as backend does
    const formattedTime = TimezoneService.convertToUserTimezone(
      email.send_at,
      campaignTimezone,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
    );

    console.log(`${idx + 1}. UTC: ${email.send_at}`);
    console.log(`   Rome: ${formattedTime}`);
    console.log(`   To: ${email.to_email}`);
    console.log('');
  });
})();
