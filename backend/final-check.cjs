#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalCheck() {
  try {
    console.log('🔍 Final check: Current scheduled_emails state\n');
    
    const now = new Date();
    console.log(`⏰ Current UTC time: ${now.toISOString()}\n`);
    
    // Get all scheduled emails with full details
    const { data: allScheduled, error } = await supabase
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
      .order('send_at', { ascending: true })
      .limit(15);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📧 Total scheduled emails: ${allScheduled?.length || 0}`);
    
    if (allScheduled?.length > 0) {
      console.log('\n📋 All scheduled emails (sorted by send_at):');
      
      let upcomingCount = 0;
      let overdueCount = 0;
      
      allScheduled.forEach((email, index) => {
        const sendTime = new Date(email.send_at);
        const minutesUntil = Math.ceil((sendTime.getTime() - now.getTime()) / (1000 * 60));
        const isPastDue = minutesUntil <= 0;
        const status = isPastDue ? '🔥 OVERDUE' : '⏰ FUTURE';
        
        if (isPastDue) overdueCount++;
        else upcomingCount++;
        
        console.log(`\n${index + 1}. ${status} ${email.id}`);
        console.log(`   Send at: ${email.send_at} (${minutesUntil} mins)`);
        console.log(`   To: ${email.to_email}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Campaign: ${email.campaign_id}`);
        console.log(`   Account: ${email.email_account_id}`);
        console.log(`   Follow-up: ${email.is_follow_up}, Step: ${email.sequence_step}`);
      });
      
      console.log(`\n📊 Summary:`);
      console.log(`   🔥 Overdue emails: ${overdueCount}`);
      console.log(`   ⏰ Future emails: ${upcomingCount}`);
      
      if (overdueCount > 0) {
        console.log('\n🚨 ISSUE IDENTIFIED:');
        console.log(`   There are ${overdueCount} emails that should have been sent already!`);
        console.log('   This suggests either:');
        console.log('   1. The cron processor campaign status filter is wrong ("active" vs "running")');
        console.log('   2. There\'s another filtering issue in the cron processor');
        console.log('   3. The cron processor is not running properly');
      }
      
      // Check campaigns status
      const campaignIds = [...new Set(allScheduled.map(e => e.campaign_id))];
      if (campaignIds.length > 0) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, name, status')
          .in('id', campaignIds);
        
        console.log('\n📋 Campaign status:');
        campaigns?.forEach(campaign => {
          const emailCount = allScheduled.filter(e => e.campaign_id === campaign.id).length;
          console.log(`   ${campaign.name}: ${campaign.status} (${emailCount} scheduled emails)`);
        });
      }
      
      // Check accounts
      const accountIds = [...new Set(allScheduled.map(e => e.email_account_id))];
      if (accountIds.length > 0) {
        const { data: accounts } = await supabase
          .from('email_accounts')
          .select('id, email, status')
          .in('id', accountIds);
        
        console.log('\n📋 Email account status:');
        accounts?.forEach(account => {
          const emailCount = allScheduled.filter(e => e.email_account_id === account.id).length;
          console.log(`   ${account.email}: ${account.status} (${emailCount} scheduled emails)`);
        });
      }
    }
    
    console.log('\n💡 NEXT STEPS FOR TESTING SEQUENTIAL PROCESSING:');
    if (overdueCount > 0) {
      console.log('   1. Fix the cron processor campaign status filter');
      console.log('   2. Once fixed, the overdue emails should start processing');
      console.log('   3. Watch the cron output to see if emails are sent sequentially');
      console.log('   4. The fix should ensure only 1 email per campaign per interval');
    } else {
      console.log('   1. Wait for new emails to be scheduled (when campaigns start)');
      console.log('   2. Or restart a campaign to generate new scheduled emails');
      console.log('   3. Monitor the sequential processing behavior');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

finalCheck();
