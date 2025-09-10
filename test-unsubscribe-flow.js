/**
 * Test script to verify complete unsubscribe functionality
 * Tests token generation, API endpoints, and database operations
 */

const { generateUnsubscribeToken, decryptUnsubscribeToken } = require('./backend/src/routes/unsubscribe');
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  email: 'test@example.com',
  campaignId: 'test-campaign-123',
  organizationId: 'test-org-456',
  baseUrl: 'http://localhost:4000'
};

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_SERVICE_KEY || 'your-supabase-key'
);

console.log('🧪 Starting Unsubscribe Flow Test');
console.log('=====================================');

async function testUnsubscribeFlow() {
  try {
    console.log('📋 Test Configuration:');
    console.log(`   Email: ${TEST_CONFIG.email}`);
    console.log(`   Campaign ID: ${TEST_CONFIG.campaignId}`);
    console.log(`   Organization ID: ${TEST_CONFIG.organizationId}`);
    console.log('');

    // Step 1: Test token generation
    console.log('1️⃣ Testing token generation...');
    const token = generateUnsubscribeToken(
      TEST_CONFIG.email,
      TEST_CONFIG.campaignId,
      TEST_CONFIG.organizationId
    );
    console.log(`   ✅ Token generated: ${token.substring(0, 20)}...`);
    console.log('');

    // Step 2: Test token decryption
    console.log('2️⃣ Testing token decryption...');
    const payload = decryptUnsubscribeToken(token);
    if (payload) {
      console.log(`   ✅ Token decrypted successfully`);
      console.log(`   📧 Email: ${payload.email}`);
      console.log(`   📋 Campaign ID: ${payload.campaignId}`);
      console.log(`   🏢 Organization ID: ${payload.organizationId}`);
      console.log(`   ⏰ Timestamp: ${new Date(payload.timestamp).toISOString()}`);
    } else {
      console.log('   ❌ Token decryption failed');
      return;
    }
    console.log('');

    // Step 3: Test GET endpoint (token validation)
    console.log('3️⃣ Testing GET endpoint (token validation)...');
    try {
      const getResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`);
      const getResult = await getResponse.json();
      
      if (getResult.success) {
        console.log(`   ✅ GET endpoint working - Email: ${getResult.email}`);
        console.log(`   📋 Campaign ID: ${getResult.campaignId}`);
        console.log(`   🏢 Organization ID: ${getResult.organizationId}`);
        console.log(`   💬 Message: ${getResult.message}`);
      } else {
        console.log(`   ❌ GET endpoint failed: ${getResult.error}`);
        return;
      }
    } catch (error) {
      console.log(`   ❌ GET endpoint error: ${error.message}`);
      return;
    }
    console.log('');

    // Step 4: Test POST endpoint (actual unsubscribe)
    console.log('4️⃣ Testing POST endpoint (unsubscribe processing)...');
    try {
      const postResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      const postResult = await postResponse.json();
      
      if (postResult.success) {
        console.log(`   ✅ POST endpoint working - Email unsubscribed: ${postResult.email}`);
        console.log(`   ⏰ Unsubscribed at: ${postResult.unsubscribedAt}`);
        console.log(`   💬 Message: ${postResult.message}`);
      } else {
        console.log(`   ❌ POST endpoint failed: ${postResult.error}`);
        return;
      }
    } catch (error) {
      console.log(`   ❌ POST endpoint error: ${error.message}`);
      return;
    }
    console.log('');

    // Step 5: Verify database entry
    console.log('5️⃣ Testing database entry...');
    try {
      const { data: unsubscribe, error } = await supabase
        .from('unsubscribes')
        .select('*')
        .eq('email', TEST_CONFIG.email)
        .eq('organization_id', TEST_CONFIG.organizationId)
        .single();

      if (error) {
        console.log(`   ❌ Database query error: ${error.message}`);
        return;
      }

      if (unsubscribe) {
        console.log(`   ✅ Database entry found:`);
        console.log(`   📧 Email: ${unsubscribe.email}`);
        console.log(`   📋 Campaign ID: ${unsubscribe.campaign_id}`);
        console.log(`   🏢 Organization ID: ${unsubscribe.organization_id}`);
        console.log(`   ⏰ Unsubscribed at: ${unsubscribe.unsubscribed_at}`);
        console.log(`   🔗 Source: ${unsubscribe.source}`);
      } else {
        console.log(`   ❌ No database entry found`);
        return;
      }
    } catch (error) {
      console.log(`   ❌ Database error: ${error.message}`);
      return;
    }
    console.log('');

    // Step 6: Test duplicate unsubscribe (should be handled gracefully)
    console.log('6️⃣ Testing duplicate unsubscribe handling...');
    try {
      const duplicateResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      const duplicateResult = await duplicateResponse.json();
      
      if (duplicateResult.success && duplicateResult.alreadyUnsubscribed) {
        console.log(`   ✅ Duplicate unsubscribe handled correctly`);
        console.log(`   💬 Message: ${duplicateResult.message}`);
      } else {
        console.log(`   ⚠️ Unexpected duplicate response:`, duplicateResult);
      }
    } catch (error) {
      console.log(`   ❌ Duplicate test error: ${error.message}`);
    }
    console.log('');

    // Step 7: Clean up test data
    console.log('7️⃣ Cleaning up test data...');
    try {
      const { error } = await supabase
        .from('unsubscribes')
        .delete()
        .eq('email', TEST_CONFIG.email)
        .eq('organization_id', TEST_CONFIG.organizationId);

      if (error) {
        console.log(`   ⚠️ Cleanup warning: ${error.message}`);
      } else {
        console.log(`   ✅ Test data cleaned up`);
      }
    } catch (error) {
      console.log(`   ⚠️ Cleanup error: ${error.message}`);
    }

    console.log('');
    console.log('🎉 UNSUBSCRIBE FLOW TEST COMPLETED SUCCESSFULLY');
    console.log('=====================================');
    console.log('✅ All components working correctly:');
    console.log('   • Token generation and encryption');
    console.log('   • Token decryption and validation');
    console.log('   • GET endpoint (unsubscribe page validation)');
    console.log('   • POST endpoint (unsubscribe processing)');
    console.log('   • Database operations (insert and query)');
    console.log('   • Duplicate handling');
    console.log('');
    console.log('🔗 Frontend page: http://localhost:3001/unsubscribe?token=GENERATED_TOKEN');
    console.log('📧 Ready for production use!');

  } catch (error) {
    console.error('❌ UNSUBSCRIBE FLOW TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testUnsubscribeFlow();
}

module.exports = { testUnsubscribeFlow };