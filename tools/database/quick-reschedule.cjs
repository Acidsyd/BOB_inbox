const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function quickReschedule() {
  try {
    const campaignId = '59c83ca2-3b46-4323-a78f-a43d6ba6ab27';

    console.log('🚀 Quick reschedule starting...\n');

    // Get the first 10 emails to reschedule them properly
    const { data: emails } = await supabase
      .from('scheduled_emails')
      .select('id, send_at')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(10);

    if (!emails || emails.length === 0) {
      console.log('No emails found');
      return;
    }

    console.log(`📧 Rescheduling first ${emails.length} emails`);

    // Start from 2 minutes from now, with 15-minute intervals
    const now = new Date();
    let nextTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const intervalMs = 15 * 60 * 1000; // 15 minutes

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      const { error } = await supabase
        .from('scheduled_emails')
        .update({ send_at: nextTime.toISOString() })
        .eq('id', email.id);

      if (error) {
        console.error(`❌ Error updating email ${i + 1}:`, error);
      } else {
        console.log(`✅ Email ${i + 1}: ${nextTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
      }

      // Add 15 minutes for the next email
      nextTime = new Date(nextTime.getTime() + intervalMs);
    }

    console.log('\n🎉 Quick reschedule complete!');

    // Verify by checking production logs in next minute
    console.log('📋 The cron processor should start sending these emails in the next few minutes.');
    console.log('📊 Check production logs with: ssh -i ~/.ssh/qquadro_production root@104.131.93.55 "pm2 logs mailsender-cron"');

  } catch (error) {
    console.error('❌ Error in quick reschedule:', error);
  }
}

quickReschedule();