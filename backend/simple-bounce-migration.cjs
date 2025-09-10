const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBounceTable() {
  console.log('🔧 Creating email_bounces table...');
  
  try {
    // First check if table already exists by trying to select from it
    const { error: existsError } = await supabase
      .from('email_bounces')
      .select('id')
      .limit(1);
      
    if (!existsError) {
      console.log('✅ email_bounces table already exists');
      return;
    }
    
    // Try to create the table using a direct SQL query (without rpc)
    console.log('⚠️ Attempting to create bounce table using alternative method...');
    
    // Since we can't use exec RPC, let's try a simpler approach
    // Just check if we can access the table, and if not, advise manual creation
    console.log('ℹ️ The email_bounces table needs to be created manually in Supabase.');
    console.log('ℹ️ Please run this SQL in Supabase SQL Editor:');
    console.log('');
    console.log(`CREATE TABLE IF NOT EXISTS email_bounces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scheduled_email_id UUID REFERENCES scheduled_emails(id) ON DELETE SET NULL,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      message_id_header TEXT,
      provider VARCHAR(20) NOT NULL DEFAULT 'smtp',
      bounce_type VARCHAR(10) NOT NULL,
      bounce_code VARCHAR(10),
      bounce_reason TEXT,
      recipient_email TEXT NOT NULL,
      bounced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
    );`);
    console.log('');
    console.log('📌 For now, let\'s test bounce detection by creating a minimal version...');
    
    // For testing, let's see if we can insert into a simpler structure
    // or check what columns exist in scheduled_emails
    const { data: scheduledEmailsTest, error: seError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .limit(1);
      
    if (scheduledEmailsTest && scheduledEmailsTest.length > 0) {
      console.log('✅ scheduled_emails table accessible');
      console.log('📋 Sample columns:', Object.keys(scheduledEmailsTest[0]));
    } else {
      console.log('⚠️ scheduled_emails table structure:', seError);
    }
    
  } catch (error) {
    console.error('❌ Error in createBounceTable:', error);
  }
}

// Test if we can update scheduled_emails status to bounced
async function testBounceUpdate() {
  console.log('🧪 Testing bounce status update on scheduled_emails...');
  
  try {
    // Find a test email that's already sent
    const { data: testEmail, error: findError } = await supabase
      .from('scheduled_emails')
      .select('id, status, to_email')
      .eq('status', 'sent')
      .limit(1);
      
    if (findError) {
      console.log('⚠️ No sent emails found for testing:', findError.message);
      return;
    }
    
    if (!testEmail || testEmail.length === 0) {
      console.log('ℹ️ No sent emails available for bounce testing');
      return;
    }
    
    const testEmailId = testEmail[0].id;
    const testEmailAddress = testEmail[0].to_email;
    
    console.log(`📧 Testing bounce update for email: ${testEmailId} (${testEmailAddress})`);
    
    // Try to update the status to bounced
    const { error: updateError } = await supabase
      .from('scheduled_emails')
      .update({ 
        status: 'bounced',
        bounce_type: 'hard',
        bounce_reason: 'TEST: Domain does not exist',
        updated_at: new Date().toISOString()
      })
      .eq('id', testEmailId);
    
    if (updateError) {
      console.error('❌ Failed to update email to bounced status:', updateError);
      
      // Check which columns actually exist
      console.log('🔍 Checking available columns in scheduled_emails...');
      const { data: columnTest, error: columnError } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('id', testEmailId)
        .single();
        
      if (columnTest) {
        console.log('📋 Available columns:', Object.keys(columnTest));
        
        // Try a simpler update with only status
        console.log('🔄 Trying simplified update...');
        const { error: simpleUpdateError } = await supabase
          .from('scheduled_emails')
          .update({ status: 'bounced' })
          .eq('id', testEmailId);
          
        if (simpleUpdateError) {
          console.error('❌ Even simple status update failed:', simpleUpdateError);
        } else {
          console.log('✅ Simple status update to bounced worked!');
          
          // Revert the test change
          await supabase
            .from('scheduled_emails')
            .update({ status: 'sent' })
            .eq('id', testEmailId);
          console.log('🔄 Reverted test change');
        }
      }
    } else {
      console.log('✅ Bounce status update successful!');
      
      // Revert the test change
      await supabase
        .from('scheduled_emails')
        .update({ status: 'sent' })
        .eq('id', testEmailId);
      console.log('🔄 Reverted test change');
    }
    
  } catch (error) {
    console.error('❌ Error in testBounceUpdate:', error);
  }
}

async function runTests() {
  console.log('🚀 Testing bounce detection system compatibility...');
  
  await createBounceTable();
  await testBounceUpdate();
  
  console.log('');
  console.log('📝 Summary:');
  console.log('1. BounceTrackingService has been updated to handle missing message_id_header');
  console.log('2. If bounce table creation fails, the system will try to update scheduled_emails status');
  console.log('3. Run bounce detection again to see if it works now');
  console.log('');
  console.log('✅ Compatibility tests complete');
}

runTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Tests failed:', error);
  process.exit(1);
});