/**
 * Delete Past Follow-ups
 *
 * This script deletes follow-up emails that are scheduled in the past
 * to prevent them from being sent immediately when the campaign restarts.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const CAMPAIGN_ID = 'ea86e19c-b71f-49a4-95aa-1cc0a21734df';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deletePastFollowups() {
  console.log('🗑️  Starting past follow-up deletion...\n');

  try {
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}\n`);

    // Step 1: Find all scheduled follow-ups in the past
    console.log('📋 Fetching scheduled follow-ups in the past...');
    const { data: pastFollowups, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, send_at, sequence_step')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('status', 'scheduled')
      .gt('sequence_step', 0)
      .lt('send_at', now.toISOString())
      .order('send_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (pastFollowups.length === 0) {
      console.log('✅ No past follow-ups found. All scheduled emails are in the future.');
      return;
    }

    console.log(`Found ${pastFollowups.length} follow-up(s) scheduled in the past:\n`);

    pastFollowups.forEach(email => {
      console.log(`  - ${email.to_email} (Step ${email.sequence_step}): ${email.send_at}`);
    });

    console.log('\n🗑️  Deleting past follow-ups...');

    // Step 2: Delete the past follow-ups
    const { error: deleteError } = await supabase
      .from('scheduled_emails')
      .delete()
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('status', 'scheduled')
      .gt('sequence_step', 0)
      .lt('send_at', now.toISOString());

    if (deleteError) throw deleteError;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Past follow-up deletion complete!');
    console.log(`   Total deleted: ${pastFollowups.length}`);
    console.log('='.repeat(60));

    // Step 3: Show remaining scheduled follow-ups
    const { data: remaining, error: remainingError } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, send_at, sequence_step')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('status', 'scheduled')
      .gt('sequence_step', 0)
      .order('send_at', { ascending: true })
      .limit(10);

    if (remainingError) throw remainingError;

    console.log('\n📅 Remaining scheduled follow-ups:');
    if (remaining.length === 0) {
      console.log('   None');
    } else {
      remaining.forEach(email => {
        console.log(`   ${email.to_email} (Step ${email.sequence_step}): ${email.send_at}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the deletion
deletePastFollowups().then(() => {
  console.log('\n✅ Script completed successfully');
  process.exit(0);
});
