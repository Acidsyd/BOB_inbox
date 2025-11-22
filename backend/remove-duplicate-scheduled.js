require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function removeDuplicates(dryRun = true) {
  const campaignId = '6e461b9b-50f2-44b6-a65e-27b57234586e';

  // Get all scheduled emails
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, from_email, send_at, status')
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled')
    .order('send_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by recipient
  const grouped = {};
  emails.forEach(email => {
    if (!grouped[email.to_email]) {
      grouped[email.to_email] = [];
    }
    grouped[email.to_email].push(email);
  });

  // Find duplicates (keep first, remove rest)
  const toDelete = [];
  Object.entries(grouped).forEach(([recipient, emailList]) => {
    if (emailList.length > 1) {
      // Keep the first email, delete the rest
      const duplicates = emailList.slice(1);
      toDelete.push(...duplicates.map(e => e.id));

      console.log(`\n${recipient}:`);
      console.log(`  ✅ KEEP: ${new Date(emailList[0].send_at).toLocaleString()} (ID: ${emailList[0].id})`);
      duplicates.forEach(dup => {
        console.log(`  ❌ DELETE: ${new Date(dup.send_at).toLocaleString()} (ID: ${dup.id})`);
      });
    }
  });

  console.log(`\n\n📊 Summary:`);
  console.log(`   Total scheduled emails: ${emails.length}`);
  console.log(`   Duplicate emails to delete: ${toDelete.length}`);
  console.log(`   Emails remaining after cleanup: ${emails.length - toDelete.length}`);

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN MODE - No emails were deleted`);
    console.log(`   To actually delete duplicates, run: node remove-duplicate-scheduled.js --confirm`);
  } else {
    console.log(`\n🗑️  Deleting ${toDelete.length} duplicate emails...`);

    // Delete in batches of 50
    const batchSize = 50;
    let deleted = 0;

    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from('scheduled_emails')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, deleteError);
      } else {
        deleted += batch.length;
        console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toDelete.length / batchSize)} (${deleted}/${toDelete.length})`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deleted} duplicate scheduled emails`);
    console.log(`   ${emails.length - deleted} emails remaining in campaign`);
  }
}

// Check for --confirm flag
const args = process.argv.slice(2);
const dryRun = !args.includes('--confirm');

if (dryRun) {
  console.log('🔍 DRY RUN MODE - Analyzing duplicates...\n');
} else {
  console.log('⚠️  CONFIRM MODE - Will delete duplicates!\n');
}

removeDuplicates(dryRun);
