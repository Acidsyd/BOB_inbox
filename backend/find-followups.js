require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function findFollowups(campaignId) {
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, send_at, sequence_step')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true });

  console.log('Total scheduled emails:', emails.length);
  console.log('\n📧 Initial emails (sequence_step = 0):');
  const initials = emails.filter(e => !e.sequence_step || e.sequence_step === 0);
  console.log('  Count:', initials.length);
  if (initials.length > 0) {
    console.log('  First:', initials[0].send_at);
    console.log('  Last:', initials[initials.length - 1].send_at);
  }

  console.log('\n↪️  Follow-up emails (sequence_step > 0):');
  const followups = emails.filter(e => e.sequence_step && e.sequence_step > 0);
  console.log('  Count:', followups.length);

  if (followups.length > 0) {
    console.log('  First:', followups[0].send_at);
    console.log('  Last:', followups[followups.length - 1].send_at);

    console.log('\n  Details:');
    followups.forEach((f, i) => {
      console.log('    ' + (i + 1) + '. To:', f.to_email);
      console.log('       Scheduled:', f.send_at);
      console.log('       Sequence step:', f.sequence_step);
      console.log('');
    });
  } else {
    console.log('  No follow-ups found');
  }

  console.log('\n📋 Position of follow-ups in full schedule:');
  emails.forEach((e, i) => {
    if (e.sequence_step && e.sequence_step > 0) {
      console.log('  Position ' + (i + 1) + ' of ' + emails.length + ': Follow-up #' + e.sequence_step + ' to ' + e.to_email);
    }
  });
}

findFollowups('ea86e19c-b71f-49a4-95aa-1cc0a21734df').catch(console.error);
