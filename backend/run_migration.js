#!/usr/bin/env node

// Direct database migration script
// Adds the missing provider_thread_id column to conversations table

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('🔧 Running migration to add provider_thread_id column...');

  try {
    // Step 1: Add the column
    console.log('📝 Step 1: Adding provider_thread_id column...');
    const { error: alterError } = await supabase.rpc('exec', {
      query: `
        ALTER TABLE conversations
        ADD COLUMN IF NOT EXISTS provider_thread_id TEXT;
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      // Try direct SQL approach
      const { error: directError } = await supabase
        .from('conversations')
        .select('provider_thread_id')
        .limit(0);

      if (directError && directError.code === 'PGRST204') {
        console.log('✅ Column needs to be added via Supabase dashboard or psql');
        console.log('\nRun this SQL in your Supabase SQL Editor:');
        console.log('----------------------------------------');
        console.log('ALTER TABLE conversations');
        console.log('ADD COLUMN IF NOT EXISTS provider_thread_id TEXT;');
        console.log('');
        console.log('CREATE INDEX IF NOT EXISTS idx_conversations_provider_thread_id');
        console.log('ON conversations(provider_thread_id);');
        console.log('----------------------------------------');
      }
    } else {
      console.log('✅ Column added or already exists');
    }

    console.log('\n✅ Migration process completed');
    console.log('Please verify the column exists in Supabase dashboard');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigration();
