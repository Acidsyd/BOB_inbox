const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumns() {
  console.log('🔧 Adding missing columns to bounce tracking tables...');
  
  try {
    // Try to add the message_id_header column using a simple query
    console.log('📝 Adding message_id_header column to email_bounces...');
    
    // Test if we can add a column by trying to select from the table
    const { data: testBounces, error: testError } = await supabase
      .from('email_bounces')
      .select('message_id_header')
      .limit(1);
      
    if (testError && testError.message.includes('message_id_header')) {
      console.log('⚠️ Column message_id_header does not exist. Need to add it manually.');
      console.log('');
      console.log('🔧 Please run this SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE email_bounces ADD COLUMN IF NOT EXISTS message_id_header TEXT;');
      console.log('CREATE INDEX IF NOT EXISTS idx_email_bounces_message_id_header ON email_bounces(message_id_header) WHERE message_id_header IS NOT NULL;');
      console.log('');
    } else {
      console.log('✅ message_id_header column already exists or table accessible');
    }
    
    // Test bounce tracking columns in leads table
    console.log('📝 Checking bounce columns in leads table...');
    const { data: testLeads, error: leadsError } = await supabase
      .from('leads')
      .select('is_bounced, bounce_type, bounced_at')
      .limit(1);
      
    if (leadsError) {
      console.log('⚠️ Some bounce columns missing in leads table:', leadsError.message);
      console.log('');
      console.log('🔧 Please run this SQL in your Supabase SQL Editor:');
      console.log('');
      console.log(`ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS is_bounced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bounce_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_bounce_type_check;

ALTER TABLE leads 
ADD CONSTRAINT leads_bounce_type_check 
CHECK (bounce_type IS NULL OR bounce_type IN ('hard', 'soft'));`);
      console.log('');
    } else {
      console.log('✅ Bounce columns already exist in leads table');
    }
    
    console.log('💡 After adding the columns, we can revert the BounceTrackingService to use them.');
    
  } catch (error) {
    console.error('❌ Error checking columns:', error);
  }
}

addColumns().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});