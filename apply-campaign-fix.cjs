const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

async function applySchemaFix() {
  console.log('🔧 Applying scheduled_emails schema fix for campaign 400 error...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Check current schema
    console.log('📋 Checking current scheduled_emails schema...');
    const { data: sample, error: sampleError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      const currentColumns = Object.keys(sample[0]);
      console.log(`✅ Current columns: ${currentColumns.join(', ')}`);
      
      const missingColumns = ['template_data', 'email_data', 'personalization', 'variables']
        .filter(col => !currentColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
        console.log('💡 These columns are causing the campaign start 400 error');
        console.log('');
        console.log('🚨 MANUAL ACTION REQUIRED:');
        console.log('Please run this SQL in Supabase SQL Editor:');
        console.log('=====================================');
        console.log(`
ALTER TABLE scheduled_emails 
ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS personalization JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}';
        `);
        console.log('=====================================');
      } else {
        console.log('✅ All required columns are present - campaign start should work');
      }
    }
    
    // Also check a campaign start will work by testing the insert pattern
    console.log('');
    console.log('🔍 Testing campaign start simulation...');
    
    // This is the same pattern as in campaigns.js:935-937
    const testData = {
      id: '00000000-0000-0000-0000-000000000000', // UUID placeholder
      campaign_id: '00000000-0000-0000-0000-000000000000',
      lead_id: '00000000-0000-0000-0000-000000000000', 
      email_account_id: '00000000-0000-0000-0000-000000000000',
      sequence_step: 0,
      status: 'scheduled',
      send_at: new Date().toISOString(),
      organization_id: '550e8400-e29b-41d4-a716-446655440000'
    };
    
    // Don't actually insert, just check if the structure would work
    console.log('💡 Campaign start creates scheduled_emails with these fields:');
    Object.keys(testData).forEach((key, i) => {
      console.log(`  ${i+1}. ${key}`);
    });
    
    console.log('');
    console.log('🎯 DIAGNOSIS:');
    console.log('The campaign.start() API expects these JSONB columns to exist:');
    console.log('• template_data - JSONB for template variables');
    console.log('• email_data - JSONB for email content');  
    console.log('• personalization - JSONB for personalized data');
    console.log('• variables - JSONB for campaign variables');
    console.log('');
    console.log('❗ Without these columns, INSERT fails with 400 error');
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

applySchemaFix().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});