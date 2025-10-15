const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '943f4c22-5898-4137-b86a-beb99e625188';

async function checkEmailStatuses() {
  console.log('🔍 DETAILED EMAIL STATUS ANALYSIS\n');

  // Get all unique statuses
  const { data: statusData } = await supabase
    .from('scheduled_emails')
    .select('status')
    .eq('campaign_id', CAMPAIGN_ID);

  const statusCounts = {};
  statusData?.forEach(email => {
    statusCounts[email.status] = (statusCounts[email.status] || 0) + 1;
  });

  console.log('📊 ALL EMAIL STATUSES:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  console.log('');

  // Check emails with sent_at timestamp
  console.log('📤 EMAILS WITH sent_at TIMESTAMP:');
  const { data: emailsWithSentAt } = await supabase
    .from('scheduled_emails')
    .select('to_email, status, sent_at, send_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(10);

  if (!emailsWithSentAt || emailsWithSentAt.length === 0) {
    console.log('   No emails with sent_at timestamp');
  } else {
    emailsWithSentAt.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.to_email}`);
      console.log(`      Status: ${email.status}`);
      console.log(`      Sent at: ${email.sent_at}`);
      console.log(`      Send at: ${email.send_at}`);
    });
  }
  console.log('');

  // Sample emails from the largest status group
  const largestStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0];
  if (largestStatus) {
    console.log(`📋 SAMPLE EMAILS WITH STATUS '${largestStatus[0]}' (showing 5):`);
    const { data: sampleEmails } = await supabase
      .from('scheduled_emails')
      .select('to_email, send_at, sent_at, created_at, updated_at')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('status', largestStatus[0])
      .limit(5);

    sampleEmails?.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.to_email}`);
      console.log(`      send_at: ${email.send_at}`);
      console.log(`      sent_at: ${email.sent_at || 'null'}`);
      console.log(`      created: ${email.created_at}`);
      console.log(`      updated: ${email.updated_at}`);
    });
  }
  console.log('');

  // Check for any tracking tokens
  console.log('🔍 CHECKING TRACKING TOKENS:');
  const { data: emailsWithTracking } = await supabase
    .from('scheduled_emails')
    .select('tracking_token, to_email, status')
    .eq('campaign_id', CAMPAIGN_ID)
    .not('tracking_token', 'is', null)
    .limit(5);

  if (!emailsWithTracking || emailsWithTracking.length === 0) {
    console.log('   No emails with tracking tokens');
  } else {
    console.log(`   Found ${emailsWithTracking.length} emails with tracking tokens:`);
    emailsWithTracking.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.to_email} (${email.status})`);
      console.log(`      Token: ${email.tracking_token?.substring(0, 16)}...`);
    });
  }
  console.log('');

  // Check the campaign's organization for ANY tracking data
  const { data: campaignOrg } = await supabase
    .from('campaigns')
    .select('organization_id')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campaignOrg) {
    console.log('🔍 CHECKING ALL TRACKING DATA FOR ORGANIZATION:');
    const { count: orgTrackingCount } = await supabase
      .from('email_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', campaignOrg.organization_id);

    console.log(`   Total tracking events for organization: ${orgTrackingCount || 0}`);

    if (orgTrackingCount > 0) {
      const { data: recentTracking } = await supabase
        .from('email_tracking')
        .select('campaign_id, event_type, tracked_at')
        .eq('organization_id', campaignOrg.organization_id)
        .order('tracked_at', { ascending: false })
        .limit(10);

      console.log('   Recent tracking events:');
      recentTracking?.forEach((event, i) => {
        const isCurrent = event.campaign_id === CAMPAIGN_ID;
        console.log(`   ${i + 1}. ${event.event_type} - ${event.tracked_at} ${isCurrent ? '(THIS CAMPAIGN)' : `(campaign: ${event.campaign_id})`}`);
      });
    }
  }
}

checkEmailStatuses().catch(console.error);
