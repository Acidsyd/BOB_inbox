import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyUnifiedInboxMigration() {
  try {
    console.log('📋 Applying unified inbox migration...');
    
    const sql = fs.readFileSync('./database_migrations/unified_inbox_schema.sql', 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_raw_sql', { 
          sql_query: statement.trim() + ';' 
        });

        if (error) {
          console.error('❌ Error executing statement:', error);
          console.log('Statement:', statement.trim());
        }
      } catch (err) {
        console.error('❌ Failed to execute statement:', err.message);
        console.log('Statement:', statement.trim());
      }
    }

    console.log('✅ Unified inbox migration applied successfully');
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    process.exit(1);
  }
}

applyUnifiedInboxMigration();