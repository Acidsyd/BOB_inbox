const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyReplyTemplatesMigration() {
  try {
    console.log('📋 Applying reply templates migration...');
    
    const sql = fs.readFileSync('./backend/migrations/create_reply_templates.sql', 'utf8');
    
    // Execute the SQL using supabase direct query
    const { data, error } = await supabase.rpc('exec_raw_sql', { 
      sql_query: sql 
    });

    if (error) {
      console.error('❌ Error executing migration:', error);
      process.exit(1);
    }

    console.log('✅ Reply templates migration applied successfully');
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    process.exit(1);
  }
}

applyReplyTemplatesMigration();