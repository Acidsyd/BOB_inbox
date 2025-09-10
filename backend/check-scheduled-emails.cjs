#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkScheduledEmails() {
  try {
    console.log('🔍 Checking scheduled emails for next 30 minutes...\n');
    
    // Get current time and 30 minutes from now
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`⏰ Checking until: ${thirtyMinutesFromNow.toISOString()}\n`);
    
    // Query scheduled emails
    const { data: scheduledEmails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        campaign_id,
        email_account_id,
        send_at,
        status,
        campaigns!inner(name, organization_id),
        email_accounts!inner(email)
      `)
      .eq('status', 'scheduled')
      .gte('send_at', now.toISOString())
      .lte('send_at', thirtyMinutesFromNow.toISOString())
      .order('send_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error querying scheduled emails:', error);
      return;
    }
    
    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.log('📭 No emails scheduled to send in the next 30 minutes');
      return;
    }
    
    console.log(`📧 Found ${scheduledEmails.length} emails scheduled in the next 30 minutes:\n`);
    
    // Display results
    scheduledEmails.forEach((email, index) => {
      const sendTime = new Date(email.send_at);
      const minutesUntilSend = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
      
      console.log(`${index + 1}. Email ID: ${email.id}`);
      console.log(`   Campaign: ${email.campaigns.name} (ID: ${email.campaign_id})`);
      console.log(`   Account: ${email.email_accounts.email} (ID: ${email.email_account_id})`);
      console.log(`   Send at: ${sendTime.toISOString()}`);
      console.log(`   Minutes until send: ${minutesUntilSend}`);
      console.log(`   Status: ${email.status}`);
      console.log(`   Organization: ${email.campaigns.organization_id}\n`);
    });
    
    // Group by campaign
    const byCampaign = {};
    scheduledEmails.forEach(email => {
      const campaignId = email.campaign_id;
      if (!byCampaign[campaignId]) {
        byCampaign[campaignId] = {
          name: email.campaigns.name,
          emails: []
        };
      }
      byCampaign[campaignId].emails.push(email);
    });
    
    console.log('📊 Summary by campaign:');
    Object.keys(byCampaign).forEach(campaignId => {
      const campaign = byCampaign[campaignId];
      console.log(`   ${campaign.name}: ${campaign.emails.length} emails`);
    });
    
    // Group by account
    const byAccount = {};
    scheduledEmails.forEach(email => {
      const accountId = email.email_account_id;
      if (!byAccount[accountId]) {
        byAccount[accountId] = {
          email: email.email_accounts.email,
          emails: []
        };
      }
      byAccount[accountId].emails.push(email);
    });
    
    console.log('\n📊 Summary by email account:');
    Object.keys(byAccount).forEach(accountId => {
      const account = byAccount[accountId];
      console.log(`   ${account.email}: ${account.emails.length} emails`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkScheduledEmails();
