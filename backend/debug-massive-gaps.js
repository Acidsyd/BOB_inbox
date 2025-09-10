#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugMassiveGaps() {
  try {
    console.log('🐛 Debugging Massive Gaps Issue\n');
    
    // Get the most recent campaign
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (campaignError || !campaigns?.length) {
      console.error('❌ Error fetching recent campaign:', campaignError);
      return;
    }
    
    const campaign = campaigns[0];
    console.log(`📋 Latest Campaign: ${campaign.name} (${campaign.id})`);
    console.log(`   Created: ${campaign.created_at}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Interval: ${campaign.config.sendingInterval} minutes`);
    console.log(`   Accounts: ${campaign.config.emailAccounts?.length || 0}`);
    
    // Get scheduled emails
    const { data: scheduledEmails, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('*')
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

    console.log(`\n📧 First 10 scheduled emails:`);
    scheduledEmails.forEach((email, i) => {
      const sendTime = new Date(email.send_at);
      const createdTime = new Date(email.created_at);
      
      console.log(`${i+1}. ${sendTime.toISOString()} → ${email.to_email}`);
      
      if (i > 0) {
        const prevSendTime = new Date(scheduledEmails[i-1].send_at);
        const gapMs = sendTime - prevSendTime;
        const gapMinutes = gapMs / (1000 * 60);
        const gapDays = gapMs / (1000 * 60 * 60 * 24);
        
        if (gapMinutes > 1000) {
          console.log(`   🚨 MASSIVE GAP: ${gapMinutes.toFixed(0)} minutes (${gapDays.toFixed(1)} days)`);
        } else {
          console.log(`   Gap: ${gapMinutes.toFixed(1)} minutes`);
        }
      }
      
      // Check if this might be a follow-up email
      const sequenceData = email.sequence_data || {};
      if (sequenceData.emailIndex > 0) {
        console.log(`   ⚠️ This is follow-up email #${sequenceData.emailIndex} with ${sequenceData.delay} day delay`);
      }
    });
    
    // Let's trace the algorithm
    console.log('\n🔍 Algorithm Analysis:');
    console.log('Current formula: baseDelay = leadIndex * sendingInterval * 60 * 1000');
    
    // Simulate what should happen
    const sendingInterval = campaign.config.sendingInterval;
    const accountCount = campaign.config.emailAccounts?.length || 1;
    
    console.log('\nWhat SHOULD happen for first 5 leads:');
    for (let i = 0; i < 5; i++) {
      const expectedDelay = i * sendingInterval * 60 * 1000;
      const expectedMinutes = expectedDelay / (1000 * 60);
      console.log(`Lead ${i}: ${expectedMinutes} minutes delay`);
    }
    
    // Check if there's a data type issue
    console.log('\n🔍 Data Type Check:');
    console.log(`sendingInterval type: ${typeof campaign.config.sendingInterval}`);
    console.log(`sendingInterval value: ${campaign.config.sendingInterval}`);
    console.log(`sendingInterval * 60 * 1000 = ${campaign.config.sendingInterval * 60 * 1000}`);
    
    // Check if follow-up emails are mixed in
    const emailsWithSequence = scheduledEmails.filter(e => e.sequence_data?.emailIndex > 0);
    if (emailsWithSequence.length > 0) {
      console.log(`\n⚠️ Found ${emailsWithSequence.length} follow-up emails mixed in!`);
      console.log('This might be causing the massive gaps - follow-ups have day-based delays');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugMassiveGaps();