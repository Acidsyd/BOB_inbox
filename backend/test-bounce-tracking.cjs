const BounceTrackingService = require('./src/services/BounceTrackingService');
require('dotenv').config();

async function testBounceTracking() {
  console.log('🧪 Testing BounceTrackingService...');
  
  const bounceTracker = new BounceTrackingService();
  
  // Find a test email
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  try {
    // Find an email that was sent (not failed)
    const { data: testEmails, error: findError } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, status, campaign_id, organization_id')
      .eq('status', 'sent')
      .limit(1);
      
    if (findError || !testEmails || testEmails.length === 0) {
      console.log('ℹ️ No sent emails found for testing. Creating a test scenario...');
      
      // Find ANY email for testing
      const { data: anyEmail, error: anyError } = await supabase
        .from('scheduled_emails')
        .select('id, to_email, status, campaign_id, organization_id')
        .limit(1)
        .single();
        
      if (anyError || !anyEmail) {
        console.log('❌ No emails found in database for testing');
        return;
      }
      
      testEmails[0] = anyEmail;
    }
    
    const testEmail = testEmails[0];
    console.log(`📧 Testing with email: ${testEmail.id} (${testEmail.to_email})`);
    console.log(`📊 Campaign: ${testEmail.campaign_id}, Org: ${testEmail.organization_id}`);
    
    // Create test bounce data
    const bounceData = {
      provider: 'gmail',
      bounceType: 'hard',
      bounceCode: '550',
      bounceReason: 'TEST: User not found - testing bounce tracking system',
      recipientEmail: testEmail.to_email
    };
    
    console.log('🚀 Recording test bounce...');
    
    try {
      const result = await bounceTracker.recordBounce(
        bounceData,
        testEmail.id,
        testEmail.organization_id
      );
      
      console.log('✅ Bounce recorded successfully!');
      console.log('📋 Result:', {
        bounceId: result.bounceId,
        campaignWasPaused: result.shouldPause
      });
      
      // Verify the email status was updated
      const { data: updatedEmail, error: verifyError } = await supabase
        .from('scheduled_emails')
        .select('status, bounce_type, bounce_reason')
        .eq('id', testEmail.id)
        .single();
        
      if (verifyError) {
        console.error('❌ Error verifying email update:', verifyError);
      } else {
        console.log('✅ Email status updated:', {
          status: updatedEmail.status,
          bounceType: updatedEmail.bounce_type,
          bounceReason: updatedEmail.bounce_reason?.substring(0, 50) + '...'
        });
      }
      
      // Check if bounce was recorded in email_bounces table
      const { data: bounceRecord, error: bounceError } = await supabase
        .from('email_bounces')
        .select('*')
        .eq('id', result.bounceId)
        .single();
        
      if (bounceError) {
        console.error('❌ Error fetching bounce record:', bounceError);
      } else {
        console.log('✅ Bounce record created:', {
          id: bounceRecord.id,
          bounceType: bounceRecord.bounce_type,
          provider: bounceRecord.provider,
          recipientEmail: bounceRecord.recipient_email
        });
      }
      
    } catch (bounceError) {
      console.error('❌ Bounce tracking failed:', bounceError.message);
      
      // If it's a column error, let's see what went wrong
      if (bounceError.message.includes('Could not find')) {
        console.log('⚠️ This might be a database schema issue');
      }
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

testBounceTracking().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});