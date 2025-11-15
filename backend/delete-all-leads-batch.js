require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllLeadsInBatches() {
  try {
    console.log('🔍 Checking current leads count...\n');

    // Get total count
    const { count: initialCount, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting count:', countError);
      process.exit(1);
    }

    console.log(`📊 Total leads in database: ${initialCount}\n`);

    if (initialCount === 0) {
      console.log('✅ No leads to delete. Database is already clean.');
      return;
    }

    console.log('⚠️  WARNING: This will delete ALL leads from ALL lead lists!');
    console.log('⚠️  This action cannot be undone!\n');
    console.log('🗑️  Proceeding with batch deletion in 2 seconds...\n');

    // Wait 2 seconds to give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 2000));

    const batchSize = 1000;
    let totalDeleted = 0;
    let batchCount = 0;

    console.log(`🗑️  Deleting leads in batches of ${batchSize}...\n`);

    while (true) {
      batchCount++;

      // Get a batch of lead IDs
      const { data: leadBatch, error: fetchError } = await supabase
        .from('leads')
        .select('id')
        .limit(batchSize);

      if (fetchError) {
        console.error(`❌ Error fetching batch ${batchCount}:`, fetchError);
        break;
      }

      if (!leadBatch || leadBatch.length === 0) {
        console.log('\n✅ No more leads to delete.');
        break;
      }

      // Delete this batch
      const leadIds = leadBatch.map(lead => lead.id);
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${batchCount}:`, deleteError);
        break;
      }

      totalDeleted += leadBatch.length;
      const progress = ((totalDeleted / initialCount) * 100).toFixed(1);

      process.stdout.write(`\r🗑️  Batch ${batchCount}: Deleted ${totalDeleted}/${initialCount} leads (${progress}%)    `);

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify deletion
    const { count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`\n\n✅ Successfully deleted ${totalDeleted} leads in ${batchCount} batches!`);
    console.log(`📊 Remaining leads: ${finalCount}\n`);

    if (finalCount === 0) {
      console.log('🎉 All leads have been deleted successfully!');
    } else {
      console.log(`⚠️  Warning: ${finalCount} leads remain in the database.`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
deleteAllLeadsInBatches();
