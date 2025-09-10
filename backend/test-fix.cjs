require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const campaignId = '82ebcf15-7a68-4091-bbf8-3e599c91ed3f';
const organizationId = '550e8400-e29b-41d4-a716-446655440000';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Mock JWT token for API calls (matches the one from logs)
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJvcmdhbml6YXRpb25JZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1NjgxNzg3OCwiZXhwIjoxNzU2OTA0Mjc4fQ.dummy';

async function testRaceConditionFix() {
  console.log('🧪 Testing race condition fix...');
  
  // Step 1: Check current status
  console.log('\n📊 STEP 1: Current campaign status');
  const { data: beforeEmails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at');
    
  console.log(`Before test: ${beforeEmails.length} total scheduled emails`);
  
  const statusCounts = {};
  beforeEmails.forEach(email => {
    if (!statusCounts[email.status]) statusCounts[email.status] = 0;
    statusCounts[email.status]++;
  });
  
  console.log('Status breakdown:', statusCounts);
  
  // Step 2: Check if any are currently 'scheduled' (would be cancelled by restart)
  const scheduledEmails = beforeEmails.filter(e => e.status === 'scheduled');
  console.log(`📧 Currently scheduled emails: ${scheduledEmails.length}`);
  
  if (scheduledEmails.length === 0) {
    console.log('⚠️ No scheduled emails to test restart with - all emails are sent/skipped');
    return;
  }
  
  // Step 3: Test the restart API call
  console.log('\n🚀 STEP 2: Testing campaign restart with race condition protection');
  try {
    const response = await axios.post(
      `http://localhost:4000/api/campaigns/${campaignId}/start`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Restart request successful:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✅ Race condition protection worked! Got 409:', error.response.data.code);
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.response?.data || error.message);
    }
  }
  
  // Step 4: Check status after restart attempt
  console.log('\n📊 STEP 3: Status after restart attempt');
  const { data: afterEmails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at');
    
  console.log(`After test: ${afterEmails.length} total scheduled emails`);
  
  const newStatusCounts = {};
  afterEmails.forEach(email => {
    if (!newStatusCounts[email.status]) newStatusCounts[email.status] = 0;
    newStatusCounts[email.status]++;
  });
  
  console.log('Status breakdown:', newStatusCounts);
  
  // Step 5: Analyze changes
  const newEmails = afterEmails.filter(email => 
    !beforeEmails.some(before => before.id === email.id)
  );
  
  if (newEmails.length === 0) {
    console.log('✅ SUCCESS: No new duplicate emails created!');
  } else {
    console.log(`❌ FAILURE: ${newEmails.length} new emails created`);
    console.log('New emails:', newEmails.slice(0, 3).map(e => `${e.to_email} (${e.status})`));
  }
  
  console.log('\n✅ Test completed');
}

testRaceConditionFix().catch(console.error);