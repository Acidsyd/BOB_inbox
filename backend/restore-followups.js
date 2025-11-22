/**
 * Restore Follow-Ups Script
 *
 * Restores follow-ups that were accidentally marked as 'skipped' when stopping a campaign.
 * Changes their status back to 'scheduled' so they will be sent by CronEmailProcessor.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function restoreFollowUps(dryRun = true) {
  console.log('🔧 Restore Follow-Ups Script\n');
  console.log('='.repeat(60));

  // Find all skipped follow-ups
  const { data: skippedFollowUps, error: fetchError } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, sequence_step, send_at, parent_email_id')
    .eq('is_follow_up', true)
    .eq('status', 'skipped')
    .order('send_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching skipped follow-ups:', fetchError);
    return;
  }

  console.log(`\n📊 Found ${skippedFollowUps.length} skipped follow-ups\n`);

  if (skippedFollowUps.length === 0) {
    console.log('✅ No skipped follow-ups to restore!');
    return;
  }

  // Show first 10
  console.log('First 10 skipped follow-ups:');
  skippedFollowUps.slice(0, 10).forEach((email, idx) => {
    const sendDate = new Date(email.send_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
    console.log(`   ${idx + 1}. ${email.to_email} - Step ${email.sequence_step} - ${sendDate}`);
  });

  if (skippedFollowUps.length > 10) {
    console.log(`   ... and ${skippedFollowUps.length - 10} more`);
  }

  console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '🚀 EXECUTING'}: Restoring follow-ups...\n`);

  if (!dryRun) {
    // Restore all skipped follow-ups to 'scheduled'
    const { error: updateError } = await supabase
      .from('scheduled_emails')
      .update({
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('is_follow_up', true)
      .eq('status', 'skipped');

    if (updateError) {
      console.error('❌ Error restoring follow-ups:', updateError);
      return;
    }

    console.log(`✅ Restored ${skippedFollowUps.length} follow-ups to 'scheduled' status`);
  } else {
    console.log(`[DRY RUN] Would restore ${skippedFollowUps.length} follow-ups to 'scheduled' status`);
  }

  console.log('\n📊 Summary:');
  console.log(`   Total follow-ups restored: ${skippedFollowUps.length}`);
  console.log(`   Status changed: skipped → scheduled`);

  if (dryRun) {
    console.log('\n💡 To execute changes, run: node restore-followups.js --confirm');
  } else {
    console.log('\n✅ Follow-ups restored successfully!');
    console.log('   CronEmailProcessor will send them at their scheduled times.');
  }
}

async function main() {
  const dryRun = !process.argv.includes('--confirm');
  await restoreFollowUps(dryRun);
}

main().catch(console.error);
