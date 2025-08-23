#!/usr/bin/env node

async function testOAuth2() {
  try {
    // First, login to get JWT token
    console.log('🔐 Logging in to get JWT token...');
    
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123456!'
      })
    });
    
    const loginResult = await loginResponse.json();
    
    if (!loginResponse.ok || !loginResult.token) {
      console.log('❌ Login failed:', loginResult);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log('Token:', loginResult.token.substring(0, 50) + '...');
    
    const token = loginResult.token;
    
    // Test OAuth2 initialization
    console.log('\n📧 Testing OAuth2 authentication initialization...');
    
    const oauth2Response = await fetch('http://localhost:4000/api/oauth2/auth/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        emailAddress: 'admin@demo.com'
      })
    });
    
    const oauth2Result = await oauth2Response.json();
    
    if (oauth2Response.ok && oauth2Result.success) {
      console.log('✅ OAuth2 initialization successful!');
      console.log('Authorization URL:', oauth2Result.authUrl);
      console.log('\n🔗 To complete OAuth2 setup:');
      console.log('1. Visit the authorization URL above');
      console.log('2. Grant permissions to your Google account');
      console.log('3. You\'ll be redirected back to the application');
    } else {
      console.log('❌ OAuth2 initialization failed:', oauth2Result);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testOAuth2();