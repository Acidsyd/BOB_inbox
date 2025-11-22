require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function monitorCampaign() {
  const campaignId = 'ea86e19c-b71f-49a4-95aa-1cc0a21734df';

  console.log('📊 Campaign Monitoring - Before Restart\n');

  // Get current stats
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('status, sequence_step')
    .eq('campaign_id', campaignId);

  const stats = {};
  emails?.forEach(e => {
    const key = `step_${e.sequence_step || 0}_${e.status}`;
    stats[key] = (stats[key] || 0) + 1;
  });

  console.log('Current email counts:');
  Object.entries(stats).sort().forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });

  console.log('\n⏳ Waiting 5 seconds, then checking after restart...\n');

  // Wait and check again
  setTimeout(async () => {
    console.log('📊 Campaign Monitoring - After Restart\n');

    const { data: newEmails } = await supabase
      .from('scheduled_emails')
      .select('status, sequence_step')
      .eq('campaign_id', campaignId);

    const newStats = {};
    newEmails?.forEach(e => {
      const key = `step_${e.sequence_step || 0}_${e.status}`;
      newStats[key] = (newStats[key] || 0) + 1;
    });

    console.log('New email counts:');
    Object.entries(newStats).sort().forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });

    // Check for follow-ups created during restart
    const { data: scheduledFollowups } = await supabase
      .from('scheduled_emails')
      .select('to_email, send_at, created_at')
      .eq('campaign_id', campaignId)
      .eq('sequence_step', 1)
      .eq('status', 'scheduled')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Created in last minute
      .limit(10);

    if (scheduledFollowups && scheduledFollowups.length > 0) {
      console.log('\n⚠️  PROBLEM: Follow-ups created during restart!');
      console.log(`   Count: ${scheduledFollowups.length}`);
      console.log('\nSample follow-ups:');
      scheduledFollowups.slice(0, 5).forEach(f => {
        console.log(`  - ${f.to_email} scheduled for ${f.send_at}`);
      });
    } else {
      console.log('\n✅ GOOD: No follow-ups created during restart');
    }

    process.exit(0);
  }, 10000);
}

monitorCampaign().catch(console.error);
