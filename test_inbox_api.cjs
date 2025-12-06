require('dotenv').config({ path: './backend/.env' });
const jwt = require('jsonwebtoken');

const userId = 'd489a529-fe5a-40d5-bd9b-ec4ded63f87c';
const organizationId = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

const token = jwt.sign(
  { userId, organizationId },
  process.env.JWT_SECRET
);

console.log('JWT Token:', token);
console.log('\nTest API call:');
console.log(`curl "http://localhost:4000/api/inbox/conversations?status=active&limit=10" -H "Authorization: Bearer ${token}"`);

// Make the API call
const http = require('http');

const cacheBuster = Date.now();
const options = {
  hostname: 'localhost',
  port: 4000,
  path: `/api/inbox/folders/inbox/conversations?limit=10&_v=${cacheBuster}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

req.end();
