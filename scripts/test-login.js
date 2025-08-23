#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLogin() {
  console.log('Testing login with different credentials...');
  
  // Get users from database
  const { data: users, error } = await supabase
    .from('users')
    .select('email, password_hash')
    .limit(5);
    
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log('Available users:');
  users.forEach(user => {
    console.log(`- ${user.email} (hash: ${user.password_hash.substring(0, 20)}...)`);
  });
  
  // Try to login via API
  const testCredentials = [
    { email: 'admin@demo.com', password: 'demo123456' },
    { email: 'admin@demo.com', password: 'password' },
    { email: 'admin@demo.com', password: 'admin123' },
    { email: 'test@example.com', password: 'password123' },
    { email: 'admin@ophir.dev', password: 'password123' }
  ];
  
  for (const creds of testCredentials) {
    try {
      console.log(`\nTrying ${creds.email} with password: ${creds.password}`);
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
      
      const result = await response.json();
      if (response.ok && result.token) {
        console.log(`✅ Login successful for ${creds.email}`);
        console.log(`Token: ${result.token.substring(0, 50)}...`);
        return result.token;
      } else {
        console.log(`❌ Login failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Login error: ${error.message}`);
    }
  }
}

testLogin();