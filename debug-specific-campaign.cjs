#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaign() {
  const campaignId = '82da0eb6-131f-4880-b7cd-0b3872e7cfdd';
  console.log('🔍 Investigating Campaign:', campaignId);
  console.log('===========================================================');

  // Check campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    console.log('❌ Campaign error:', campaignError);
    return;
  }

  if (!campaign) {
    console.log('❌ Campaign not found');
    return;
  }

  console.log('📋 Campaign Status:', campaign.status);
  console.log('📧 Campaign Name:', campaign.name);
  console.log('🗓️  Created:', campaign.created_at);
  console.log('⚙️  Config keys:', Object.keys(campaign.config || {}));
  console.log('📝 Lead List ID:', campaign.config?.leadListId);
  console.log('📬 Email Accounts:', campaign.config?.emailAccounts?.length || 0);
  console.log('⏰ Sending Hours:', `${campaign.config?.sendingHours?.start || 'N/A'}:00-${campaign.config?.sendingHours?.end || 'N/A'}:00`);
  console.log('📊 Emails Per Day:', campaign.config?.emailsPerDay || 'N/A');
  console.log('⏱️  Sending Interval:', campaign.config?.sendingInterval || 'N/A', 'minutes');

  // Check scheduled emails for this campaign
  const { data: scheduledEmails, error: emailsError } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('send_at', { ascending: true });

  console.log('');
  console.log('📧 Scheduled Emails Count:', scheduledEmails?.length || 0);

  if (scheduledEmails && scheduledEmails.length > 0) {
    console.log('📅 First 5 Scheduled Emails:');
    scheduledEmails.slice(0, 5).forEach((email, index) => {
      const sendTime = new Date(email.send_at);
      console.log(`  ${index + 1}. Status: ${email.status}, Send at: ${sendTime.toLocaleString('en-US', { timeZone: 'Europe/Rome' })} CEST`);
    });

    // Check status distribution
    const statusCounts = {};
    scheduledEmails.forEach(email => {
      statusCounts[email.status] = (statusCounts[email.status] || 0) + 1;
    });
    console.log('📊 Status Distribution:', statusCounts);
  } else {
    console.log('❌ No scheduled emails found for this campaign');

    // Debugging why no emails were scheduled
    console.log('');
    console.log('🔍 DEBUGGING: Why no scheduled emails?');
    console.log('===========================================');

    // Check if lead list exists and has leads
    if (campaign.config?.leadListId) {
      console.log('✅ Lead List ID found:', campaign.config.leadListId);

      const { data: leadList, error: listError } = await supabase
        .from('lead_lists')
        .select('*')
        .eq('id', campaign.config.leadListId)
        .single();

      if (leadList) {
        console.log('✅ Lead List exists:', leadList.name);

        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, email')
          .eq('lead_list_id', campaign.config.leadListId)
          .limit(10);

        console.log('👥 Leads in list:', leads?.length || 0);
        if (leads && leads.length > 0) {
          console.log('📧 Sample leads:');
          leads.slice(0, 5).forEach((lead, index) => console.log(`  ${index + 1}. ${lead.email}`));
        } else {
          console.log('❌ No leads found in the lead list!');
        }
      } else {
        console.log('❌ Lead List not found!', listError);
      }
    } else {
      console.log('❌ No leadListId in campaign config!');
    }

    // Check if email accounts exist and are properly configured
    if (campaign.config?.emailAccounts && campaign.config.emailAccounts.length > 0) {
      console.log('');
      console.log('✅ Email Accounts configured:', campaign.config.emailAccounts.length);

      for (const accountId of campaign.config.emailAccounts) {
        // Check OAuth2 accounts
        const { data: oauthAccount } = await supabase
          .from('oauth2_tokens')
          .select('email, status')
          .eq('id', accountId)
          .single();

        if (oauthAccount) {
          console.log(`  📧 OAuth2: ${oauthAccount.email} (status: ${oauthAccount.status})`);
        } else {
          // Check SMTP accounts
          const { data: smtpAccount } = await supabase
            .from('email_accounts')
            .select('email, provider')
            .eq('id', accountId)
            .single();

          if (smtpAccount) {
            console.log(`  📧 SMTP: ${smtpAccount.email} (${smtpAccount.provider})`);
          } else {
            console.log(`  ❌ Account ${accountId} not found in either table!`);
          }
        }
      }
    } else {
      console.log('❌ No email accounts configured in campaign!');
    }

    // Check campaign status
    console.log('');
    console.log('📊 Campaign Analysis:');
    console.log('- Status:', campaign.status, campaign.status === 'active' ? '✅' : '❌');
    console.log('- Has leads:', campaign.config?.leadListId ? '✅' : '❌');
    console.log('- Has email accounts:', (campaign.config?.emailAccounts?.length || 0) > 0 ? '✅' : '❌');
    console.log('- Has sending config:', campaign.config?.emailsPerDay ? '✅' : '❌');
  }
}

checkCampaign().catch(console.error);