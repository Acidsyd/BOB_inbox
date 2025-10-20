const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qqalaelzfdiytrcdmbfw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxYWxhZWx6ZmRpeXRyY2RtYmZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA5NzQ4NSwiZXhwIjoyMDcwNjczNDg1fQ.gP0oksvvc71hBjfBjrC6GvEMm59-mqJ4eQZk4T7Fhu0'
);

async function cleanupDuplicateFollowups() {
  const campaignId = '006fcfbc-37b6-4c0e-af47-5eabb00d7b58';

  console.log('🧹 CLEANING UP DUPLICATE FOLLOW-UPS\n');

  // Get all follow-ups sorted by creation time
  const { data: allFollowups } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, parent_email_id, sequence_step, created_at, send_at, status')
    .eq('campaign_id', campaignId)
    .gt('sequence_step', 0)
    .order('to_email', { ascending: true })
    .order('sequence_step', { ascending: true })
    .order('created_at', { ascending: true });

  console.log(`📊 Total follow-ups found: ${allFollowups?.length || 0}`);
  console.log('');

  // Group by parent_email_id + sequence_step to find duplicates
  const groupedByParentAndStep = {};

  allFollowups?.forEach(fu => {
    const key = `${fu.parent_email_id}:${fu.sequence_step}`;
    if (!groupedByParentAndStep[key]) {
      groupedByParentAndStep[key] = [];
    }
    groupedByParentAndStep[key].push(fu);
  });

  // Find groups with duplicates
  const duplicateGroups = Object.entries(groupedByParentAndStep)
    .filter(([_, followups]) => followups.length > 1);

  console.log(`🔍 Found ${duplicateGroups.length} groups with duplicates`);
  console.log('');

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates to clean up!');
    return;
  }

  // Show duplicates before cleanup
  console.log('📋 DUPLICATES TO BE REMOVED:');
  let totalDuplicates = 0;
  duplicateGroups.forEach(([key, followups], idx) => {
    if (idx < 10) {
      console.log(`   ${followups[0].to_email} (${followups.length} copies of step ${followups[0].sequence_step}):`);
      followups.forEach((fu, fuIdx) => {
        console.log(`      ${fuIdx === 0 ? '✅ KEEP' : '❌ DELETE'}: ${fu.id} created at ${fu.created_at}`);
      });
    }
    totalDuplicates += (followups.length - 1);
  });

  if (duplicateGroups.length > 10) {
    console.log(`   ... and ${duplicateGroups.length - 10} more groups`);
  }

  console.log('');
  console.log(`🗑️  Total duplicates to delete: ${totalDuplicates}`);
  console.log('');

  // Collect IDs to delete (keep the first, delete the rest)
  const idsToDelete = [];
  duplicateGroups.forEach(([_, followups]) => {
    // Keep the first (oldest) one, delete the rest
    followups.slice(1).forEach(fu => {
      idsToDelete.push(fu.id);
    });
  });

  console.log(`🚨 READY TO DELETE ${idsToDelete.length} DUPLICATE FOLLOW-UPS`);
  console.log('');
  console.log('⚠️  This operation cannot be undone!');
  console.log('⚠️  To proceed with deletion, uncomment the deletion code below.');
  console.log('');

  // SAFETY: Deletion is now ENABLED
  console.log('🗑️  Starting deletion...');

  // Delete in batches of 50
  const batchSize = 50;
  let deleted = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);

    const { error } = await supabase
      .from('scheduled_emails')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, error);
      break;
    }

    deleted += batch.length;
    console.log(`   Deleted ${deleted}/${idsToDelete.length} duplicates...`);
  }

  console.log('');
  console.log(`✅ Successfully deleted ${deleted} duplicate follow-ups!`);
  console.log('');

  // Verify cleanup
  const { data: remainingFollowups } = await supabase
    .from('scheduled_emails')
    .select('id')
    .eq('campaign_id', campaignId)
    .gt('sequence_step', 0);

  console.log(`📊 Follow-ups remaining: ${remainingFollowups?.length || 0}`);
  console.log(`📊 Expected: ${allFollowups.length - deleted}`);
}

cleanupDuplicateFollowups().catch(console.error);
