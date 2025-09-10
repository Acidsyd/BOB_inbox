require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addActualMessageIdColumn() {
  console.log('🔧 Adding actual_message_id column to scheduled_emails table...');
  
  try {
    // First check if column already exists
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'scheduled_emails')
      .eq('column_name', 'actual_message_id');

    if (columns && columns.length > 0) {
      console.log('✅ Column actual_message_id already exists');
      return;
    }

    // Add the column using raw SQL
    const { data, error } = await supabase.from('scheduled_emails').select('id').limit(1);
    
    if (error && error.code === '42703') {
      console.log('🔧 Column does not exist, creating it manually...');
      console.log('⚠️ Please run this SQL manually in your Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE scheduled_emails ADD COLUMN actual_message_id VARCHAR(500);');
      console.log('CREATE INDEX IF NOT EXISTS idx_scheduled_emails_actual_message_id ON scheduled_emails(actual_message_id);');
      console.log('');
      console.log('Then restart the reply monitoring service.');
    } else {
      console.log('✅ Table schema looks good');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

addActualMessageIdColumn();