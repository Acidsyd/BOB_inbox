#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNext10Minutes() {
  try {
    console.log('🔍 Emails scheduled for next 10 minutes...\n');
    
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`⏰ Checking until: ${tenMinutesFromNow.toISOString()}\n`);
    
    // Get emails in next 10 minutes with full details
    const { data: upcomingEmails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        id,
        campaign_id,
        email_account_id,
        send_at,
        to_email,
        subject,
        status,
        is_follow_up,
        sequence_step
      `)
      .eq('status', 'scheduled')
      .gte('send_at', now.toISOString())
      .lte('send_at', tenMinutesFromNow.toISOString())
      .order('send_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error querying emails:', error);
      return;
    }
    
    console.log(`📧 Found ${upcomingEmails?.length || 0} emails in next 10 minutes:`);
    
    if (upcomingEmails?.length > 0) {
      // Get campaign and account details
      const campaignIds = [...new Set(upcomingEmails.map(e => e.campaign_id))];
      const accountIds = [...new Set(upcomingEmails.map(e => e.email_account_id))];
      
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .in('id', campaignIds);
      
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('id, email')
        .in('id', accountIds);
      
      const campaignMap = {};
      campaigns?.forEach(c => { campaignMap[c.id] = c; });
      
      const accountMap = {};
      accounts?.forEach(a => { accountMap[a.id] = a; });
      
      upcomingEmails.forEach((email, index) => {
        const sendTime = new Date(email.send_at);
        const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
        const campaign = campaignMap[email.campaign_id];
        const account = accountMap[email.email_account_id];
        
        console.log(`\n${index + 1}. Email ID: ${email.id}`);
        console.log(`   Send in: ${minutesUntil} minutes (${sendTime.toISOString()})`);
        console.log(`   Campaign: ${campaign?.name} (status: ${campaign?.status})`);
        console.log(`   From: ${account?.email}`);
        console.log(`   To: ${email.to_email}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Follow-up: ${email.is_follow_up}, Step: ${email.sequence_step}`);
      });
      
      // Group by send time minute
      console.log('\n⏰ Timeline by minute:');
      const byMinute = {};
      upcomingEmails.forEach(email => {
        const sendTime = new Date(email.send_at);
        const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
        if (!byMinute[minutesUntil]) {
          byMinute[minutesUntil] = [];
        }
        byMinute[minutesUntil].push(email);
      });
      
      Object.keys(byMinute).sort((a, b) => parseInt(a) - parseInt(b)).forEach(minute => {
        const emails = byMinute[minute];
        console.log(`   ${minute}m: ${emails.length} email${emails.length > 1 ? 's' : ''}`);
        emails.forEach(email => {
          const campaign = campaignMap[email.campaign_id];
          const account = accountMap[email.email_account_id];
          console.log(`      ${campaign?.name} via ${account?.email} → ${email.to_email}`);
        });
      });
    }
    
    console.log('\n💡 This data will help us test the sequential processing fix!');
    console.log('   The system should send emails one at a time in 15-minute intervals,');
    console.log('   not all at once as they are currently scheduled.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkNext10Minutes();
