#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixSpecificCampaign() {
  try {
    const campaignId = '61cb8e57-6a44-4357-a923-4d27e37eb31d';
    console.log('🔧 Fixing campaign:', campaignId);
    
    // Get campaign details
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
      
    if (!campaign) {
      console.log('❌ Campaign not found');
      return;
    }
    
    const config = campaign.config;
    const emailAccounts = config.emailAccounts || [];
    const sendingInterval = config.sendingInterval || 15; // minutes
    
    console.log(`📋 Campaign: ${campaign.name}`);
    console.log(`   Accounts: ${emailAccounts.length}, Interval: ${sendingInterval} min`);
    
    if (emailAccounts.length <= 1) {
      console.log('  ⏩ Skipping: Only 1 email account, no rotation needed');
      return;
    }

    // Get ALL scheduled emails for this campaign
    const { data: scheduledEmails, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('id, send_at, email_account_id, to_email')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true });

    if (emailError) {
      console.error('  ❌ Error fetching scheduled emails:', emailError);
      return;
    }

    if (!scheduledEmails?.length) {
      console.log('  ⏩ No scheduled emails found');
      return;
    }

    console.log(`  📧 Found ${scheduledEmails.length} scheduled emails`);
    
    // Show current problematic scheduling
    console.log('  📅 Current schedule (first 3):');
    scheduledEmails.slice(0, 3).forEach((email, i) => {
      const time = new Date(email.send_at);
      console.log(`    ${i+1}. ${time.toISOString()}`);
      if (i > 0) {
        const prevTime = new Date(scheduledEmails[i-1].send_at);
        const diff = (time - prevTime) / (1000 * 60); // minutes  
        console.log(`       Gap: ${diff.toFixed(1)} minutes`);
      }
    });

    // Fix the scheduling using the corrected algorithm
    const baseTime = new Date(); // Start from now
    const accountStagger = Math.floor((sendingInterval * 60 * 1000) / emailAccounts.length);
    
    console.log('\n🔧 Fixing with proper algorithm:');
    console.log(`   Interval: ${sendingInterval} minutes`);
    console.log(`   Accounts: ${emailAccounts.length}`);
    console.log(`   Account stagger: ${accountStagger}ms = ${accountStagger/1000/60} minutes`);
    
    let fixedCount = 0;
    
    for (let i = 0; i < Math.min(scheduledEmails.length, 5); i++) {
      const email = scheduledEmails[i];
      const leadIndex = i;
      
      // Apply the CORRECTED algorithm
      const accountIndex = leadIndex % emailAccounts.length;
      const batchNumber = Math.floor(leadIndex / emailAccounts.length);
      const baseDelay = (batchNumber * sendingInterval * 60 * 1000) + (accountIndex * accountStagger);
      
      const newSendTime = new Date(baseTime.getTime() + baseDelay);
      
      console.log(`   Lead ${leadIndex}: Account ${accountIndex+1}/${emailAccounts.length}, Batch ${batchNumber}, New time: ${newSendTime.toISOString()}`);
      
      // Update the email
      const { error: updateError } = await supabase
        .from('scheduled_emails')
        .update({ send_at: newSendTime.toISOString() })
        .eq('id', email.id);

      if (updateError) {
        console.error(`    ❌ Error updating email ${email.id}:`, updateError);
      } else {
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} email schedules`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSpecificCampaign();