const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Repair buggy follow-ups that were created without parent_email_id
 *
 * Options:
 * 1. Link to parent if parent exists
 * 2. Delete if parent doesn't exist or parent not sent
 */
async function repairBuggyFollowUps(dryRun = true) {
  console.log('🔧 Repairing buggy follow-ups without parent_email_id\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚠️  LIVE (will modify database)'}\n`);

  // Find all follow-ups without parent_email_id
  const { data: buggyFollowUps, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('is_follow_up', true)
    .is('parent_email_id', null)
    .in('status', ['scheduled', 'failed', 'skipped']); // Don't touch sent emails

  if (error) {
    console.error('❌ Error fetching buggy follow-ups:', error);
    return;
  }

  console.log(`Found ${buggyFollowUps.length} buggy follow-up(s)\n`);

  if (buggyFollowUps.length === 0) {
    console.log('✅ No buggy follow-ups to repair!');
    return;
  }

  let linked = 0;
  let deleted = 0;
  let skipped = 0;

  for (const followUp of buggyFollowUps) {
    console.log(`\n📧 Follow-up: ${followUp.id.substring(0, 8)}... (${followUp.to_email})`);
    console.log(`   Status: ${followUp.status}, Step: ${followUp.sequence_step}`);

    // Try to find parent (sequence_step = 0, same campaign, same lead)
    const { data: parent, error: parentError } = await supabase
      .from('scheduled_emails')
      .select('id, status, sent_at, message_id_header')
      .eq('campaign_id', followUp.campaign_id)
      .eq('lead_id', followUp.lead_id)
      .eq('sequence_step', 0)
      .single();

    if (parentError || !parent) {
      console.log(`   ❌ No parent found - will DELETE`);
      if (!dryRun) {
        await supabase
          .from('scheduled_emails')
          .delete()
          .eq('id', followUp.id);
        console.log(`   🗑️  Deleted`);
      }
      deleted++;
      continue;
    }

    console.log(`   ✅ Found parent: ${parent.id.substring(0, 8)}... (status: ${parent.status})`);

    if (parent.status !== 'sent') {
      console.log(`   ❌ Parent not sent - will DELETE follow-up`);
      if (!dryRun) {
        await supabase
          .from('scheduled_emails')
          .delete()
          .eq('id', followUp.id);
        console.log(`   🗑️  Deleted`);
      }
      deleted++;
      continue;
    }

    // Parent is sent, link the follow-up
    console.log(`   🔗 Linking to parent ${parent.id.substring(0, 8)}...`);

    if (!dryRun) {
      const updates = {
        parent_email_id: parent.id,
        updated_at: new Date().toISOString()
      };

      // If parent has message_id_header, copy it to follow-up for threading
      if (parent.message_id_header) {
        updates.message_id_header = parent.message_id_header;
        console.log(`   📝 Also setting message_id_header for threading`);
      }

      await supabase
        .from('scheduled_emails')
        .update(updates)
        .eq('id', followUp.id);

      console.log(`   ✅ Linked successfully`);
    }
    linked++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary:\n');
  console.log(`   🔗 Linked to parent: ${linked}`);
  console.log(`   🗑️  Deleted: ${deleted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📊 Total processed: ${buggyFollowUps.length}`);

  if (dryRun) {
    console.log('\n⚠️  This was a DRY RUN - no changes were made');
    console.log('   Run with --confirm to apply changes');
  } else {
    console.log('\n✅ Changes applied successfully!');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--confirm');

repairBuggyFollowUps(dryRun).catch(console.error);
