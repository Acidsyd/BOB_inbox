#!/usr/bin/env node
require('dotenv').config();
const RelayProviderService = require('./src/services/RelayProviderService');

const service = new RelayProviderService();

async function testValidation() {
  console.log('🧪 Testing Mailgun API key validation...\n');

  const apiKey = process.env.MAILGUN_API_KEY || 'YOUR_MAILGUN_API_KEY';
  const config = {
    domain: process.env.MAILGUN_DOMAIN || 'example.com',
    region: 'eu',
    from_email: process.env.TEST_FROM_EMAIL || 'your-email@example.com'
  };

  try {
    console.log('📋 Config:', JSON.stringify(config, null, 2));
    console.log('\n🔑 API Key:', apiKey);
    console.log('\n🚀 Calling validateApiKey...\n');

    const result = await service.validateApiKey('mailgun', apiKey, config);

    console.log('✅ Validation complete!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Unhandled error in validation:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }

  process.exit(0);
}

testValidation();
