const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyBounceMigration() {
  console.log('🔧 Applying bounce tracking database migration...');
  
  try {
    // Read the bounce tracking migration file
    const migrationPath = path.join(__dirname, '..', 'database_migrations', '20250201_bounce_tracking_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📋 Read migration file: ${migrationPath}`);
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}`);
          const { error } = await supabase.rpc('exec', { query: statement + ';' });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error);
            // Continue with other statements unless it's a critical error
            if (error.message && !error.message.includes('already exists')) {
              throw error;
            } else {
              console.log(`⚠️ Statement ${i + 1} already exists, skipping...`);
            }
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (statementError) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, statementError);
          if (!statementError.message.includes('already exists')) {
            throw statementError;
          }
        }
      }
    }
    
    console.log('✅ Bounce tracking migration completed successfully!');
    
    // Test that the schema works
    console.log('🧪 Testing bounce tracking schema...');
    
    // Check if email_bounces table exists
    const { data: bounceTableCheck, error: tableError } = await supabase
      .from('email_bounces')
      .select('id')
      .limit(1);
      
    if (tableError) {
      console.error('❌ Email bounces table test failed:', tableError);
    } else {
      console.log('✅ Email bounces table is accessible');
    }
    
    // Check if campaign_bounce_stats view exists
    const { data: viewCheck, error: viewError } = await supabase
      .from('campaign_bounce_stats')
      .select('campaign_id')
      .limit(1);
      
    if (viewError) {
      console.error('❌ Campaign bounce stats view test failed:', viewError);
    } else {
      console.log('✅ Campaign bounce stats view is accessible');
    }
    
    // Check if functions exist by trying to call them with a dummy UUID
    const testCampaignId = '00000000-0000-0000-0000-000000000000';
    
    try {
      const { error: funcError } = await supabase.rpc('update_campaign_bounce_rate', {
        p_campaign_id: testCampaignId
      });
      
      // We expect this to not find the campaign, but the function should exist
      if (funcError && !funcError.message.includes('does not exist')) {
        console.log('✅ update_campaign_bounce_rate function is callable');
      } else {
        console.log('⚠️ update_campaign_bounce_rate function may have issues:', funcError?.message);
      }
    } catch (funcTestError) {
      console.error('❌ Function test failed:', funcTestError);
    }
    
    console.log('🎉 Bounce tracking system is ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyBounceMigration().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});