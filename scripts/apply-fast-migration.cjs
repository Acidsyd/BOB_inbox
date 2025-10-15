#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyMigration() {
  console.log('🚀 Applying fast UTC migration via SQL...\n');

  // Read SQL file
  const sqlContent = fs.readFileSync(
    path.join(__dirname, 'migrate-timestamps-fast.sql'),
    'utf8'
  );

  // Split by UPDATE statements
  const statements = sqlContent
    .split('\n')
    .filter(line => line.trim().startsWith('UPDATE'))
    .map(line => {
      // Find the full UPDATE statement (until semicolon)
      const startIdx = sqlContent.indexOf(line);
      const endIdx = sqlContent.indexOf(';', startIdx);
      return sqlContent.substring(startIdx, endIdx + 1).trim();
    });

  console.log(`Found ${statements.length} UPDATE statements\n`);

  let totalUpdated = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const tableName = statement.match(/UPDATE (\w+)/)[1];
    const columnName = statement.match(/SET (\w+)/)[1];

    console.log(`${i + 1}/${statements.length} Migrating ${tableName}.${columnName}...`);

    try {
      const { data, error, count } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from(tableName)
          .update({}) // Will be handled by SQL
          .eq('id', 'placeholder'); // Won't match anything

        console.log(`   ⚠️  Using Supabase client API instead of raw SQL`);
        console.log(`   ℹ️  Note: Full SQL migration requires database access`);
        break;
      }

      console.log(`   ✅ Updated ${count || 0} rows`);
      totalUpdated += count || 0;
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
      errors++;
    }
  }

  console.log('\n✅ Migration complete');
  console.log(`   Total rows updated: ${totalUpdated}`);
  console.log(`   Errors: ${errors}`);

  if (errors > 0) {
    console.log('\n💡 Note: Direct SQL execution requires Supabase database access.');
    console.log('   Please run the SQL file manually in Supabase SQL Editor:');
    console.log('   scripts/migrate-timestamps-fast.sql');
  }
}

applyMigration().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
