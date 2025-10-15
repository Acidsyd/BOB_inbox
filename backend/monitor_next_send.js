const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CAMPAIGN_ID = '55205d7b-9ebf-414a-84bc-52c8b724dd30';

async function monitorNextSend() {
  console.log('\n📊 MONITORING NEXT EMAIL SEND & FOLLOW-UP SCHEDULING');
  console.log('='.repeat(80));

  // Get next scheduled email
  const { data: nextEmail, error: nextError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, send_at, sequence_step, status')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .eq('sequence_step', 0) // Only initial emails
    .order('send_at', { ascending: true })
    .limit(1)
    .single();

  if (nextError) {
    console.log('❌ Error fetching next email:', nextError.message);
  } else if (nextEmail) {
    const sendTime = new Date(nextEmail.send_at);
    const now = new Date();
    const waitMinutes = Math.round((sendTime - now) / 1000 / 60);

    console.log(`\n⏰ NEXT SCHEDULED EMAIL:`);
    console.log(`   ID: ${nextEmail.id}`);
    console.log(`   To: ${nextEmail.to_email}`);
    console.log(`   Send at: ${nextEmail.send_at}`);
    console.log(`   Time until send: ${waitMinutes} minutes`);
  } else {
    console.log('\n❌ No scheduled emails found');
  }

  // Check current follow-up count
  const { data: followUps, error: followUpError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, send_at, sequence_step, status, parent_email_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('sequence_step', 1)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`\n📧 CURRENT FOLLOW-UP COUNT: ${followUps?.length || 0}`);

  if (followUps && followUps.length > 0) {
    console.log('   Recent follow-ups:');
    followUps.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.to_email} - Status: ${f.status}, Send at: ${f.send_at}`);
    });
  }

  // Check recent sends
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentSent, error: sentError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, sent_at, sequence_step')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'sent')
    .gte('sent_at', tenMinutesAgo)
    .order('sent_at', { ascending: false })
    .limit(3);

  console.log(`\n📬 RECENTLY SENT (last 10 min): ${recentSent?.length || 0}`);
  if (recentSent && recentSent.length > 0) {
    recentSent.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.to_email} - Sent at: ${s.sent_at}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 TIP: Watch backend logs for follow-up scheduling messages:');
  console.log('   "📧 Scheduling X follow-up email(s)"');
  console.log('   "✅ Follow-up 1 scheduled for [email] at [time]"');
  console.log('='.repeat(80) + '\n');
}

monitorNextSend().catch(console.error);
