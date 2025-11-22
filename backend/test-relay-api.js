#!/usr/bin/env node
require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: '0b0a42b3-4aa2-4df6-8cc9-eceda3efd37c',
    organizationId: 'e0007877-cbc8-43ef-b306-31b99b0a5cf8'
  },
  process.env.JWT_SECRET
);

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/relay-providers',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
