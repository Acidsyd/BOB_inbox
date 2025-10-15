const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CAMPAIGN_ID = '55205d7b-9ebf-414a-84bc-52c8b724dd30';

async function checkRecentSent() {
  // Check sent emails in last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: recentSent, error } = await supabase
    .from('scheduled_emails')
    .select('to_email, status, sent_at, updated_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .in('status', ['sent', 'delivered'])
    .gte('updated_at', tenMinutesAgo)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📧 RECENTLY SENT EMAILS (last 10 minutes):');
  if (!recentSent || recentSent.length === 0) {
    console.log('   No emails sent in last 10 minutes');
  } else {
    console.log(`   Found ${recentSent.length} recently sent emails:`);
    recentSent.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.to_email}`);
      console.log(`      Status: ${email.status}`);
      console.log(`      Sent at: ${email.sent_at}`);
      console.log(`      Updated: ${email.updated_at}`);
    });
  }

  // Check total sent count
  const { count: totalSent } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .in('status', ['sent', 'delivered']);

  console.log(`\n📊 TOTAL SENT/DELIVERED: ${totalSent}`);
}

checkRecentSent().catch(console.error);
