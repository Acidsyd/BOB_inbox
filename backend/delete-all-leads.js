require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllLeads() {
  try {
    console.log('🔍 Checking current leads count...\n');

    // Get total count
    const { count, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting count:', countError);
      process.exit(1);
    }

    console.log(`📊 Total leads in database: ${count}\n`);

    if (count === 0) {
      console.log('✅ No leads to delete. Database is already clean.');
      return;
    }

    // Get breakdown by lead list
    const { data: leadLists, error: listError } = await supabase
      .from('lead_lists')
      .select('id, name');

    if (listError) {
      console.error('❌ Error getting lead lists:', listError);
    } else {
      console.log('📋 Breakdown by lead list:');
      for (const list of leadLists) {
        const { count: listCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('lead_list_id', list.id);

        if (listCount > 0) {
          console.log(`   - ${list.name}: ${listCount} leads`);
        }
      }
      console.log('');
    }

    console.log('⚠️  WARNING: This will delete ALL leads from ALL lead lists!');
    console.log('⚠️  This action cannot be undone!\n');
    console.log('🗑️  Proceeding with deletion in 3 seconds...\n');

    // Wait 3 seconds to give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Deleting all leads...\n');

    // Delete all leads
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)

    if (deleteError) {
      console.error('❌ Error deleting leads:', deleteError);
      process.exit(1);
    }

    // Verify deletion
    const { count: finalCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Successfully deleted ${count} leads!`);
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
deleteAllLeads();
