require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeFollowupDates() {
  const now = new Date();
  
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('id, sequence_step, send_at, to_email, status')
    .eq('campaign_id', 'c0f9d471-ac96-400f-a942-9c55487a8a53')
    .eq('sequence_step', 1)
    .eq('status', 'scheduled');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const past = data.filter(e => new Date(e.send_at) < now);
  const future = data.filter(e => new Date(e.send_at) >= now);

  console.log(`\n📊 Follow-up Date Analysis:`);
  console.log(`Total scheduled follow-ups: ${data.length}`);
  console.log(`❌ Scheduled in PAST: ${past.length}`);
  console.log(`✅ Scheduled in FUTURE: ${future.length}`);
  
  console.log(`\n⏰ Past follow-ups (need rescheduling):`);
  past.slice(0, 5).forEach(e => {
    console.log(`  ${e.to_email} → ${e.send_at}`);
  });
}

analyzeFollowupDates();
