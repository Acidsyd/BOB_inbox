const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('\n🔧 RUNNING FOLLOW-UP MIGRATION');
  console.log('='.repeat(80));

  // Read the migration file
  const migrationPath = path.join(__dirname, '../database_migrations/add_parent_email_id_to_scheduled_emails.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('\n📄 Migration SQL:');
  console.log(migrationSQL);
  console.log('\n' + '='.repeat(80));

  try {
    // Execute the migration using rpc call
    console.log('⚙️ Executing migration...');

    // Split the SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`\n📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n   ${i + 1}. Executing: ${statement.substring(0, 80)}...`);

      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.error(`   ❌ Error on statement ${i + 1}:`, error);
        // Continue with other statements
      } else {
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration execution attempted');
    console.log('\n⚠️ NOTE: If RPC function is not available, you need to:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy and paste the SQL from the migration file');
    console.log('   3. Execute it manually');
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    console.log('\n⚠️ Manual migration required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy and paste the following SQL:');
    console.log('\n' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80) + '\n');
  }
}

runMigration().catch(console.error);
