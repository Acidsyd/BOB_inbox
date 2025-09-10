#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPostFixCampaign() {
  try {
    console.log('🔍 Checking campaigns created AFTER the server restart\n');
    
    // Get campaigns created after 23:12:20 (server restart time)
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .gt('created_at', '2025-09-01T23:12:20')
      .order('created_at', { ascending: false })
      .limit(5);

    if (campaignError) {
      console.error('❌ Error fetching campaigns:', campaignError);
      return;
    }
    
    if (!campaigns?.length) {
      console.log('⚠️ No campaigns found created after the fix');
      console.log('Please create a new campaign to test the fix');
      return;
    }
    
    console.log(`📋 Found ${campaigns.length} campaigns created after the fix:`);
    campaigns.forEach(c => {
      console.log(`- ${c.name} (${c.id}) - ${c.created_at}`);
    });
    
    const campaign = campaigns[0];
    console.log(`\n🔍 Checking latest campaign: ${campaign.name}`);
    console.log(`   Created: ${campaign.created_at}`);
    console.log(`   Interval: ${campaign.config.sendingInterval} minutes`);
    console.log(`   Accounts: ${campaign.config.emailAccounts?.length || 0}`);
    
    // Get scheduled emails
    const { data: scheduledEmails, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(5);

    if (emailError) {
      console.error('❌ Error fetching scheduled emails:', emailError);
      return;
    }

    if (!scheduledEmails?.length) {
      console.log('⚠️ No scheduled emails found');
      return;
    }

    console.log(`\n📧 First 5 scheduled emails:`);
    scheduledEmails.forEach((email, i) => {
      const sendTime = new Date(email.send_at);
      console.log(`${i+1}. ${sendTime.toISOString()} → ${email.to_email}`);
      
      if (i > 0) {
        const prevSendTime = new Date(scheduledEmails[i-1].send_at);
        const gapMs = sendTime - prevSendTime;
        const gapMinutes = gapMs / (1000 * 60);
        
        if (gapMinutes > 1000) {
          console.log(`   🚨 STILL BROKEN: ${gapMinutes.toFixed(0)} minutes gap`);
        } else if (gapMinutes === campaign.config.sendingInterval) {
          console.log(`   ✅ FIXED: ${gapMinutes} minutes gap (correct!)`);
        } else {
          console.log(`   ⚠️ Gap: ${gapMinutes} minutes (expected: ${campaign.config.sendingInterval})`);
        }
      }
      
      // Check if this is a follow-up email (should be none after fix)
      const sequenceData = email.sequence_data || {};
      if (sequenceData.emailIndex > 0) {
        console.log(`   ❌ BUG: This is a follow-up email #${sequenceData.emailIndex} - should only be initial emails!`);
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkPostFixCampaign();