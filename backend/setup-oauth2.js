require('dotenv').config();
const OAuth2Service = require('./src/services/OAuth2Service');

/**
 * OAuth2 Setup and Testing Script
 * Based on the comprehensive OAuth2 setup guide
 */

async function setupOAuth2() {
  console.log('🔧 === OAuth2 SETUP AND TEST ===\n');
  
  try {
    // Initialize OAuth2Service
    const oauth2Service = new OAuth2Service();
    
    // Check environment configuration
    console.log('📋 Environment Check:');
    console.log('✅ Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : '❌ Missing');
    console.log('✅ Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : '❌ Missing');
    console.log('✅ Project ID:', process.env.GOOGLE_PROJECT_ID ? 'Set' : '❌ Missing');
    console.log('✅ Redirect URI:', process.env.GOOGLE_REDIRECT_URI || 'Using default');
    console.log('✅ Supabase URL:', process.env.SUPABASE_URL ? 'Set' : '❌ Missing');
    console.log('✅ Supabase Service Key:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : '❌ Missing');
    console.log('');

    // Check if required environment variables are set
    const requiredVars = ['GOOGLE_CLIENT_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.log(`   - ${varName}`));
      console.log('\n📋 Please set these in your .env file');
      console.log('📖 See .env.oauth2.example for reference');
      return;
    }

    // Generate authorization URL
    console.log('🔗 Generating OAuth2 authorization URL...');
    const authUrl = oauth2Service.getAuthorizationUrl('test-state');
    console.log('✅ Authorization URL generated successfully');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Visit this URL to authorize the application:');
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('2. After authorization, you\'ll get a code parameter');
    console.log('3. Use that code to complete the OAuth2 setup');
    console.log('');
    console.log('📧 To set up for a specific email account:');
    console.log('   node setup-oauth2.js --email user@yourdomain.com --code AUTH_CODE');
    console.log('');

  } catch (error) {
    console.error('❌ OAuth2 setup failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

// Handle command line arguments for completing OAuth2 flow
async function completeOAuth2(email, code, organizationId = '550e8400-e29b-41d4-a716-446655440000') {
  try {
    console.log('🔄 Completing OAuth2 flow...');
    console.log('📧 Email:', email);
    console.log('🔑 Code:', code.substring(0, 20) + '...');
    console.log('🏢 Organization ID:', organizationId);
    console.log('');

    const oauth2Service = new OAuth2Service();
    
    // Exchange code for tokens
    const tokens = await oauth2Service.exchangeCodeForTokens(code);
    
    // Store tokens in database
    await oauth2Service.storeTokens(email, organizationId, tokens);
    
    // Test the connection
    const testResult = await oauth2Service.testConnection(email, organizationId);
    
    if (testResult.success) {
      console.log('🎉 OAuth2 setup completed successfully!');
      console.log('✅ Gmail API connection working');
      console.log('📧 Authenticated as:', testResult.emailAddress);
      console.log('📬 Total messages:', testResult.messagesTotal);
      console.log('');
      console.log('🧪 You can now test email sending from the campaign page!');
    } else {
      console.log('❌ OAuth2 setup completed but connection test failed');
      console.log('🔍 Error:', testResult.error);
    }

  } catch (error) {
    console.error('❌ OAuth2 completion failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const codeIndex = args.indexOf('--code');

if (emailIndex !== -1 && codeIndex !== -1 && emailIndex + 1 < args.length && codeIndex + 1 < args.length) {
  const email = args[emailIndex + 1];
  const code = args[codeIndex + 1];
  completeOAuth2(email, code);
} else {
  setupOAuth2();
}