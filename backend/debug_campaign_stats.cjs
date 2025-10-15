require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function debugCampaignStats() {
  console.log('🔍 Debugging campaign stats for:', campaignId);

  // Check ALL emails for this campaign
  const { data: allEmails, error: allError } = await supabase
    .from('scheduled_emails')
    .select('status, sent_at, created_at, organization_id')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (allError) {
    console.error('❌ Error:', allError);
    return;
  }

  console.log(`\n📧 Found ${allEmails.length} total emails for this campaign`);

  // Group by status
  const statusCounts = {};
  allEmails.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });

  console.log('\n📊 Status breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Show organization IDs
  const orgIds = [...new Set(allEmails.map(e => e.organization_id))];
  console.log('\n🏢 Organization IDs:', orgIds);

  // Show sample emails
  console.log('\n📨 Sample emails (first 5):');
  allEmails.slice(0, 5).forEach((e, i) => {
    console.log(`  ${i + 1}. Status: ${e.status}, Sent: ${e.sent_at || 'null'}, Created: ${e.created_at}`);
  });

  // Check last 30 days specifically
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentEmails } = await supabase
    .from('scheduled_emails')
    .select('status, sent_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .gte('sent_at', thirtyDaysAgo.toISOString());

  console.log(`\n📅 Emails with status='sent' in last 30 days: ${recentEmails?.length || 0}`);

  if (recentEmails && recentEmails.length > 0) {
    console.log('📅 Date range:', recentEmails[0].sent_at, 'to', recentEmails[recentEmails.length - 1].sent_at);
  }
}

debugCampaignStats().catch(console.error);
