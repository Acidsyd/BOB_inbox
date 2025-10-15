require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkTracking() {
  // Check for any tracking events
  const { data: tracking, error } = await supabase
    .from('email_tracking')
    .select('*')
    .limit(10);

  console.log('📊 Sample tracking events:', tracking?.length || 0);
  if (tracking && tracking.length > 0) {
    console.log('Sample events:');
    tracking.forEach(t => {
      console.log(`  - ${t.event_type}: scheduled_email_id=${t.scheduled_email_id}, created_at=${t.created_at}`);
    });
  } else {
    console.log('❌ No tracking events found');
  }

  // Check scheduled emails that should have tracking
  const { data: scheduledWithTracking } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status')
    .eq('status', 'delivered')
    .limit(5);

  console.log('\n📧 Sample delivered emails:', scheduledWithTracking?.length || 0);
  if (scheduledWithTracking && scheduledWithTracking.length > 0) {
    for (const email of scheduledWithTracking) {
      const { data: events } = await supabase
        .from('email_tracking')
        .select('event_type, created_at')
        .eq('scheduled_email_id', email.id);
      
      console.log(`  ${email.to_email}: ${events?.length || 0} tracking events`, events?.map(e => e.event_type) || []);
    }
  }
}

checkTracking().catch(console.error);
