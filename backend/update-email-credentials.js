require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const readline = require('readline');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function updateEmailCredentials() {
  try {
    console.log('🔧 === EMAIL CREDENTIALS UPDATE TOOL ===\n');
    
    // Get organization ID (using the test organization from logs)
    const organizationId = '550e8400-e29b-41d4-a716-446655440000';
    
    // List available email accounts
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('id, email, provider')
      .eq('organization_id', organizationId);

    if (error || !accounts?.length) {
      console.log('❌ No email accounts found');
      return;
    }

    console.log('📧 Available email accounts:');
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.email} (${account.provider}) - ID: ${account.id}`);
    });

    // Get user input
    const accountIndex = await new Promise(resolve => {
      rl.question('\n🔍 Select account number to update: ', resolve);
    });

    const selectedAccount = accounts[parseInt(accountIndex) - 1];
    if (!selectedAccount) {
      console.log('❌ Invalid selection');
      return;
    }

    console.log(`\n✅ Selected: ${selectedAccount.email}`);
    console.log('\n📋 To send real emails, you need Gmail App Password:');
    console.log('   1. Go to Google Account settings');
    console.log('   2. Security > 2-Factor Authentication');
    console.log('   3. App Passwords > Generate for "Mail"');
    console.log('   4. Copy the 16-character password\n');

    const appPassword = await new Promise(resolve => {
      rl.question('🔑 Enter Gmail App Password (16 chars): ', resolve);
    });

    if (appPassword.length !== 16) {
      console.log('❌ Invalid app password length. Should be 16 characters.');
      return;
    }

    // Create credentials object
    const credentials = {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: selectedAccount.email,
        pass: appPassword
      }
    };

    // Encrypt credentials
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Update database
    const { error: updateError } = await supabase
      .from('email_accounts')
      .update({ 
        credentials: encryptedCredentials,
        provider: 'gmail'
      })
      .eq('id', selectedAccount.id)
      .eq('organization_id', organizationId);

    if (updateError) {
      console.error('❌ Failed to update credentials:', updateError);
      return;
    }

    console.log(`\n🎉 SUCCESS! Email account "${selectedAccount.email}" updated with real SMTP credentials!`);
    console.log('✅ You can now send real test emails from the campaign page.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

updateEmailCredentials();