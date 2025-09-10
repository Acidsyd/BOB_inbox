#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkScheduledEmails() {
  try {
    console.log('🔍 Detailed check of scheduled emails for next 30 minutes...\n');
    
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`⏰ Checking until: ${thirtyMinutesFromNow.toISOString()}\n`);
    
    // Get scheduled emails in the next 30 minutes
    const { data: scheduledEmails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        campaign_id,
        email_account_id,
        send_at,
        status,
        to_email,
        subject,
        is_follow_up,
        sequence_step
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
    
    // Get campaign and account details separately
    const campaignIds = [...new Set(scheduledEmails.map(e => e.campaign_id))];
    const accountIds = [...new Set(scheduledEmails.map(e => e.email_account_id))];
    
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .in('id', campaignIds);
    
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('id, email, status')
      .in('id', accountIds);
    
    // Create lookup maps
    const campaignMap = {};
    campaigns?.forEach(c => { campaignMap[c.id] = c; });
    
    const accountMap = {};
    emailAccounts?.forEach(a => { accountMap[a.id] = a; });
    
    // Display results
    scheduledEmails.forEach((email, index) => {
      const sendTime = new Date(email.send_at);
      const minutesUntilSend = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
      const campaign = campaignMap[email.campaign_id];
      const account = accountMap[email.email_account_id];
      
      console.log(`${index + 1}. Email ID: ${email.id}`);
      console.log(`   Campaign: ${campaign?.name || 'Unknown'} (${email.campaign_id})`);
      console.log(`   Campaign Status: ${campaign?.status || 'Unknown'}`);
      console.log(`   Account: ${account?.email || 'Unknown'} (${email.email_account_id})`);
      console.log(`   Account Status: ${account?.status || 'Unknown'}`);
      console.log(`   To: ${email.to_email}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Send at: ${sendTime.toISOString()}`);
      console.log(`   Minutes until send: ${minutesUntilSend}`);
      console.log(`   Is Follow-up: ${email.is_follow_up}`);
      console.log(`   Sequence Step: ${email.sequence_step}`);
      console.log(`   Status: ${email.status}\n`);
    });
    
    // Group by campaign
    const byCampaign = {};
    scheduledEmails.forEach(email => {
      const campaignId = email.campaign_id;
      if (!byCampaign[campaignId]) {
        const campaign = campaignMap[campaignId];
        byCampaign[campaignId] = {
          name: campaign?.name || 'Unknown',
          status: campaign?.status || 'Unknown',
          emails: []
        };
      }
      byCampaign[campaignId].emails.push(email);
    });
    
    console.log('📊 Summary by campaign:');
    Object.keys(byCampaign).forEach(campaignId => {
      const campaign = byCampaign[campaignId];
      console.log(`   ${campaign.name} (${campaign.status}): ${campaign.emails.length} emails`);
    });
    
    // Group by account
    const byAccount = {};
    scheduledEmails.forEach(email => {
      const accountId = email.email_account_id;
      if (!byAccount[accountId]) {
        const account = accountMap[accountId];
        byAccount[accountId] = {
          email: account?.email || 'Unknown',
          status: account?.status || 'Unknown',
          emails: []
        };
      }
      byAccount[accountId].emails.push(email);
    });
    
    console.log('\n📊 Summary by email account:');
    Object.keys(byAccount).forEach(accountId => {
      const account = byAccount[accountId];
      console.log(`   ${account.email} (${account.status}): ${account.emails.length} emails`);
    });
    
    // Show timeline for next few minutes
    console.log('\n⏰ Timeline for next 10 minutes:');
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const nearTerm = scheduledEmails.filter(email => 
      new Date(email.send_at) <= tenMinutesFromNow
    );
    
    nearTerm.forEach(email => {
      const sendTime = new Date(email.send_at);
      const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
      const campaign = campaignMap[email.campaign_id];
      const account = accountMap[email.email_account_id];
      
      console.log(`   ${minutesUntil}m: ${campaign?.name} → ${account?.email} → ${email.to_email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkScheduledEmails();
