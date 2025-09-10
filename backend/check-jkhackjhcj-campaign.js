#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkJkhackjhcjCampaign() {
  try {
    console.log('🔍 Checking campaign: jkhackjhcj\n');
    
    // Find the campaign by name
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .ilike('name', '%jkhackjhcj%')
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Error finding campaign jkhackjhcj:', campaignError);
      return;
    }
    
    console.log(`📋 Campaign: ${campaign.name} (${campaign.id})`);
    console.log(`   Created: ${campaign.created_at}`);
    console.log(`   Status: ${campaign.status}`);
    
    const config = campaign.config;
    console.log(`   Interval: ${config.sendingInterval} minutes`);
    console.log(`   Accounts: ${config.emailAccounts?.length || 0}`);
    
    // Get scheduled emails
    const { data: scheduledEmails, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, email_account_id, to_email, created_at')
      .eq('campaign_id', campaign.id)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(10);

    if (emailError) {
      console.error('❌ Error fetching scheduled emails:', emailError);
      return;
    }

    if (!scheduledEmails?.length) {
      console.log('⚠️ No scheduled emails found');
      return;
    }

    console.log(`\n📧 Scheduled emails (first 10 of ${scheduledEmails.length}):`);
    scheduledEmails.forEach((email, i) => {
      const sendTime = new Date(email.send_at);
      const createdTime = new Date(email.created_at);
      
      console.log(`${i+1}. ${sendTime.toISOString()} → ${email.to_email}`);
      console.log(`   Account: ${email.email_account_id}`);
      console.log(`   Created: ${createdTime.toISOString()}`);
      
      if (i > 0) {
        const prevSendTime = new Date(scheduledEmails[i-1].send_at);
        const gapMinutes = (sendTime - prevSendTime) / (1000 * 60);
        console.log(`   Gap from previous: ${gapMinutes.toFixed(1)} minutes`);
      }
      console.log();
    });
    
    // Check if massive gaps exist
    const gaps = [];
    for (let i = 1; i < scheduledEmails.length; i++) {
      const currentTime = new Date(scheduledEmails[i].send_at);
      const prevTime = new Date(scheduledEmails[i-1].send_at);
      const gapMinutes = (currentTime - prevTime) / (1000 * 60);
      gaps.push(gapMinutes);
    }
    
    const maxGap = Math.max(...gaps);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    
    console.log(`📊 Gap Analysis:`);
    console.log(`   Max gap: ${maxGap.toFixed(1)} minutes`);
    console.log(`   Average gap: ${avgGap.toFixed(1)} minutes`);
    console.log(`   Expected gap: ${config.sendingInterval / config.emailAccounts.length} minutes`);
    
    if (maxGap > 1000) { // More than 1000 minutes is clearly wrong
      console.log('\n🚨 MASSIVE GAP DETECTED!');
      console.log('This confirms the scheduling algorithm bug.');
      
      // Show the creation timestamp to understand when this was created
      console.log(`\nCampaign created at: ${campaign.created_at}`);
      console.log('Was this created after the recent algorithm changes?');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkJkhackjhcjCampaign();