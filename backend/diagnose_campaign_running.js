const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '55205d7b-9ebf-414a-84bc-52c8b724dd30';

async function diagnoseCampaign() {
  console.log('='.repeat(80));
  console.log('CAMPAIGN DIAGNOSTICS');
  console.log('='.repeat(80));
  console.log(`Campaign ID: ${CAMPAIGN_ID}\n`);

  // 1. Campaign Status
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, status, created_at, updated_at')
    .eq('id', CAMPAIGN_ID)
    .single();

  console.log('📊 CAMPAIGN STATUS:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Updated: ${campaign.updated_at}`);
  console.log('');

  // 2. Check scheduled emails
  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled');

  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .in('status', ['sent', 'delivered']);

  console.log('📧 EMAIL STATUS:');
  console.log(`   Scheduled: ${scheduledCount}`);
  console.log(`   Sent/Delivered: ${sentCount}`);
  console.log('');

  // 3. Check next emails to send
  const now = new Date();
  const { data: overdue } = await supabase
    .from('scheduled_emails')
    .select('to_email, send_at, email_account_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .lt('send_at', now.toISOString())
    .order('send_at', { ascending: true })
    .limit(10);

  console.log('⏰ OVERDUE EMAILS (should have been sent):');
  if (!overdue || overdue.length === 0) {
    console.log('   No overdue emails - all future scheduled');
  } else {
    console.log(`   Found ${overdue.length} overdue emails:`);
    overdue.forEach((email, i) => {
      const sendTime = new Date(email.send_at);
      const minutesAgo = Math.round((now - sendTime) / (1000 * 60));
      console.log(`   ${i + 1}. ${email.to_email}`);
      console.log(`      Scheduled: ${minutesAgo} minutes ago`);
      console.log(`      Account: ...${email.email_account_id?.substring(0, 8)}`);
    });
  }
  console.log('');

  // 4. Check next upcoming emails
  const { data: upcoming } = await supabase
    .from('scheduled_emails')
    .select('to_email, send_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .gte('send_at', now.toISOString())
    .order('send_at', { ascending: true })
    .limit(3);

  console.log('📅 NEXT UPCOMING EMAILS:');
  if (!upcoming || upcoming.length === 0) {
    console.log('   No upcoming emails');
  } else {
    upcoming.forEach((email, i) => {
      const sendTime = new Date(email.send_at);
      const minutesUntil = Math.round((sendTime - now) / (1000 * 60));
      console.log(`   ${i + 1}. ${email.to_email}`);
      console.log(`      In ${minutesUntil} minutes (${email.send_at})`);
    });
  }
  console.log('');

  // 5. Check backend server
  console.log('🖥️  BACKEND SERVER CHECK:');
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    console.log('   Server running: ✅');
    console.log(`   Response: ${JSON.stringify(data)}`);
  } catch (error) {
    console.log('   Server running: ❌ NOT RUNNING');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // 6. Check cron processor
  console.log('🤖 CRON PROCESSOR CHECK:');
  try {
    const response = await fetch('http://localhost:4000/api/health/cron');
    const data = await response.json();
    console.log(`   Cron running: ${data.cronProcessor?.running ? '✅ RUNNING' : '❌ NOT RUNNING'}`);
    console.log(`   Status: ${data.cronProcessor?.status}`);
  } catch (error) {
    console.log(`   Cron check failed: ${error.message}`);
  }
  console.log('');

  console.log('='.repeat(80));
  console.log('🎯 DIAGNOSIS:');
  console.log('='.repeat(80));

  const issues = [];

  if (campaign.status !== 'active') {
    issues.push(`Campaign is not active (status: ${campaign.status})`);
  }

  if (scheduledCount === 0) {
    issues.push('No emails scheduled');
  }

  if (overdue && overdue.length > 0) {
    issues.push(`${overdue.length} emails are overdue - cron processor not running`);
  }

  if (issues.length === 0) {
    console.log('✅ Campaign appears healthy');
    console.log('');
    console.log('If emails are not being sent:');
    console.log('1. Make sure cron processor is running: npm run cron:dev');
    console.log('2. Check backend server is running: npm run dev:backend');
  } else {
    console.log('⚠️  ISSUES FOUND:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    console.log('');
    console.log('SOLUTIONS:');
    if (overdue && overdue.length > 0) {
      console.log('   → Start cron processor: npm run cron:dev');
    }
    if (campaign.status !== 'active') {
      console.log('   → Activate campaign from UI');
    }
  }

  console.log('');
  console.log('='.repeat(80));
}

diagnoseCampaign().catch(console.error);
