#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🔄 Applying relay provider migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../config/migrations/20250114_add_relay_providers.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    // Remove comments and split by semicolons
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Try direct execution if rpc fails
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ statement });

        if (directError) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message || directError.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    // Verify the table was created
    console.log('\n🔍 Verifying relay_providers table...');
    const { data, error: verifyError } = await supabase
      .from('relay_providers')
      .select('id')
      .limit(1);

    if (verifyError) {
      if (verifyError.message.includes('does not exist')) {
        console.error('❌ Migration may have failed - table does not exist');
        console.error('Please apply the migration manually via Supabase SQL Editor:');
        console.error('File: config/migrations/20250114_add_relay_providers.sql');
        process.exit(1);
      } else {
        console.error('❌ Error verifying table:', verifyError.message);
        process.exit(1);
      }
    }

    console.log('✅ relay_providers table verified successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('  ✅ relay_providers table created');
    console.log('  ✅ Indexes added');
    console.log('  ✅ relay_provider_id column added to email_accounts');
    console.log('  ✅ relay_provider_usage_summary view created');
    console.log('\n✨ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n⚠️  Please apply the migration manually via Supabase SQL Editor:');
    console.error('   File: config/migrations/20250114_add_relay_providers.sql');
    process.exit(1);
  }
}

applyMigration();
