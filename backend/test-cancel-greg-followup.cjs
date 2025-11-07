#!/usr/bin/env node

/**
 * Test script: Manually trigger cancellation for Greg's follow-up
 * This simulates what the ReplyMonitoringService will do automatically
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testCancelGregFollowUp() {
  console.log('🧪 Testing proactive follow-up cancellation for Greg...\n');

  try {
    // Get WISE 3 campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, name, organization_id, config')
      .eq('name', 'WISE 3')
      .single();

    console.log(`📊 Campaign: ${campaign.name}`);
    console.log(`   Stop on reply: ${campaign.config?.stopOnReply}\n`);

    // Get Greg's lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name')
      .eq('email', 'greg@one-five.com')
      .eq('organization_id', campaign.organization_id)
      .single();

    console.log(`👤 Lead: ${lead.first_name} ${lead.last_name} (${lead.email})`);
    console.log(`   Lead ID: ${lead.id}\n`);

    // Check current follow-up status BEFORE cancellation
    const { data: beforeFollowUps } = await supabase
      .from('scheduled_emails')
      .select('id, sequence_step, status, send_at, subject')
      .eq('campaign_id', campaign.id)
      .eq('lead_id', lead.id)
      .gt('sequence_step', 0)
      .order('sequence_step', { ascending: true });

    console.log('📧 Follow-ups BEFORE cancellation:');
    if (beforeFollowUps && beforeFollowUps.length > 0) {
      beforeFollowUps.forEach(f => {
        console.log(`   - ${f.id}: Step ${f.sequence_step}, Status: ${f.status}, Send at: ${f.send_at}`);
      });
    } else {
      console.log('   No follow-ups found');
    }
    console.log('');

    // Simulate the cancellation logic from ReplyMonitoringService
    console.log('🔄 Triggering proactive cancellation...\n');

    if (!campaign.config?.stopOnReply) {
      console.log('⚠️ Campaign does not have stopOnReply enabled!');
      return;
    }

    // Cancel scheduled follow-ups (use 'skipped' status)
    const { data: cancelledEmails, error } = await supabase
      .from('scheduled_emails')
      .update({
        status: 'skipped',
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', campaign.id)
      .eq('lead_id', lead.id)
      .eq('status', 'scheduled')
      .gt('sequence_step', 0)
      .select('id, to_email, subject, send_at, sequence_step');

    if (error) {
      console.error('❌ Error cancelling follow-ups:', error);
      return;
    }

    if (!cancelledEmails || cancelledEmails.length === 0) {
      console.log('📭 No scheduled follow-ups found to cancel');
    } else {
      console.log(`✅ Successfully cancelled ${cancelledEmails.length} follow-up(s):`);
      cancelledEmails.forEach(email => {
        console.log(`   - Email ${email.id}: "${email.subject}" (was scheduled for ${email.send_at})`);
      });
    }
    console.log('');

    // Check follow-up status AFTER cancellation
    const { data: afterFollowUps } = await supabase
      .from('scheduled_emails')
      .select('id, sequence_step, status, send_at, subject')
      .eq('campaign_id', campaign.id)
      .eq('lead_id', lead.id)
      .gt('sequence_step', 0)
      .order('sequence_step', { ascending: true });

    console.log('📧 Follow-ups AFTER cancellation:');
    if (afterFollowUps && afterFollowUps.length > 0) {
      afterFollowUps.forEach(f => {
        console.log(`   - ${f.id}: Step ${f.sequence_step}, Status: ${f.status}, Send at: ${f.send_at}`);
      });
    } else {
      console.log('   No follow-ups found');
    }

    // Summary
    const scheduledBefore = beforeFollowUps?.filter(f => f.status === 'scheduled').length || 0;
    const scheduledAfter = afterFollowUps?.filter(f => f.status === 'scheduled').length || 0;
    const cancelledCount = scheduledBefore - scheduledAfter;

    console.log('\n📊 Summary:');
    console.log(`   Scheduled before: ${scheduledBefore}`);
    console.log(`   Scheduled after: ${scheduledAfter}`);
    console.log(`   Cancelled: ${cancelledCount}`);

    if (cancelledCount > 0) {
      console.log('\n✅ SUCCESS! Proactive cancellation is working correctly!');
    } else if (scheduledBefore === 0) {
      console.log('\n⚠️ No scheduled follow-ups to test with');
    } else {
      console.log('\n❌ PROBLEM: Follow-ups were not cancelled');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCancelGregFollowUp()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });
