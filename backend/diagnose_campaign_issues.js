const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '943f4c22-5898-4137-b86a-beb99e625188';

async function diagnoseCampaign() {
  console.log('🔍 COMPREHENSIVE CAMPAIGN DIAGNOSTICS\n');
  console.log('='.repeat(80));
  console.log(`Campaign ID: ${CAMPAIGN_ID}`);
  console.log('='.repeat(80));
  console.log('');

  // 1. Campaign Status
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('name, status, config, created_at, updated_at')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campaignError) {
    console.error('❌ Failed to fetch campaign:', campaignError);
    return;
  }

  console.log('📊 CAMPAIGN INFO:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Created: ${campaign.created_at}`);
  console.log(`   Updated: ${campaign.updated_at}`);
  console.log(`   Interval: ${campaign.config?.sendingInterval || 'N/A'} minutes`);
  console.log(`   Emails per day: ${campaign.config?.emailsPerDay || 'N/A'}`);
  console.log(`   Sending hours: ${JSON.stringify(campaign.config?.sendingHours || {})}`);
  console.log('');

  // 2. Count emails by status
  console.log('📧 EMAIL STATUS COUNTS:');

  const { count: totalCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID);

  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled');

  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'sent');

  const { count: deliveredCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'delivered');

  const { count: failedCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'failed');

  const { count: bouncedCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'bounced');

  console.log(`   Total: ${totalCount || 0}`);
  console.log(`   Scheduled: ${scheduledCount || 0}`);
  console.log(`   Sent: ${sentCount || 0}`);
  console.log(`   Delivered: ${deliveredCount || 0}`);
  console.log(`   Failed: ${failedCount || 0}`);
  console.log(`   Bounced: ${bouncedCount || 0}`);
  console.log('');

  // 3. Recent Activity (last 10 sent emails)
  console.log('📤 RECENT ACTIVITY (Last 10 sent/delivered):');
  const { data: recentSent } = await supabase
    .from('scheduled_emails')
    .select('to_email, status, sent_at, send_at, email_account_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .in('status', ['sent', 'delivered'])
    .order('sent_at', { ascending: false })
    .limit(10);

  if (!recentSent || recentSent.length === 0) {
    console.log('   ⚠️  NO RECENT SENT EMAILS FOUND');
  } else {
    recentSent.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.to_email} - ${email.status}`);
      console.log(`      Sent at: ${email.sent_at || 'N/A'}`);
      console.log(`      Account: ${email.email_account_id?.substring(0, 8)}...`);
    });
  }
  console.log('');

  // 4. Scheduled Activity (next 10 upcoming emails)
  console.log('📅 UPCOMING SCHEDULED EMAILS (Next 10):');
  const { data: upcomingEmails } = await supabase
    .from('scheduled_emails')
    .select('to_email, send_at, email_account_id, status')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(10);

  if (!upcomingEmails || upcomingEmails.length === 0) {
    console.log('   ⚠️  NO UPCOMING SCHEDULED EMAILS');
  } else {
    upcomingEmails.forEach((email, i) => {
      const sendTime = new Date(email.send_at);
      const now = new Date();
      const minutesUntil = Math.round((sendTime - now) / (1000 * 60));
      console.log(`   ${i + 1}. ${email.to_email}`);
      console.log(`      Send at: ${email.send_at} (in ${minutesUntil} minutes)`);
      console.log(`      Account: ${email.email_account_id?.substring(0, 8)}...`);
    });

    // Check for timing issues
    if (upcomingEmails.length >= 2) {
      console.log('');
      console.log('⏰ TIMING ANALYSIS:');
      for (let i = 1; i < upcomingEmails.length; i++) {
        const prev = new Date(upcomingEmails[i - 1].send_at);
        const curr = new Date(upcomingEmails[i].send_at);
        const minutesDiff = Math.round((curr - prev) / (1000 * 60));
        console.log(`   Gap ${i}: ${minutesDiff} minutes (expected: ${campaign.config?.sendingInterval || 'N/A'})`);

        if (minutesDiff < (campaign.config?.sendingInterval || 15)) {
          console.log(`      ⚠️  WARNING: Gap shorter than configured interval!`);
        }
      }
    }
  }
  console.log('');

  // 5. Analytics Data (tracking)
  console.log('📊 TRACKING DATA:');

  const { count: opensCount } = await supabase
    .from('email_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('event_type', 'open');

  const { count: clicksCount } = await supabase
    .from('email_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('event_type', 'click');

  console.log(`   Opens: ${opensCount || 0}`);
  console.log(`   Clicks: ${clicksCount || 0}`);

  if ((opensCount > 0 || clicksCount > 0) && (sentCount === 0 && deliveredCount === 0)) {
    console.log('   ⚠️  INCONSISTENCY: Tracking data exists but no sent/delivered emails!');
  }
  console.log('');

  // 6. Sample tracking events
  if (opensCount > 0 || clicksCount > 0) {
    console.log('📋 RECENT TRACKING EVENTS:');
    const { data: trackingEvents } = await supabase
      .from('email_tracking')
      .select('event_type, tracking_token, tracked_at, campaign_id')
      .eq('campaign_id', CAMPAIGN_ID)
      .order('tracked_at', { ascending: false })
      .limit(5);

    trackingEvents?.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.event_type} - ${event.tracked_at}`);
      console.log(`      Token: ${event.tracking_token?.substring(0, 16)}...`);
    });
    console.log('');
  }

  // 7. Check for orphaned tracking data
  console.log('🔍 DATA CONSISTENCY CHECK:');

  // Get tracking tokens from tracking table
  const { data: trackingTokens } = await supabase
    .from('email_tracking')
    .select('tracking_token')
    .eq('campaign_id', CAMPAIGN_ID)
    .limit(10);

  if (trackingTokens && trackingTokens.length > 0) {
    console.log(`   Checking ${trackingTokens.length} tracking tokens...`);

    for (const { tracking_token } of trackingTokens) {
      const { data: emailWithToken } = await supabase
        .from('scheduled_emails')
        .select('id, status, to_email')
        .eq('tracking_token', tracking_token)
        .single();

      if (!emailWithToken) {
        console.log(`   ⚠️  Orphaned tracking token: ${tracking_token?.substring(0, 16)}... (no matching email)`);
      } else {
        console.log(`   ✅ Token ${tracking_token?.substring(0, 16)}... -> ${emailWithToken.to_email} (${emailWithToken.status})`);
      }
    }
  }
  console.log('');

  // 8. Check cron processor status (look for recent processing)
  console.log('🤖 CRON PROCESSOR CHECK:');
  const { data: recentProcessing } = await supabase
    .from('scheduled_emails')
    .select('sent_at, status')
    .eq('campaign_id', CAMPAIGN_ID)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1);

  if (!recentProcessing || recentProcessing.length === 0) {
    console.log('   ⚠️  No emails have been sent yet');
  } else {
    const lastSentTime = new Date(recentProcessing[0].sent_at);
    const now = new Date();
    const minutesSince = Math.round((now - lastSentTime) / (1000 * 60));
    console.log(`   Last email sent: ${recentProcessing[0].sent_at}`);
    console.log(`   Time since last send: ${minutesSince} minutes ago`);

    if (minutesSince > 10 && campaign.status === 'active') {
      console.log(`   ⚠️  WARNING: No emails sent in ${minutesSince} minutes (campaign is active)`);
      console.log(`   Possible cron processor issue or all scheduled emails are in the future`);
    }
  }
  console.log('');

  // 9. Summary
  console.log('='.repeat(80));
  console.log('🎯 SUMMARY:');
  console.log('='.repeat(80));

  const issues = [];

  if (campaign.status !== 'active') {
    issues.push(`Campaign status is '${campaign.status}' (not active)`);
  }

  if ((opensCount > 0 || clicksCount > 0) && (sentCount === 0 && deliveredCount === 0)) {
    issues.push('Tracking data exists without sent/delivered emails (data inconsistency)');
  }

  if (scheduledCount === 0 && campaign.status === 'active') {
    issues.push('No scheduled emails remaining (campaign may be complete or crashed)');
  }

  if (failedCount > 10) {
    issues.push(`High number of failed emails: ${failedCount}`);
  }

  if (issues.length === 0) {
    console.log('✅ No critical issues detected');
  } else {
    console.log('⚠️  ISSUES DETECTED:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  console.log('');
  console.log('='.repeat(80));
}

diagnoseCampaign().catch(console.error);
