const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaignStatus() {
  const campaignId = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

  console.log('🔍 Checking campaign status and recent activity...\n');

  // Get campaign details
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  console.log('📊 CAMPAIGN STATUS');
  console.log('   Name:', campaign.name);
  console.log('   Status:', campaign.status);
  console.log('   Created:', campaign.created_at);
  console.log('   Started:', campaign.started_at || 'Not started');
  console.log('   Updated:', campaign.updated_at);
  console.log('   Stopped:', campaign.stopped_at || 'Not stopped');

  // Check scheduled emails status
  const { data: emailStats } = await supabase
    .from('scheduled_emails')
    .select('status')
    .eq('campaign_id', campaignId);

  const statusCounts = {};
  emailStats.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });

  console.log('\n📧 EMAIL STATUS BREAKDOWN:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  // Check for recently created scheduled emails (from restart)
  const { data: recentEmails } = await supabase
    .from('scheduled_emails')
    .select('id, status, send_at, created_at, updated_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n🆕 MOST RECENTLY CREATED EMAILS:');
  recentEmails.forEach((e, i) => {
    console.log(`   [${i + 1}] Created: ${e.created_at} | Status: ${e.status} | Send: ${e.send_at}`);
  });

  // Check the oldest scheduled email
  const { data: oldestScheduled } = await supabase
    .from('scheduled_emails')
    .select('id, send_at, updated_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(1)
    .single();

  console.log('\n⏰ NEXT SCHEDULED EMAIL:');
  console.log(`   Send at: ${oldestScheduled?.send_at || 'None'}`);
  console.log(`   Updated: ${oldestScheduled?.updated_at || 'None'}`);

  const now = new Date();
  if (oldestScheduled) {
    const nextSend = new Date(oldestScheduled.send_at);
    const diff = Math.round((nextSend - now) / 60000);
    console.log(`   Time until next send: ${diff} minutes`);
  }

  // Check campaign config
  console.log('\n⚙️  CAMPAIGN CONFIGURATION:');
  console.log('   Sending Interval:', campaign.config.sendingInterval, 'minutes');
  console.log('   Emails Per Hour:', campaign.config.emailsPerHour || 'Not set (defaults to 4)');
  console.log('   Emails Per Day:', campaign.config.emailsPerDay);
  console.log('   Number of Accounts:', campaign.config.emailAccounts?.length || 0);
  console.log('   Timezone:', campaign.config.timezone);
}

checkCampaignStatus().catch(console.error);
