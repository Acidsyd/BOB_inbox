const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStatusConstraint() {
  console.log('🔍 Checking scheduled_emails status constraint...');
  
  try {
    // Get table constraints info from PostgreSQL system tables
    const { data, error } = await supabase
      .from('scheduled_emails')
      .select('status')
      .limit(10);
    
    if (error) {
      console.error('❌ Error accessing scheduled_emails:', error);
      return;
    }
    
    console.log('📋 Current status values in use:');
    const statusValues = [...new Set(data.map(row => row.status))];
    statusValues.forEach(status => console.log(`  - ${status}`));
    
    // Try different status values to see which ones work
    console.log('\n🧪 Testing different status values...');
    
    const testStatuses = ['scheduled', 'sent', 'failed', 'bounced', 'skipped', 'cancelled'];
    
    // Get a test email ID
    const testEmail = data[0];
    if (!testEmail) {
      console.log('❌ No emails found for testing');
      return;
    }
    
    // Find an email ID to test with
    const { data: emailForTest, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('id, status')
      .limit(1)
      .single();
      
    if (emailError || !emailForTest) {
      console.log('❌ Could not find email for testing:', emailError);
      return;
    }
    
    const originalStatus = emailForTest.status;
    const testEmailId = emailForTest.id;
    
    console.log(`📧 Testing with email ${testEmailId} (current status: ${originalStatus})`);
    
    for (const status of testStatuses) {
      try {
        const { error: updateError } = await supabase
          .from('scheduled_emails')
          .update({ status: status })
          .eq('id', testEmailId);
          
        if (updateError) {
          console.log(`❌ Status '${status}' NOT allowed: ${updateError.message.split('.')[0]}`);
        } else {
          console.log(`✅ Status '${status}' is allowed`);
        }
      } catch (testError) {
        console.log(`❌ Status '${status}' failed: ${testError.message}`);
      }
    }
    
    // Restore original status
    await supabase
      .from('scheduled_emails')
      .update({ status: originalStatus })
      .eq('id', testEmailId);
    console.log(`🔄 Restored original status: ${originalStatus}`);
    
  } catch (error) {
    console.error('❌ Error in checkStatusConstraint:', error);
  }
}

checkStatusConstraint().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});