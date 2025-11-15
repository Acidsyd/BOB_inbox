require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteLeadsForOrganization(orgId, orgName) {
  const batchSize = 500;
  let totalDeleted = 0;
  let batchCount = 0;

  while (true) {
    batchCount++;

    // Get a batch of lead IDs for this organization
    const { data: leadBatch, error: fetchError } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', orgId)
      .limit(batchSize);

    if (fetchError) {
      console.error(`  ❌ Error fetching batch ${batchCount}:`, fetchError.message);
      break;
    }

    if (!leadBatch || leadBatch.length === 0) {
      break;
    }

    // Delete this batch
    const leadIds = leadBatch.map(lead => lead.id);
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .in('id', leadIds);

    if (deleteError) {
      console.error(`  ❌ Error deleting batch ${batchCount}:`, deleteError.message);
      break;
    }

    totalDeleted += leadBatch.length;
    process.stdout.write(`\r  🗑️  Deleted ${totalDeleted} leads...    `);

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\r  ✅ Deleted ${totalDeleted} leads for ${orgName || orgId}          `);
  return totalDeleted;
}

async function deleteAllLeadsRobust() {
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
    console.log('Press Ctrl+C within 3 seconds to cancel...\n');

    // Wait 3 seconds to give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Starting deletion process...\n');

    // Get all organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name');

    let grandTotal = 0;

    for (const org of orgs || []) {
      console.log(`\n📋 Processing organization: ${org.name || org.id}`);

      const deleted = await deleteLeadsForOrganization(org.id, org.name);
      grandTotal += deleted;
    }

    // Verify deletion
    const { count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`✅ Deletion complete!`);
    console.log(`📊 Total deleted: ${grandTotal} leads`);
    console.log(`📊 Remaining: ${finalCount} leads`);
    console.log(`${'='.repeat(60)}\n`);

    if (finalCount === 0) {
      console.log('🎉 All leads have been deleted successfully!');
    } else {
      console.log(`⚠️  Warning: ${finalCount} leads remain in the database.`);
      console.log(`ℹ️  You can run this script again to delete the remaining leads.`);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
deleteAllLeadsRobust();
