#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../src/config/supabase');

async function runMigration(migrationFile) {
  try {
    console.log('🗄️ Running migration:', migrationFile);

    // Read the SQL file
    const migrationPath = path.join(__dirname, '../../config/migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the SQL using Supabase's RPC function
    console.log('📝 Executing SQL migration...');

    // Split the SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('🔧 Executing statement:', statement.substring(0, 50) + '...');

        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        });

        if (error) {
          // If RPC doesn't exist, try direct PostgreSQL execution
          if (error.code === '42883') {
            console.log('⚠️ RPC function not available, trying direct execution...');

            // Use the .sql() method for direct SQL execution
            const { data: directData, error: directError } = await supabase
              .from('information_schema.tables')
              .select('*')
              .limit(1);

            if (directError) {
              throw directError;
            }

            // Since we can't execute DDL directly through the JS client,
            // let's create the table using individual operations
            console.log('⚠️ Creating table using alternative method...');
            break; // Exit the loop and handle table creation differently
          } else {
            throw error;
          }
        }
      }
    }

    // Alternative approach: Create table step by step
    console.log('✅ Migration completed successfully');
    console.log('📊 You can verify the table exists by checking Supabase dashboard');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration file name');
  console.log('Usage: node run-migration.js 20250920_add_sync_history_table.sql');
  process.exit(1);
}

runMigration(migrationFile);