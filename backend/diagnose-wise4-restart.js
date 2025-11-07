require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const WISE4_CAMPAIGN_ID = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';

async function diagnoseWise4() {
  console.log('🔍 WISE 4 CAMPAIGN DIAGNOSTIC\n');
  console.log('='.repeat(60));

  // 1. Campaign status
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', WISE4_CAMPAIGN_ID)
    .single();

  if (campaignError) {
    console.error('❌ Error fetching campaign:', campaignError);
    return;
  }

  console.log('\n📊 CAMPAIGN STATUS:');
  console.log('   Name:', campaign.name);
  console.log('   Status:', campaign.status);
  console.log('   Created:', campaign.created_at);
  console.log('   Updated:', campaign.updated_at);
  console.log('   Lead List ID:', campaign.config?.leadListId);
  console.log('   Email Accounts:', campaign.config?.emailAccounts?.length || 0);
  console.log('   Sending Interval:', campaign.config?.sendingInterval, 'minutes');
  console.log('   Emails Per Hour:', campaign.config?.emailsPerHour, '(deprecated)');
  console.log('   Timezone:', campaign.config?.timezone);

  // 2. Count scheduled emails by status
  console.log('\n📧 SCHEDULED EMAILS BREAKDOWN:');

  const statuses = ['scheduled', 'sent', 'failed', 'cancelled', 'skipped', 'sending'];

  for (const status of statuses) {
    const { count } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', WISE4_CAMPAIGN_ID)
      .eq('status', status);

    if (count > 0) {
      console.log(`   ${status.padEnd(12)}: ${count}`);
    }
  }

  // 3. Total leads in lead list
  if (campaign.config?.leadListId) {
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', campaign.config.leadListId)
      .eq('status', 'active');

    console.log(`\n👥 LEADS IN LIST: ${totalLeads}`);

    // 4. Check how many leads already have sent emails
    const { count: sentLeads } = await supabase
      .from('scheduled_emails')
      .select('lead_id', { count: 'exact', head: true })
      .eq('campaign_id', WISE4_CAMPAIGN_ID)
      .eq('status', 'sent');

    console.log(`   Already sent to: ${sentLeads} leads`);
    console.log(`   Remaining leads: ${totalLeads - sentLeads}`);
  }

  // 5. Recent scheduled_emails (if any)
  const { data: recentEmails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, send_at, created_at, updated_at')
    .eq('campaign_id', WISE4_CAMPAIGN_ID)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (recentEmails && recentEmails.length > 0) {
    console.log('\n📝 RECENT SCHEDULED EMAILS (last 5):');
    recentEmails.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.to_email}`);
      console.log(`      Status: ${email.status}`);
      console.log(`      Send at: ${email.send_at}`);
      console.log(`      Updated: ${email.updated_at}`);
    });
  } else {
    console.log('\n⚠️  NO SCHEDULED EMAILS FOUND!');
  }

  // 6. Check for recent restart attempts
  console.log('\n🔄 RECENT ACTIVITY:');
  console.log(`   Campaign last updated: ${campaign.updated_at}`);

  const timeSinceUpdate = Date.now() - new Date(campaign.updated_at).getTime();
  console.log(`   Time since update: ${Math.round(timeSinceUpdate / 1000)} seconds ago`);

  // 7. Check if leads exist but no scheduled_emails
  if (campaign.config?.leadListId) {
    const { data: sampleLeads } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name')
      .eq('lead_list_id', campaign.config.leadListId)
      .eq('status', 'active')
      .limit(3);

    if (sampleLeads && sampleLeads.length > 0) {
      console.log('\n📋 SAMPLE LEADS (first 3):');
      sampleLeads.forEach((lead, i) => {
        console.log(`   ${i + 1}. ${lead.email} (${lead.first_name} ${lead.last_name})`);
      });

      // Check if these leads have scheduled_emails
      for (const lead of sampleLeads) {
        const { count: emailCount } = await supabase
          .from('scheduled_emails')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', WISE4_CAMPAIGN_ID)
          .eq('lead_id', lead.id);

        console.log(`      Lead ${lead.email}: ${emailCount} scheduled_emails`);
      }
    }
  }

  // 8. DIAGNOSIS
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DIAGNOSIS:\n');

  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', WISE4_CAMPAIGN_ID)
    .eq('status', 'scheduled');

  if (campaign.status === 'active' && scheduledCount === 0) {
    console.log('❌ PROBLEM CONFIRMED:');
    console.log('   - Campaign status: ACTIVE');
    console.log('   - Scheduled emails: 0');
    console.log('   - This indicates the restart process FAILED\n');

    console.log('🔧 LIKELY CAUSES:');
    console.log('   1. All leads already marked as "sent" (restart skipped them)');
    console.log('   2. Reschedule function crashed silently');
    console.log('   3. Concurrent protection blocked the restart');
    console.log('   4. Database update queries failed\n');

    console.log('💡 RECOMMENDED FIX:');
    console.log('   Run: node backend/fix-wise4-schedule.js');
  } else if (scheduledCount > 0) {
    console.log('✅ Campaign has scheduled emails');
    console.log(`   ${scheduledCount} emails are scheduled`);
  } else {
    console.log('⚠️  Campaign is not active or status unclear');
  }

  console.log('\n' + '='.repeat(60));
}

diagnoseWise4().catch(console.error);
