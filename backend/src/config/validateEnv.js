/**
 * Environment Variable Validation
 * Checks for required environment variables at startup
 */

function validateEnvironmentVariables() {
  const required = {
    // Core Database
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    
    // Authentication
    JWT_SECRET: process.env.JWT_SECRET,
    EMAIL_ENCRYPTION_KEY: process.env.EMAIL_ENCRYPTION_KEY,
    
    // Server Configuration
    PORT: process.env.PORT || 4000
  };

  const optional = {
    // Google OAuth2
    GOOGLE_OAUTH2_CLIENT_ID: process.env.GOOGLE_OAUTH2_CLIENT_ID,
    GOOGLE_OAUTH2_CLIENT_SECRET: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
    GOOGLE_OAUTH2_REDIRECT_URI: process.env.GOOGLE_OAUTH2_REDIRECT_URI,
    
    // Microsoft OAuth2
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI,
    
    // SMTP
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS
  };

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  if (!optional.GOOGLE_OAUTH2_CLIENT_ID) {
    warnings.push('GOOGLE_OAUTH2_CLIENT_ID not set - Gmail OAuth2 integration will not work');
  }

  // Log configuration status
  console.log('🔧 Environment Configuration Check:');
  console.log('===================================');
  
  if (missing.length > 0) {
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these environment variables before starting the application.');
    console.error('See DIGITALOCEAN_ENV_SETUP.md for instructions.\n');
    
    // Only exit if critical variables are missing
    if (missing.includes('SUPABASE_URL') || missing.includes('SUPABASE_SERVICE_KEY')) {
      console.error('CRITICAL: Cannot start without Supabase configuration!');
      process.exit(1);
    }
  } else {
    console.log('✅ All required environment variables are set');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  console.log('\n📊 Configuration Summary:');
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Port: ${required.PORT}`);
  console.log(`   - Supabase URL: ${required.SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   - JWT Secret: ${required.JWT_SECRET ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   - Google OAuth2: ${optional.GOOGLE_OAUTH2_CLIENT_ID ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`   - SMTP: ${optional.SMTP_HOST ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log('===================================\n');

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

module.exports = validateEnvironmentVariables;