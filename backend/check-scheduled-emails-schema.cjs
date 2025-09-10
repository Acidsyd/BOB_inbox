const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function checkScheduledEmailsSchema() {
  console.log('🔍 Checking scheduled_emails table schema...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get a sample record to see what columns exist
    console.log('📋 Checking existing scheduled_emails columns...');
    const { data: sampleEmail, error: sampleError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Error fetching sample:', sampleError);
      return;
    }
    
    if (sampleEmail && sampleEmail.length > 0) {
      const columns = Object.keys(sampleEmail[0]);
      console.log(`✅ Found ${columns.length} columns in scheduled_emails:`);
      columns.forEach((col, i) => {
        console.log(`  ${i+1}. ${col}`);
      });
      
      // Check what's missing
      const expectedColumns = ['template_data', 'email_data', 'personalization', 'variables'];
      const missingColumns = expectedColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`\n❌ Missing columns: ${missingColumns.join(', ')}`);
        console.log('💡 This is likely causing the campaign start 400 error');
        
        // Create SQL to add missing columns
        console.log('\n🔧 SQL to fix scheduled_emails table:');
        console.log('=====================================');
        
        const alterSQL = `
-- Add missing columns to scheduled_emails table
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS personalization JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}';

-- Create indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_template_data ON scheduled_emails USING GIN (template_data);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_email_data ON scheduled_emails USING GIN (email_data);
        `;
        
        console.log(alterSQL);
        console.log('=====================================');
        console.log('💡 Run this SQL in Supabase SQL Editor to fix the issue');
        
        // Try to apply the fix directly
        console.log('\n🚀 Attempting to apply the fix...');
        try {
          const { error: alterError } = await supabase.rpc('exec', { query: alterSQL.trim() });
          if (alterError) {
            console.error('❌ Could not apply fix automatically:', alterError);
            console.log('📝 Please run the SQL manually in Supabase SQL Editor');
          } else {
            console.log('✅ Schema fix applied successfully!');
            console.log('🎉 Campaign start should work now');
          }
        } catch (execError) {
          console.log('⚠️ Automatic fix not available - please run SQL manually');
        }
        
      } else {
        console.log('\n✅ All expected columns are present');
      }
      
    } else {
      console.log('📭 No scheduled_emails found - checking table structure differently');
      
      // Try to get schema info another way
      console.log('🔍 Checking table schema via information_schema...');
      const { data: schemaInfo, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'scheduled_emails')
        .eq('table_schema', 'public');
        
      if (!schemaError && schemaInfo) {
        console.log('📊 Table columns from schema:');
        schemaInfo.forEach((col, i) => {
          console.log(`  ${i+1}. ${col.column_name} (${col.data_type})`);
        });
      }
    }
    
    // Also check what the campaign start endpoint expects
    console.log('\n🔍 Checking what campaign code expects...');
    console.log('The campaign start process likely needs:');
    console.log('  • template_data: JSONB for email template variables');  
    console.log('  • email_data: JSONB for personalized email content');
    console.log('  • personalization: JSONB for lead-specific data');
    console.log('  • variables: JSONB for campaign variables');
    console.log('');
    console.log('💡 Without these columns, campaign.start() fails with 400 error');
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkScheduledEmailsSchema().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});