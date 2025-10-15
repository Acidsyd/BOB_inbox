#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaignHistory() {
  const campaignId = '82da0eb6-131f-4880-b7cd-0b3872e7cfdd';
  console.log('🕒 Campaign History Analysis');
  console.log('============================');

  // Check campaign basic info
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('status, created_at, updated_at, started_at, paused_at, stopped_at')
    .eq('id', campaignId)
    .single();

  if (campaign) {
    console.log('📅 Campaign Timeline:');
    console.log('  Created:', new Date(campaign.created_at).toLocaleString('en-US', { timeZone: 'Europe/Rome' }), 'CEST');
    console.log('  Updated:', new Date(campaign.updated_at).toLocaleString('en-US', { timeZone: 'Europe/Rome' }), 'CEST');
    console.log('  Started:', campaign.started_at ? new Date(campaign.started_at).toLocaleString('en-US', { timeZone: 'Europe/Rome' }) + ' CEST' : 'Never started');
    console.log('  Paused:', campaign.paused_at ? new Date(campaign.paused_at).toLocaleString('en-US', { timeZone: 'Europe/Rome' }) + ' CEST' : 'Never paused');
    console.log('  Stopped:', campaign.stopped_at ? new Date(campaign.stopped_at).toLocaleString('en-US', { timeZone: 'Europe/Rome' }) + ' CEST' : 'Never stopped');
    console.log('  Current Status:', campaign.status);
  }

  // Check ALL scheduled emails that ever existed for this campaign (including sent/failed ones)
  const { data: allEmails } = await supabase
    .from('scheduled_emails')
    .select('id, status, send_at, created_at, updated_at, sequence_step')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  console.log('');
  console.log('📧 All Scheduled Emails Ever Created:', allEmails?.length || 0);

  if (allEmails && allEmails.length > 0) {
    // Group by status
    const statusGroups = {};
    allEmails.forEach(email => {
      if (!statusGroups[email.status]) statusGroups[email.status] = [];
      statusGroups[email.status].push(email);
    });

    console.log('📊 Email Status Summary:');
    Object.keys(statusGroups).forEach(status => {
      console.log(`  ${status}: ${statusGroups[status].length} emails`);
    });

    console.log('');
    console.log('🕐 Timeline of First 10 Emails:');
    allEmails.slice(0, 10).forEach((email, index) => {
      const created = new Date(email.created_at);
      const sendAt = new Date(email.send_at);
      console.log(`  ${index + 1}. Created: ${created.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} CEST`);
      console.log(`     Send at: ${sendAt.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} CEST`);
      console.log(`     Status: ${email.status}, Step: ${email.sequence_step || 0}`);
      console.log('');
    });

    // Check if there are recent emails
    const now = new Date();
    const recent = allEmails.filter(email => {
      const created = new Date(email.created_at);
      return (now - created) < 24 * 60 * 60 * 1000; // Last 24 hours
    });

    console.log('📅 Emails Created in Last 24 Hours:', recent.length);
  } else {
    console.log('❌ No scheduled emails have ever been created for this campaign!');
    console.log('');
    console.log('🚨 ISSUE IDENTIFIED: Campaign was never properly started');
    console.log('💡 SOLUTION: The campaign needs to be started to create scheduled emails');
    console.log('');
    console.log('🔧 To fix this:');
    console.log('   1. Go to the campaign page');
    console.log('   2. Click the "Start Campaign" button');
    console.log('   3. This will create scheduled_emails records for all leads');
  }

  // Additional check - see if there are other campaigns that DO have scheduled emails
  console.log('');
  console.log('🔍 Comparison: Other Active Campaigns with Scheduled Emails');
  const { data: otherCampaigns } = await supabase
    .from('campaigns')
    .select('id, name, status, (scheduled_emails(count))')
    .eq('status', 'active')
    .neq('id', campaignId)
    .limit(5);

  if (otherCampaigns && otherCampaigns.length > 0) {
    otherCampaigns.forEach(camp => {
      const emailCount = camp.scheduled_emails?.[0]?.count || 0;
      console.log(`  📋 ${camp.name}: ${emailCount} scheduled emails`);
    });
  } else {
    console.log('  No other active campaigns found');
  }
}

checkCampaignHistory().catch(console.error);