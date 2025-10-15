const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rhhzxmppkmcxnwqaxeeb.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaHp4bXBwa21jeG53cWF4ZWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTgxNTM3OCwiZXhwIjoyMDQ1MzkxMzc4fQ.yJlJGYmGxlLqQNkxiQF3h2AhPKGhEOb3WJGjGNxX3hE'
);

async function applyBounceTrackingMigration() {
  try {
    console.log('🚀 Applying bounce tracking database migration...\n');
    
    // Read the migration file
    const migrationPath = './database_migrations/20250201_bounce_tracking_schema.sql';
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: ' + migrationPath);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📏 Migration size:', migrationSQL.length, 'characters\n');
    
    // Split the migration into individual statements and execute them
    // Remove comments and empty lines for cleaner execution
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
      
    console.log('📊 Found', statements.length, 'SQL statements to execute\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        console.log(`📋 Executing statement ${i + 1}/${statements.length}...`);
        
        // Show first 80 characters of the statement for context
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ') + (statement.length > 80 ? '...' : '');
        console.log(`   SQL: ${preview}`);
        
        const { error } = await supabase.rpc('sql', { query: statement + ';' });
        
        if (error) {
          // Check if it's an ignorable error (like "already exists")
          const ignorableErrors = [
            'already exists',
            'duplicate key', 
            'column already exists',
            'relation already exists',
            'function already exists'
          ];
          
          const isIgnorable = ignorableErrors.some(pattern => 
            error.message.toLowerCase().includes(pattern.toLowerCase())
          );
          
          if (isIgnorable) {
            console.log(`   ⚠️  Skipped (already exists): ${error.message.substring(0, 100)}`);
          } else {
            console.log(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
        
      } catch (err) {
        console.log(`   ❌ Exception: ${err.message}`);
        errorCount++;
      }
      
      console.log(''); // Blank line for readability
    }
    
    console.log('📊 Migration Results:');
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);
    console.log(`   📄 Total statements processed: ${successCount + errorCount}\n`);
    
    // Test that the migration worked by checking for key columns
    console.log('🔍 Testing migration success...');
    
    // Check if bounce columns were added to scheduled_emails
    const { data: scheduleColumns } = await supabase
      .from('scheduled_emails')
      .select('bounce_type, bounce_reason')
      .limit(1);
      
    if (scheduleColumns !== null) {
      console.log('   ✅ scheduled_emails bounce columns: Available');
    } else {
      console.log('   ❌ scheduled_emails bounce columns: Not available');
    }
    
    // Check if bounce columns were added to campaigns
    const { data: campaignColumns } = await supabase
      .from('campaigns')
      .select('bounce_rate, total_bounces')
      .limit(1);
      
    if (campaignColumns !== null) {
      console.log('   ✅ campaigns bounce columns: Available');
    } else {
      console.log('   ❌ campaigns bounce columns: Not available');
    }
    
    // Check if email_bounces table exists
    const { data: bounceTable, error: bounceError } = await supabase
      .from('email_bounces')
      .select('id')
      .limit(1);
      
    if (!bounceError) {
      console.log('   ✅ email_bounces table: Available');
    } else {
      console.log('   ❌ email_bounces table: Not available -', bounceError.message);
    }
    
    // Check if the view exists
    const { data: viewData, error: viewError } = await supabase
      .from('campaign_bounce_stats')
      .select('*')
      .limit(1);
      
    if (!viewError) {
      console.log('   ✅ campaign_bounce_stats view: Available');
    } else {
      console.log('   ❌ campaign_bounce_stats view: Not available -', viewError.message);
    }
    
    if (errorCount === 0) {
      console.log('\n🎉 Bounce tracking migration completed successfully!');
      console.log('📋 The system can now track email bounces and protect campaigns.');
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors. Review the errors above.`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error.message);
    process.exit(1);
  }
}

applyBounceTrackingMigration();