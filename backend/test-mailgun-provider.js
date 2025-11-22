#!/usr/bin/env node
require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign(
  {
    userId: '0b0a42b3-4aa2-4df6-8cc9-eceda3efd37c',
    organizationId: 'e0007877-cbc8-43ef-b306-31b99b0a5cf8'
  },
  process.env.JWT_SECRET
);

const payload = JSON.stringify({
  provider_type: 'mailgun',
  provider_name: 'Test Provider',
  api_key: process.env.MAILGUN_API_KEY || 'YOUR_MAILGUN_API_KEY',
  config: { domain: process.env.MAILGUN_DOMAIN || 'example.com', region: 'eu' },
  daily_limit: 20,
  from_email: process.env.TEST_FROM_EMAIL || 'your-email@example.com',
  from_name: 'Test Sender'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/relay-providers',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('📤 Sending POST request to /api/relay-providers');
console.log('Payload:', JSON.parse(payload));

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📥 Response received:');
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    try {
      console.log('Body:', JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log('Body (raw):', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(payload);
req.end();
