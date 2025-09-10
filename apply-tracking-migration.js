const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting email tracking migration...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync('./database_migrations/20250203_email_tracking.sql', 'utf8');
    
    // Split by statements and execute
    const statements = migrationSQL
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      // Skip comments
      if (statement.startsWith('--')) continue;
      
      try {
        // Execute raw SQL using Supabase
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_exec').rpc('sql', { query: statement });
          
          if (directError) {
            console.error(`❌ Error executing statement: ${directError.message}`);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          } else {
            console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
            successCount++;
          }
        } else {
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Email tracking migration completed successfully!');
      console.log('✅ Created email_tracking_events table');
      console.log('✅ Added tracking token to scheduled_emails');
      console.log('✅ Created tracking views and functions');
      console.log('✅ Set up bot detection patterns');
    } else {
      console.log('\n⚠️ Migration completed with some errors. Please check the output above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach: Execute as a single transaction
async function runMigrationAlternative() {
  try {
    console.log('🚀 Attempting alternative migration approach...');
    
    const migrationSQL = fs.readFileSync('./database_migrations/20250203_email_tracking.sql', 'utf8');
    
    // Try to execute the entire migration as one query via API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });
    
    if (response.ok) {
      console.log('✅ Migration executed successfully via API');
    } else {
      const error = await response.text();
      console.error('❌ API Error:', error);
      
      // Fallback to manual approach
      console.log('📝 Please run the migration manually in Supabase dashboard:');
      console.log('1. Go to your Supabase project SQL Editor');
      console.log('2. Copy the contents of database_migrations/20250203_email_tracking.sql');
      console.log('3. Paste and execute in the SQL editor');
    }
  } catch (error) {
    console.error('❌ Alternative approach failed:', error);
    console.log('\n📝 Manual migration instructions:');
    console.log('1. Open Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy contents from: database_migrations/20250203_email_tracking.sql');
    console.log('4. Execute in SQL Editor');
  }
}

// Try the main approach first
runMigration().catch(() => {
  console.log('\n🔄 Trying alternative approach...');
  runMigrationAlternative();
});