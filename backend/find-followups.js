/**
 * Find Nov 21 Emails and Check Follow-ups
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const CAMPAIGN_ID = 'ea86e19c-b71f-49a4-95aa-1cc0a21734df';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findFollowups() {
  console.log('🔍 Analyzing Nov 21 emails...\n');

  // Find all emails sent on Nov 21
  const { data: nov21Emails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, from_email, sent_at, sequence_step')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'sent')
    .eq('sequence_step', 0)
    .gte('sent_at', '2025-11-21T00:00:00')
    .lt('sent_at', '2025-11-22T00:00:00')
    .order('sent_at', { ascending: true });

  console.log(`📧 Found ${nov21Emails.length} emails sent on Nov 21:\n`);
  
  const missing = [];
  
  for (const email of nov21Emails) {
    const { data: followups } = await supabase
      .from('scheduled_emails')
      .select('id, sequence_step, status, send_at')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('to_email', email.to_email)
      .eq('sequence_step', 1);

    if (!followups || followups.length === 0) {
      console.log(`❌ ${email.to_email} - NO FOLLOW-UP`);
      missing.push(email);
    } else {
      console.log(`✅ ${email.to_email} - Follow-up: ${followups[0].status} at ${followups[0].send_at}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total Nov 21 emails: ${nov21Emails.length}`);
  console.log(`   Missing follow-ups: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log(`\n❌ Missing follow-ups for:`);
    missing.forEach(e => console.log(`   - ${e.to_email} (sent at ${e.sent_at})`));
  }
}

findFollowups().catch(console.error);
