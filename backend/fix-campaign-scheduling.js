#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixCampaignScheduling() {
  try {
    console.log('🔧 Starting campaign scheduling fix...\n');

    // Find campaigns that have simultaneous scheduling issues
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, config, organization_id')
      .in('status', ['running', 'active']);

    if (campaignError) {
      console.error('❌ Error fetching campaigns:', campaignError);
      return;
    }

    console.log(`📋 Found ${campaigns?.length || 0} running campaigns to check\n`);

    for (const campaign of campaigns || []) {
      console.log(`\n🔍 Checking campaign: ${campaign.name} (${campaign.id})`);
      
      const config = campaign.config;
      const emailAccounts = config.emailAccounts || [];
      const sendingInterval = config.sendingInterval || 15; // minutes
      
      if (emailAccounts.length <= 1) {
        console.log('  ⏩ Skipping: Only 1 email account, no rotation needed');
        continue;
      }

      // Get scheduled emails for this campaign
      const { data: scheduledEmails, error: emailError } = await supabase
        .from('scheduled_emails')
        .select('id, send_at, email_account_id, to_email')
        .eq('campaign_id', campaign.id)
        .eq('status', 'scheduled')
        .order('send_at', { ascending: true });

      if (emailError) {
        console.error('  ❌ Error fetching scheduled emails:', emailError);
        continue;
      }

      if (!scheduledEmails?.length) {
        console.log('  ⏩ No scheduled emails found');
        continue;
      }

      console.log(`  📧 Found ${scheduledEmails.length} scheduled emails`);

      // Group emails by their original batch (emails scheduled at nearly the same time)
      const emailGroups = [];
      let currentGroup = [];
      let lastTime = null;

      for (const email of scheduledEmails) {
        const sendTime = new Date(email.send_at);
        
        if (!lastTime || Math.abs(sendTime.getTime() - lastTime.getTime()) < 30000) { // 30 second threshold
          currentGroup.push(email);
        } else {
          if (currentGroup.length > 0) {
            emailGroups.push([...currentGroup]);
          }
          currentGroup = [email];
        }
        lastTime = sendTime;
      }
      
      if (currentGroup.length > 0) {
        emailGroups.push(currentGroup);
      }

      // Check if we need to fix scheduling (groups with multiple accounts at same time)
      const groupsNeedingFix = emailGroups.filter(group => 
        group.length > 1 && new Set(group.map(e => e.email_account_id)).size > 1
      );

      if (groupsNeedingFix.length === 0) {
        console.log('  ✅ Scheduling looks correct, no fix needed');
        continue;
      }

      console.log(`  🔧 Found ${groupsNeedingFix.length} groups needing fixes`);

      // Fix the scheduling
      const accountStagger = Math.floor((sendingInterval * 60 * 1000) / emailAccounts.length);
      let fixedCount = 0;

      for (const group of groupsNeedingFix) {
        const baseTime = new Date(group[0].send_at);
        
        for (let i = 0; i < group.length; i++) {
          const email = group[i];
          const accountIndex = emailAccounts.indexOf(email.email_account_id);
          
          if (accountIndex === -1) continue; // Skip if account not found
          
          const newSendTime = new Date(baseTime.getTime() + (accountIndex * accountStagger));
          
          if (Math.abs(newSendTime.getTime() - new Date(email.send_at).getTime()) > 5000) { // Only update if change > 5 seconds
            const { error: updateError } = await supabase
              .from('scheduled_emails')
              .update({ send_at: newSendTime.toISOString() })
              .eq('id', email.id);

            if (updateError) {
              console.error(`    ❌ Error updating email ${email.id}:`, updateError);
            } else {
              console.log(`    ✅ Fixed: ${email.to_email} from ${email.send_at} to ${newSendTime.toISOString()}`);
              fixedCount++;
            }
          }
        }
      }

      console.log(`  🎯 Fixed ${fixedCount} email schedules for campaign ${campaign.name}`);
    }

    console.log('\n✅ Campaign scheduling fix completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test with new campaign creation to verify the fix');
    console.log('   2. Monitor existing campaigns for proper account rotation');
    console.log('   3. Check cron processor logs for sequential sending');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixCampaignScheduling();