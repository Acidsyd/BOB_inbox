#!/usr/bin/env node
require('dotenv').config();
const RelayProviderService = require('./src/services/RelayProviderService');

async function testSendGridValidation() {
  console.log('🧪 Testing SendGrid API Key Validation\n');

  const service = new RelayProviderService();

  const testConfig = {
    provider_type: 'sendgrid',
    api_key: process.env.SENDGRID_API_KEY || 'YOUR_SENDGRID_API_KEY',
    from_email: process.env.TEST_FROM_EMAIL || 'your-email@example.com',
    from_name: 'Test Sender'
  };

  console.log('📧 Testing with verified email:', testConfig.from_email);
  console.log('🔑 API Key:', testConfig.api_key.substring(0, 20) + '...\n');

  try {
    const result = await service.validateApiKey(
      testConfig.provider_type,
      testConfig.api_key,
      {
        from_email: testConfig.from_email,
        from_name: testConfig.from_name
      }
    );

    if (result.valid) {
      console.log('✅ SUCCESS: SendGrid API key is valid!');
      console.log('✅ Provider:', result.provider);
      console.log('\n🎉 You can now use this configuration in the UI\n');
    } else {
      console.log('❌ FAILED: API key validation failed');
      console.log('❌ Error:', result.error);
      console.log('\n⚠️  Possible issues:');
      console.log('   1. Email not verified in SendGrid');
      console.log('   2. API key lacks permissions');
      console.log('   3. API key expired or revoked\n');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSendGridValidation();
