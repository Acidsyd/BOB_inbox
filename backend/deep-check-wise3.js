const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deepCheck() {
  try {
    console.log('\n🔍 DEEP CHECK: WISE 3 CAMPAIGN\n');
    console.log('='.repeat(80));

    const campaignId = '006fcfbc-37b6-4c0e-af47-5eabb00d7b58';

    // ===== SECTION 1: CAMPAIGN CONFIGURATION =====
    console.log('\n📋 SECTION 1: CAMPAIGN CONFIGURATION');
    console.log('='.repeat(80));

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      console.log('❌ Campaign not found');
      return;
    }

    const config = campaign.config || {};

    console.log(`\n✅ Campaign: ${campaign.name}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Created: ${new Date(campaign.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(campaign.updated_at).toLocaleString()}`);
    console.log(`   Lead List: ${config.leadListId}`);

    console.log(`\n⚙️  Sending Configuration:`);
    console.log(`   Interval: ${config.sendingInterval} minutes`);
    console.log(`   Emails/day: ${config.emailsPerDay}`);
    console.log(`   Emails/hour: ${config.emailsPerHour || 'not set'}`);
    console.log(`   Hours: ${config.sendingHours?.start}:00 - ${config.sendingHours?.end}:00`);
    console.log(`   Days: ${(config.activeDays || []).join(', ')}`);
    console.log(`   Timezone: ${config.timezone || 'UTC'}`);
    console.log(`   Email Accounts: ${(config.emailAccounts || []).length} accounts`);

    console.log(`\n📧 Initial Email:`);
    console.log(`   Subject: ${config.emailSubject}`);
    console.log(`   Content (first 150 chars): ${config.emailContent?.substring(0, 150)}...`);

    // ===== SECTION 2: FOLLOW-UP CONFIGURATION =====
    console.log('\n\n📬 SECTION 2: FOLLOW-UP CONFIGURATION');
    console.log('='.repeat(80));

    const emailSequence = config.emailSequence || [];

    if (emailSequence.length === 0) {
      console.log('\n⚠️  NO follow-ups configured');
    } else {
      console.log(`\n✅ ${emailSequence.length} follow-ups configured:\n`);

      emailSequence.forEach((email, i) => {
        console.log(`Follow-up #${i + 1}:`);
        console.log(`   Delay: ${email.delay} days after initial/previous`);
        console.log(`   Reply to same thread: ${email.replyToSameThread ? '✅ YES' : '❌ NO'}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Content (first 100 chars): ${email.content?.substring(0, 100)}...`);
        console.log('');
      });
    }

    // ===== SECTION 3: LEAD COUNT =====
    console.log('\n📊 SECTION 3: LEAD COUNT');
    console.log('='.repeat(80));

    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', config.leadListId)
      .eq('status', 'active');

    console.log(`\n✅ Total active leads in list: ${totalLeads}`);

    // ===== SECTION 4: INITIAL EMAILS STATUS =====
    console.log('\n\n📧 SECTION 4: INITIAL EMAILS (is_follow_up = false)');
    console.log('='.repeat(80));

    const statuses = ['scheduled', 'sent', 'failed', 'cancelled', 'skipped', 'sending'];
    const initialCounts = {};
    let totalInitial = 0;

    console.log('\nCounts by status:');
    for (const status of statuses) {
      const { count } = await supabase
        .from('scheduled_emails')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('is_follow_up', false)
        .eq('status', status);

      initialCounts[status] = count || 0;
      totalInitial += count || 0;
      console.log(`   ${status}: ${count || 0}`);
    }

    console.log(`   ${'─'.repeat(30)}`);
    console.log(`   TOTAL: ${totalInitial}`);

    // Check if counts match
    if (totalInitial === totalLeads) {
      console.log(`\n✅ Perfect match! ${totalInitial} initial emails = ${totalLeads} leads`);
    } else {
      console.log(`\n⚠️  MISMATCH: ${totalInitial} initial emails vs ${totalLeads} leads (diff: ${totalLeads - totalInitial})`);
    }

    // ===== SECTION 5: FOLLOW-UP EMAILS STATUS =====
    console.log('\n\n📬 SECTION 5: FOLLOW-UP EMAILS (is_follow_up = true)');
    console.log('='.repeat(80));

    const followUpCounts = {};
    let totalFollowUps = 0;

    console.log('\nCounts by status:');
    for (const status of statuses) {
      const { count } = await supabase
        .from('scheduled_emails')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('is_follow_up', true)
        .eq('status', status);

      followUpCounts[status] = count || 0;
      totalFollowUps += count || 0;
      console.log(`   ${status}: ${count || 0}`);
    }

    console.log(`   ${'─'.repeat(30)}`);
    console.log(`   TOTAL: ${totalFollowUps}`);

    // Calculate expected follow-ups
    const expectedFollowUps = totalLeads * emailSequence.length;
    console.log(`\n📊 Expected follow-ups: ${totalLeads} leads × ${emailSequence.length} follow-ups = ${expectedFollowUps}`);
    console.log(`   Actual follow-ups: ${totalFollowUps}`);

    if (totalFollowUps === expectedFollowUps) {
      console.log(`   ✅ Perfect match!`);
    } else {
      console.log(`   ⚠️  Difference: ${expectedFollowUps - totalFollowUps} missing`);
    }

    // ===== SECTION 6: CONTENT VERIFICATION =====
    console.log('\n\n🔍 SECTION 6: CONTENT VERIFICATION (Recent Emails)');
    console.log('='.repeat(80));

    // Check recently updated scheduled emails
    const { data: recentScheduled } = await supabase
      .from('scheduled_emails')
      .select('to_email, subject, updated_at, is_follow_up, sequence_step')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .order('updated_at', { ascending: false })
      .limit(5);

    console.log('\n📅 Recent SCHEDULED emails (should have NEW content):');
    if (recentScheduled && recentScheduled.length > 0) {
      recentScheduled.forEach((email, i) => {
        const type = email.is_follow_up ? `Follow-up #${email.sequence_step}` : 'Initial';
        console.log(`\n${i + 1}. [${type}] ${email.to_email}`);
        console.log(`   Subject: ${email.subject.substring(0, 70)}...`);
        console.log(`   Updated: ${new Date(email.updated_at).toLocaleString()}`);

        // Check if subject matches current config
        const expectedSubject = email.is_follow_up
          ? emailSequence[email.sequence_step - 1]?.subject
          : config.emailSubject;

        if (email.subject === expectedSubject) {
          console.log(`   ✅ Subject matches current config`);
        } else {
          console.log(`   ❌ Subject is OLD (doesn't match config)`);
        }
      });
    } else {
      console.log('   ⚠️  No scheduled emails found');
    }

    // Check recently sent emails
    const { data: recentSent } = await supabase
      .from('scheduled_emails')
      .select('to_email, subject, sent_at, is_follow_up, sequence_step')
      .eq('campaign_id', campaignId)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(5);

    console.log('\n\n📤 Recent SENT emails:');
    if (recentSent && recentSent.length > 0) {
      recentSent.forEach((email, i) => {
        const type = email.is_follow_up ? `Follow-up #${email.sequence_step}` : 'Initial';
        const sentDate = new Date(email.sent_at);
        const isToday = sentDate.toDateString() === new Date().toDateString();

        console.log(`\n${i + 1}. [${type}] ${email.to_email}`);
        console.log(`   Subject: ${email.subject.substring(0, 70)}...`);
        console.log(`   Sent: ${sentDate.toLocaleString()} ${isToday ? '🔥 TODAY' : ''}`);
      });
    } else {
      console.log('   ⚠️  No sent emails found');
    }

    // ===== SECTION 7: FOLLOW-UP THREADING CHECK =====
    console.log('\n\n🔗 SECTION 7: FOLLOW-UP THREADING');
    console.log('='.repeat(80));

    // Check if follow-ups have parent_email_id set
    const { data: followUpsSample } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, subject, parent_email_id, reply_to_same_thread, is_follow_up, sequence_step')
      .eq('campaign_id', campaignId)
      .eq('is_follow_up', true)
      .limit(5);

    if (followUpsSample && followUpsSample.length > 0) {
      console.log('\n📬 Sample follow-ups:');
      followUpsSample.forEach((email, i) => {
        console.log(`\n${i + 1}. Follow-up #${email.sequence_step} to ${email.to_email}`);
        console.log(`   Has parent_email_id: ${email.parent_email_id ? '✅ YES' : '❌ NO'}`);
        console.log(`   reply_to_same_thread: ${email.reply_to_same_thread ? '✅ YES' : '❌ NO'}`);

        if (email.parent_email_id) {
          // Check if parent exists
          const parentExists = recentScheduled?.find(e => e.id === email.parent_email_id) ||
                              recentSent?.find(e => e.id === email.parent_email_id);
          if (parentExists) {
            console.log(`   Parent email: ✅ Found in database`);
          } else {
            console.log(`   Parent email: ⚠️  Not in sample (may exist)`);
          }
        }
      });
    } else {
      console.log('\n⚠️  No follow-up emails found');
    }

    // ===== SECTION 8: SCHEDULE TIMELINE =====
    console.log('\n\n📅 SECTION 8: SCHEDULE TIMELINE');
    console.log('='.repeat(80));

    // Get next scheduled emails
    const { data: nextScheduled } = await supabase
      .from('scheduled_emails')
      .select('to_email, send_at, is_follow_up, sequence_step')
      .eq('campaign_id', campaignId)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true })
      .limit(10);

    if (nextScheduled && nextScheduled.length > 0) {
      console.log('\n⏰ Next 10 emails to send:');
      const now = new Date();

      nextScheduled.forEach((email, i) => {
        const sendDate = new Date(email.send_at);
        const minutesUntil = Math.round((sendDate - now) / 1000 / 60);
        const type = email.is_follow_up ? `Follow-up #${email.sequence_step}` : 'Initial';

        let timeStatus = '';
        if (minutesUntil < 0) {
          timeStatus = `🔥 ${Math.abs(minutesUntil)} min AGO (should send soon)`;
        } else if (minutesUntil < 60) {
          timeStatus = `⏰ in ${minutesUntil} minutes`;
        } else if (minutesUntil < 1440) {
          timeStatus = `⏰ in ${Math.round(minutesUntil / 60)} hours`;
        } else {
          timeStatus = `📅 in ${Math.round(minutesUntil / 1440)} days`;
        }

        console.log(`\n${i + 1}. [${type}] ${email.to_email}`);
        console.log(`   ${sendDate.toLocaleString()} ${timeStatus}`);

        // Check interval from previous email
        if (i > 0) {
          const prevDate = new Date(nextScheduled[i - 1].send_at);
          const gapMinutes = Math.round((sendDate - prevDate) / 1000 / 60);
          console.log(`   Gap from previous: ${gapMinutes} minutes`);
        }
      });
    } else {
      console.log('\n⚠️  No scheduled emails found');
    }

    // ===== SECTION 9: ACCOUNT ROTATION =====
    console.log('\n\n👥 SECTION 9: ACCOUNT ROTATION');
    console.log('='.repeat(80));

    // Check account distribution
    const { data: accountStats } = await supabase
      .from('scheduled_emails')
      .select('email_account_id, status')
      .eq('campaign_id', campaignId)
      .eq('is_follow_up', false);

    if (accountStats && accountStats.length > 0) {
      const accountCounts = {};
      accountStats.forEach(email => {
        const accountId = email.email_account_id || 'no-account';
        accountCounts[accountId] = accountCounts[accountId] || { scheduled: 0, sent: 0, total: 0 };
        accountCounts[accountId][email.status] = (accountCounts[accountId][email.status] || 0) + 1;
        accountCounts[accountId].total++;
      });

      console.log('\n📊 Initial emails per account:');
      Object.entries(accountCounts).forEach(([accountId, counts], i) => {
        console.log(`\nAccount ${i + 1}: ${accountId.substring(0, 8)}...`);
        console.log(`   Total: ${counts.total}`);
        console.log(`   Sent: ${counts.sent || 0}`);
        console.log(`   Scheduled: ${counts.scheduled || 0}`);
      });

      // Check rotation quality (no consecutive emails from same account)
      const { data: recentInOrder } = await supabase
        .from('scheduled_emails')
        .select('email_account_id, send_at')
        .eq('campaign_id', campaignId)
        .eq('is_follow_up', false)
        .eq('status', 'scheduled')
        .order('send_at', { ascending: true })
        .limit(20);

      if (recentInOrder && recentInOrder.length > 1) {
        let consecutiveCount = 0;
        let maxConsecutive = 1;

        for (let i = 1; i < recentInOrder.length; i++) {
          if (recentInOrder[i].email_account_id === recentInOrder[i-1].email_account_id) {
            consecutiveCount++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveCount + 1);
          } else {
            consecutiveCount = 0;
          }
        }

        console.log(`\n🔄 Rotation Quality (next 20 emails):`);
        if (maxConsecutive === 1) {
          console.log(`   ✅ PERFECT! No consecutive emails from same account`);
        } else {
          console.log(`   ⚠️  Max consecutive: ${maxConsecutive} emails from same account`);
        }
      }
    }

    // ===== SECTION 10: SUMMARY & HEALTH CHECK =====
    console.log('\n\n✅ SECTION 10: HEALTH CHECK SUMMARY');
    console.log('='.repeat(80));

    const issues = [];
    const warnings = [];

    // Check 1: Campaign active
    if (campaign.status !== 'active') {
      issues.push(`Campaign status is '${campaign.status}' (should be 'active')`);
    }

    // Check 2: Lead count matches
    if (totalInitial !== totalLeads) {
      warnings.push(`Initial email count (${totalInitial}) doesn't match lead count (${totalLeads})`);
    }

    // Check 3: No scheduled emails
    if (initialCounts.scheduled === 0 && campaign.status === 'active') {
      issues.push('No scheduled emails found but campaign is active');
    }

    // Check 4: Follow-up count
    if (emailSequence.length > 0 && totalFollowUps !== expectedFollowUps) {
      warnings.push(`Follow-up count (${totalFollowUps}) doesn't match expected (${expectedFollowUps})`);
    }

    // Check 5: Recent emails have old content
    const hasOldContent = recentScheduled?.some(email => {
      const expectedSubject = email.is_follow_up
        ? emailSequence[email.sequence_step - 1]?.subject
        : config.emailSubject;
      return email.subject !== expectedSubject;
    });

    if (hasOldContent) {
      issues.push('Some scheduled emails have OLD content (not matching current config)');
    }

    console.log('\n🏥 Health Status:');

    if (issues.length === 0 && warnings.length === 0) {
      console.log('\n   🎉 ALL CHECKS PASSED! Campaign is healthy.\n');
    } else {
      if (issues.length > 0) {
        console.log('\n   🚨 CRITICAL ISSUES:');
        issues.forEach(issue => console.log(`      ❌ ${issue}`));
      }

      if (warnings.length > 0) {
        console.log('\n   ⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`      ⚠️  ${warning}`));
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ Deep check complete!\n');

  } catch (error) {
    console.error('\n❌ Error during deep check:', error.message);
    console.error(error);
  }
}

deepCheck();
