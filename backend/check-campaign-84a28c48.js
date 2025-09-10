#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCampaign84a28c48() {
  try {
    console.log('🔍 Checking specific campaign: 84a28c48-1886-47d7-9ac7-ad7fd099cc19\n');
    
    // Get the specific campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', '84a28c48-1886-47d7-9ac7-ad7fd099cc19')
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Error fetching campaign:', campaignError);
      return;
    }
    
    console.log(`📋 Campaign: ${campaign.name} (${campaign.id})`);
    console.log(`   Created: ${campaign.created_at}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Interval: ${campaign.config.sendingInterval} minutes`);
    console.log(`   Accounts: ${campaign.config.emailAccounts?.length || 0}`);
    console.log(`   Email Sequence: ${campaign.config.emailSequence?.length || 0} follow-ups`);
    
    // Check if this has follow-up emails configured
    if (campaign.config.emailSequence?.length > 0) {
      console.log('\n⚠️ FOLLOW-UP EMAILS DETECTED:');
      campaign.config.emailSequence.forEach((email, i) => {
        console.log(`  ${i+1}. Subject: "${email.subject}", Delay: ${email.delay} days`);
      });
      console.log('\nThis could explain the massive gaps if follow-ups are being scheduled!');
    }
    
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
      console.log(`${i+1}. ${sendTime.toISOString()} → ${email.to_email}`);
      console.log(`   Sequence step: ${email.sequence_step || 0} (0=initial, 1+=follow-up)`);
      console.log(`   Is follow-up: ${email.is_follow_up || false}`);
      
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
      console.log();
    });
    
    // Check if my fix actually worked
    const followUpEmails = scheduledEmails.filter(e => e.is_follow_up === true || e.sequence_step > 0);
    if (followUpEmails.length > 0) {
      console.log(`🚨 BUG FOUND: ${followUpEmails.length} follow-up emails are still being scheduled!`);
      console.log('My fix to skip follow-ups (emailIndex > 0) is NOT working!');
    } else {
      console.log('✅ Fix is working: No follow-up emails scheduled');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkCampaign84a28c48();