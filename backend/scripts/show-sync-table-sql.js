#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function showSyncTableSQL() {
  try {
    console.log('🗄️ SQL to create sync_history table:');

    // Read the migration SQL
    const migrationPath = path.join(__dirname, '../../config/migrations/20250920_add_sync_history_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('════════════════════════════════════════════════════════════════');
    console.log(sql);
    console.log('════════════════════════════════════════════════════════════════');

    console.log('\n📋 Steps to create the table:');
    console.log('1. Go to your Supabase dashboard (https://supabase.com/dashboard)');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Run the query');
    console.log('\n✅ After creating the table, the autosync status will show proper timestamps');

  } catch (error) {
    console.error('❌ Error reading migration file:', error);
  }
}

showSyncTableSQL();