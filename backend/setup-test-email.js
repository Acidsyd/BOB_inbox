require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Encryption key
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'your-32-char-encryption-key-here';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function setupTestEmail() {
  try {
    console.log('🔧 Setting up test email account...');
    
    const organizationId = '550e8400-e29b-41d4-a716-446655440000';
    const accountId = '27ac5002-f9f7-477b-b37b-ee530258892d'; // gianpiero.difelice@gmail.com
    
    // Create credentials with placeholder
    const credentials = {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'gianpiero.difelice@gmail.com',
        pass: 'YOUR_16_CHAR_APP_PASSWORD_HERE' // Replace this with your actual app password
      }
    };

    // Encrypt credentials  
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Update database
    const { error } = await supabase
      .from('email_accounts')
      .update({ 
        credentials: encryptedCredentials,
        provider: 'gmail'
      })
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('❌ Failed to update:', error);
      return;
    }

    console.log('✅ Test email account setup complete!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Go to https://myaccount.google.com/security');
    console.log('2. Enable 2-Factor Authentication');
    console.log('3. Go to Security > App Passwords');
    console.log('4. Generate new app password for "Mail"');
    console.log('5. Copy the 16-character password');
    console.log('6. Run this script again and replace YOUR_16_CHAR_APP_PASSWORD_HERE');
    console.log('\n🧪 Once done, test emails will work from the campaign page!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check if user provided app password as argument
const appPassword = process.argv[2];
if (appPassword && appPassword.length === 16) {
  console.log('🔑 Using provided app password...');
  // Update the credentials with the actual password
  setupTestEmailWithPassword(appPassword);
} else {
  setupTestEmail();
}

async function setupTestEmailWithPassword(password) {
  try {
    const organizationId = '550e8400-e29b-41d4-a716-446655440000';
    const accountId = '27ac5002-f9f7-477b-b37b-ee530258892d';
    
    const credentials = {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'gianpiero.difelice@gmail.com',
        pass: password
      }
    };

    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    const { error } = await supabase
      .from('email_accounts')
      .update({ 
        credentials: encryptedCredentials,
        provider: 'gmail'
      })
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('❌ Failed to update:', error);
      return;
    }

    console.log('🎉 SUCCESS! Real email credentials installed!');
    console.log('✅ You can now send actual test emails!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}