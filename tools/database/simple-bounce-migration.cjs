const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rhhzxmppkmcxnwqaxeeb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaHp4bXBwa21jeG53cWF4ZWViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTgxNTM3OCwiZXhwIjoyMDQ1MzkxMzc4fQ.yJlJGYmGxlLqQNkxiQF3h2AhPKGhEOb3WJGjGNxX3hE'
);

async function applySimpleBounceColumns() {
  console.log('🎯 Adding essential bounce tracking columns...\n');
  
  try {
    // Test connection first
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database connection failed:', testError.message);
      return;
    }
    console.log('✅ Database connection successful\n');
    
    // Add bounce columns to scheduled_emails table
    console.log('📋 Adding bounce columns to scheduled_emails table...');
    
    // First, check if columns already exist
    const { data: existingEmails } = await supabase
      .from('scheduled_emails')
      .select('bounce_type')
      .limit(1);
    
    if (existingEmails !== null) {
      console.log('✅ scheduled_emails.bounce_type already exists');
    } else {
      console.log('⚠️  scheduled_emails.bounce_type does not exist - needs manual addition');
      console.log('   Run in Supabase SQL Editor:');
      console.log('   ALTER TABLE scheduled_emails ADD COLUMN bounce_type VARCHAR(10);');
      console.log('   ALTER TABLE scheduled_emails ADD COLUMN bounce_reason TEXT;');
    }
    
    // Add bounce columns to campaigns table
    console.log('\n📋 Checking campaigns table bounce columns...');
    const { data: existingCampaigns } = await supabase
      .from('campaigns')
      .select('bounce_rate')
      .limit(1);
    
    if (existingCampaigns !== null) {
      console.log('✅ campaigns.bounce_rate already exists');
    } else {
      console.log('⚠️  campaigns.bounce_rate does not exist - needs manual addition');
      console.log('   Run in Supabase SQL Editor:');
      console.log('   ALTER TABLE campaigns ADD COLUMN bounce_rate DECIMAL(5,2) DEFAULT 0;');
      console.log('   ALTER TABLE campaigns ADD COLUMN total_bounces INTEGER DEFAULT 0;');
    }
    
    // Check if email_bounces table exists
    console.log('\n📋 Checking email_bounces table...');
    const { data: bounceData, error: bounceError } = await supabase
      .from('email_bounces')
      .select('id')
      .limit(1);
    
    if (!bounceError) {
      console.log('✅ email_bounces table exists');
    } else {
      console.log('⚠️  email_bounces table does not exist - needs manual creation');
      console.log('   Run in Supabase SQL Editor:');
      console.log('   CREATE TABLE email_bounces (');
      console.log('     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('     scheduled_email_id UUID,');
      console.log('     campaign_id UUID,');
      console.log('     bounce_type VARCHAR(10),');
      console.log('     bounce_reason TEXT,');
      console.log('     recipient_email TEXT,');
      console.log('     bounced_at TIMESTAMPTZ DEFAULT now(),');
      console.log('     organization_id UUID');
      console.log('   );');
    }
    
    console.log('\n🎉 Bounce detection database check complete!');
    console.log('📋 If any columns/tables were missing, run the SQL commands above in Supabase.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applySimpleBounceColumns();