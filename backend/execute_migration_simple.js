const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function executeMigration() {
  console.log('\n🔧 EXECUTING FOLLOW-UP MIGRATION');
  console.log('='.repeat(80));

  const sql = `
-- Add parent_email_id column to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN IF NOT EXISTS parent_email_id UUID REFERENCES scheduled_emails(id) ON DELETE SET NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_parent_email_id
ON scheduled_emails(parent_email_id)
WHERE parent_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_parent
ON scheduled_emails(campaign_id, parent_email_id)
WHERE parent_email_id IS NOT NULL;
`;

  console.log('📝 SQL to execute:');
  console.log(sql);
  console.log('\n⚠️ IMPORTANT: This migration must be run in Supabase SQL Editor');
  console.log('   Supabase JS client does not support ALTER TABLE commands');
  console.log('\nSteps:');
  console.log('   1. Go to Supabase Dashboard → SQL Editor');
  console.log('   2. Create a new query');
  console.log('   3. Copy the SQL above and paste it');
  console.log('   4. Click "Run" to execute');
  console.log('\nAlternatively, checking if the column already exists...\n');

  // Try to query the table structure to see if column exists
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('parent_email_id')
    .limit(1);

  if (error) {
    if (error.message.includes('parent_email_id')) {
      console.log('❌ Column parent_email_id does NOT exist');
      console.log('   Please run the migration in Supabase SQL Editor');
    } else {
      console.log('❌ Error checking column:', error.message);
    }
  } else {
    console.log('✅ Column parent_email_id ALREADY EXISTS!');
    console.log('   Migration may have been run already');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

executeMigration().catch(console.error);
