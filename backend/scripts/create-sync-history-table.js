#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../src/config/supabase');

async function createSyncHistoryTable() {
  try {
    console.log('🗄️ Creating sync_history table...');

    // Check if table already exists
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'sync_history');

    if (checkError) {
      console.error('❌ Error checking for existing table:', checkError);
      return;
    }

    if (existingTables && existingTables.length > 0) {
      console.log('✅ sync_history table already exists');
      return;
    }

    // Read the migration SQL
    const migrationPath = path.join(__dirname, '../../config/migrations/20250920_add_sync_history_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing SQL to create sync_history table...');
    console.log('⚠️ Note: This script will show the SQL but cannot execute DDL directly.');
    console.log('🔧 Please run this SQL manually in Supabase SQL editor:');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(sql);
    console.log('════════════════════════════════════════════════════════════════');

    console.log('\n📋 Steps to create the table:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Run the query');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSyncHistoryTable();