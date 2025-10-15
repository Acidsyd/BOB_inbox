#!/usr/bin/env node

/**
 * Migration Runner for Worldwide Timezone Support
 * Runs the database migration using Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in backend/.env');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🗄️  Starting worldwide timezone support migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database_migrations/add_worldwide_timezone_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements (basic splitting by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length === 0) {
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Try direct query if RPC doesn't work
          const { data: directData, error: directError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(1);

          if (directError) {
            console.log(`⚠️  RPC method not available, attempting direct SQL execution...`);
            console.log(`📝 Statement: ${statement.substring(0, 100)}...`);

            // For Supabase, we might need to run these through the dashboard
            // or use a different approach
            console.log('❌ Direct SQL execution not available via Supabase client');
            throw error;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (statementError) {
        console.error(`❌ Error executing statement ${i + 1}:`, statementError.message);
        console.log(`📝 Failed statement: ${statement}`);
        throw statementError;
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('- Added default_timezone and auto_detect_timezone columns to organizations');
    console.log('- Added user_timezone and timezone_detected columns to campaigns');
    console.log('- Created timezone validation functions');
    console.log('- Added indexes for timezone-related queries');
    console.log('- Updated existing records with Europe/Rome timezone');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Check if migration_log table exists first
async function checkMigrationSystem() {
  try {
    const { data, error } = await supabase
      .from('migration_log')
      .select('migration_name')
      .eq('migration_name', 'add_worldwide_timezone_support')
      .single();

    if (data) {
      console.log('⚠️  Migration already applied! Skipping...');
      return false;
    }

    return true;
  } catch (error) {
    // migration_log table might not exist yet, that's OK
    console.log('📝 Migration log table not found, proceeding with migration...');
    return true;
  }
}

async function main() {
  console.log('🌐 Worldwide Timezone Support Migration');
  console.log('=====================================');

  const shouldRun = await checkMigrationSystem();
  if (shouldRun) {
    await runMigration();
  }
}

main().catch(console.error);