const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Test script to demonstrate 24-hour validation logic
 */
async function test24HourValidation() {
  console.log('🧪 Testing 24-hour validation logic\n');

  // Test cases with different time gaps
  const testCases = [
    { description: '6 hours ago', hoursAgo: 6, shouldPass: false },
    { description: '12 hours ago', hoursAgo: 12, shouldPass: false },
    { description: '23 hours ago', hoursAgo: 23, shouldPass: false },
    { description: '24 hours ago (exactly)', hoursAgo: 24, shouldPass: true },
    { description: '25 hours ago', hoursAgo: 25, shouldPass: true },
    { description: '48 hours ago', hoursAgo: 48, shouldPass: true }
  ];

  console.log('Test Cases:\n');

  for (const testCase of testCases) {
    const parentSentTime = new Date(Date.now() - (testCase.hoursAgo * 60 * 60 * 1000));
    const now = new Date();
    const hoursSinceParentSent = (now - parentSentTime) / (1000 * 60 * 60);

    const passed = hoursSinceParentSent >= 24;
    const hoursRemaining = passed ? 0 : Math.ceil(24 - hoursSinceParentSent);

    console.log(`📧 Parent sent: ${testCase.description}`);
    console.log(`   Time gap: ${hoursSinceParentSent.toFixed(1)}h`);
    console.log(`   Hours remaining: ${hoursRemaining}h`);
    console.log(`   Result: ${passed ? '✅ PASS' : '⏸️  BLOCKED'}`);
    console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'BLOCKED'}`);
    console.log(`   Match: ${passed === testCase.shouldPass ? '✅ Correct' : '❌ Wrong'}\n`);
  }

  // Now check actual database for any follow-ups that would be blocked
  console.log('\n' + '='.repeat(80));
  console.log('📊 Checking actual database for follow-ups with < 24h gap\n');

  const { data: followUps, error } = await supabase
    .from('scheduled_emails')
    .select('id, campaign_id, lead_id, sequence_step, status, parent_email_id, send_at')
    .eq('is_follow_up', true)
    .eq('reply_to_same_thread', true)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching follow-ups:', error);
    return;
  }

  if (!followUps || followUps.length === 0) {
    console.log('✅ No scheduled follow-ups found in database\n');
    return;
  }

  console.log(`Found ${followUps.length} scheduled follow-up(s):\n`);

  for (const followUp of followUps) {
    console.log(`📧 Follow-up ${followUp.id.substring(0, 8)}... (step ${followUp.sequence_step})`);

    // Find parent
    const { data: parent } = await supabase
      .from('scheduled_emails')
      .select('id, status, sent_at')
      .eq('campaign_id', followUp.campaign_id)
      .eq('lead_id', followUp.lead_id)
      .eq('sequence_step', 0)
      .single();

    if (!parent) {
      console.log('   ❌ No parent found!\n');
      continue;
    }

    console.log(`   Parent: ${parent.id.substring(0, 8)}... (status: ${parent.status})`);

    if (parent.status !== 'sent') {
      console.log('   ⏸️  Parent not sent yet - would be BLOCKED\n');
      continue;
    }

    const parentSentTime = new Date(parent.sent_at);
    const now = new Date();
    const hoursSinceParentSent = (now - parentSentTime) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, Math.ceil(24 - hoursSinceParentSent));

    console.log(`   Parent sent: ${parent.sent_at}`);
    console.log(`   Time gap: ${hoursSinceParentSent.toFixed(1)}h`);

    if (hoursSinceParentSent < 24) {
      console.log(`   ⏸️  Would be BLOCKED - need ${hoursRemaining}h more\n`);
    } else {
      console.log(`   ✅ Would PASS - 24h gap met\n`);
    }
  }

  console.log('='.repeat(80));
  console.log('✅ Validation test complete\n');
}

test24HourValidation().catch(console.error);
