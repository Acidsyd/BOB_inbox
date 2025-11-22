require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeSuspiciousPatterns() {
  const { data: events, error } = await supabase
    .from('email_tracking_events')
    .select('event_type, user_agent, ip_address, created_at, scheduled_email_id')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('🔍 SUSPICIOUS PATTERN ANALYSIS');
  console.log('='.repeat(80));

  // Analyze Chrome 109 events (likely bots)
  const chrome109 = events.filter(e => e.user_agent && e.user_agent.includes('Chrome/109'));
  console.log(`\nChrome 109 Events (Likely Email Security Scanners): ${chrome109.length}`);

  // Analyze incomplete user agents
  const incompleteUA = events.filter(e => e.user_agent === 'Mozilla/5.0');
  console.log(`Incomplete User Agents ('Mozilla/5.0' only): ${incompleteUA.length}`);

  // Check timing patterns (security scanners are instant)
  console.log(`\n⏱️  TIMING ANALYSIS (First 20 events):`);
  console.log('Events with <5 second gaps (likely bot scans):');

  const sortedEvents = events.slice(0, 20);
  for (let i = 1; i < sortedEvents.length; i++) {
    const prev = new Date(sortedEvents[i-1].created_at);
    const curr = new Date(sortedEvents[i].created_at);
    const diffSeconds = Math.abs(prev - curr) / 1000;

    if (diffSeconds < 5) {
      const ua = sortedEvents[i].user_agent ? sortedEvents[i].user_agent.substring(0, 50) : 'No UA';
      console.log(`  ⚠️ ${diffSeconds.toFixed(1)}s - ${sortedEvents[i].event_type} (${ua}...)`);
    }
  }

  // Check for rapid-fire events (bot pattern)
  const uniqueEmails = new Set(events.map(e => e.scheduled_email_id));
  console.log(`\n📧 Email Statistics:`);
  console.log(`   - Unique emails tracked: ${uniqueEmails.size}`);
  console.log(`   - Total events: ${events.length}`);
  console.log(`   - Events per email: ${(events.length / uniqueEmails.size).toFixed(2)}`);

  // Calculate likely bot percentage
  const likelyBots = chrome109.length + incompleteUA.length;
  const botPercentage = (likelyBots / events.length * 100).toFixed(1);

  console.log(`\n🤖 ESTIMATED BOT TRAFFIC: ${botPercentage}%`);
  console.log(`   - Chrome 109 (old version): ${chrome109.length} events`);
  console.log(`   - Incomplete user agents: ${incompleteUA.length} events`);
  console.log(`   - Likely real humans: ${events.length - likelyBots} events`);

  console.log('\n📋 RECOMMENDATION:');
  if (botPercentage > 30) {
    console.log('   ⚠️  HIGH BOT TRAFFIC DETECTED!');
    console.log('   Your tracking numbers are heavily inflated by security scanners.');
    console.log('   Real engagement is likely 50-70% lower than reported.');
  }
}

analyzeSuspiciousPatterns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
