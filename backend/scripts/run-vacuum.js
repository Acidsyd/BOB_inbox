require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runVacuum() {
  console.log('🧹 Attempting to run VACUUM...\n');

  try {
    // Try to run VACUUM via RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'VACUUM FULL scheduled_emails;'
    });

    if (error) {
      console.log('❌ Cannot run VACUUM via API (expected - requires superuser)');
      console.log('\n');
      console.log('═'.repeat(70));
      console.log('📋 MANUAL STEPS REQUIRED');
      console.log('═'.repeat(70));
      console.log('\n1. Open your Supabase Dashboard');
      console.log('2. Go to: SQL Editor (in left sidebar)');
      console.log('3. Paste this command:\n');
      console.log('   VACUUM FULL;\n');
      console.log('4. Click "Run"');
      console.log('5. Wait 2-5 minutes for it to complete\n');
      console.log('Expected Result:');
      console.log('   - Database size: 476 MB → ~170 MB (save ~300 MB)');
      console.log('   - scheduled_emails table: 335 MB → 31 MB');
      console.log('═'.repeat(70));
      return;
    }

    console.log('✅ VACUUM completed successfully!');
    console.log('   Space has been reclaimed.');

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📋 MANUAL STEPS REQUIRED');
    console.log('═'.repeat(70));
    console.log('\nYou need to run VACUUM manually in Supabase SQL Editor:\n');
    console.log('   VACUUM FULL;\n');
    console.log('This will reclaim ~300 MB of space.');
    console.log('═'.repeat(70));
  }
}

runVacuum();
