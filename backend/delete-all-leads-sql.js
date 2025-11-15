require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllLeadsSQL() {
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

    console.log('🗑️  Executing DELETE via SQL...\n');

    // Use RPC or raw SQL to delete all leads
    const { error: deleteError } = await supabase.rpc('delete_all_leads_fn');

    if (deleteError) {
      // If RPC doesn't exist, try alternative method
      console.log('RPC function not found, using alternative deletion method...\n');

      // Delete by organization (safer and more targeted)
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id');

      for (const org of orgs || []) {
        console.log(`Deleting leads for organization: ${org.id}`);

        const { error: orgDeleteError } = await supabase
          .from('leads')
          .delete()
          .eq('organization_id', org.id);

        if (orgDeleteError) {
          console.error(`Error deleting leads for org ${org.id}:`, orgDeleteError);
        }
      }
    }

    // Verify deletion
    const { count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    const deleted = initialCount - finalCount;

    console.log(`\n✅ Successfully deleted ${deleted} leads!`);
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
deleteAllLeadsSQL();
