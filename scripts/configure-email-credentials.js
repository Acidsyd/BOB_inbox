import { supabase } from './backend/src/database/supabase.js';
import { createLogger } from './backend/src/utils/logger.js';
import crypto from 'crypto';
import readline from 'readline';

const logger = createLogger();

// Encryption function (same as in emailAccounts.js)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'your-32-char-encryption-key-here';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(parts.join(':'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function configureEmailCredentials() {
  try {
    logger.info('🔧 Configure Email Account Credentials for admin@demo.com');
    logger.info('');

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .single();

    // Get email accounts
    const { data: emailAccounts } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('organization_id', user.organization_id);

    logger.info('📧 Available email accounts:');
    emailAccounts.forEach((account, index) => {
      logger.info(`   ${index + 1}. ${account.email} (${account.provider})`);
    });
    logger.info('');

    const accountChoice = await askQuestion('Which account would you like to configure? (1-3): ');
    const accountIndex = parseInt(accountChoice) - 1;

    if (accountIndex < 0 || accountIndex >= emailAccounts.length) {
      logger.error('❌ Invalid choice');
      return;
    }

    const selectedAccount = emailAccounts[accountIndex];
    logger.info(`🔧 Configuring ${selectedAccount.email} (${selectedAccount.provider})`);
    logger.info('');

    let credentials = {};

    if (selectedAccount.provider === 'gmail') {
      logger.info('📧 Gmail Configuration');
      logger.info('You need either SMTP credentials OR OAuth2 credentials:');
      logger.info('');
      
      const authType = await askQuestion('Use (1) SMTP with App Password or (2) OAuth2? (1/2): ');
      
      if (authType === '1') {
        const email = await askQuestion('Gmail address: ') || selectedAccount.email;
        const appPassword = await askQuestion('App Password (16 characters): ');
        
        credentials = {
          smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: email,
            pass: appPassword
          }
        };
      } else {
        const clientId = await askQuestion('OAuth2 Client ID: ');
        const clientSecret = await askQuestion('OAuth2 Client Secret: ');
        const refreshToken = await askQuestion('Refresh Token: ');
        
        credentials = {
          oauth2: {
            type: 'OAuth2',
            user: selectedAccount.email,
            clientId: clientId,
            clientSecret: clientSecret,
            refreshToken: refreshToken
          },
          smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: selectedAccount.email,
            pass: '' // OAuth2 doesn't need password
          }
        };
      }
    } else if (selectedAccount.provider === 'outlook') {
      logger.info('📧 Outlook Configuration');
      const email = await askQuestion('Outlook address: ') || selectedAccount.email;
      const password = await askQuestion('Password or App Password: ');
      
      credentials = {
        smtp: {
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          user: email,
          pass: password
        }
      };
    } else if (selectedAccount.provider === 'smtp') {
      logger.info('📧 Custom SMTP Configuration');
      const host = await askQuestion('SMTP Host: ');
      const port = await askQuestion('SMTP Port (587): ') || '587';
      const secure = await askQuestion('Use SSL/TLS? (y/N): ');
      const user = await askQuestion('Username: ');
      const pass = await askQuestion('Password: ');
      
      credentials = {
        smtp: {
          host: host,
          port: parseInt(port),
          secure: secure.toLowerCase() === 'y',
          user: user,
          pass: pass
        }
      };
    }

    // Encrypt and save credentials
    const encryptedCredentials = encrypt(JSON.stringify(credentials));
    
    const { error } = await supabase
      .from('email_accounts')
      .update({
        credentials_encrypted: encryptedCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedAccount.id);

    if (error) {
      logger.error('❌ Failed to update credentials:', error);
      return;
    }

    logger.info('');
    logger.info('✅ Credentials updated successfully!');
    logger.info('');
    logger.info('📋 Account Summary:');
    logger.info(`   Email: ${selectedAccount.email}`);
    logger.info(`   Provider: ${selectedAccount.provider}`);
    logger.info(`   Status: ${selectedAccount.warmup_status}`);
    logger.info(`   Daily Limit: ${selectedAccount.daily_limit}`);
    logger.info('');
    logger.info('🔐 Credentials have been encrypted and stored securely.');
    logger.info('🌐 You can now use this account in n8n workflows!');
    logger.info('');
    
    const testNow = await askQuestion('Would you like to test the credentials now? (y/N): ');
    if (testNow.toLowerCase() === 'y') {
      await testEmailCredentials(selectedAccount.id, credentials);
    }

  } catch (error) {
    logger.error('❌ Configuration failed:', error);
  } finally {
    rl.close();
  }
}

async function testEmailCredentials(accountId, credentials) {
  try {
    logger.info('🧪 Testing email credentials...');
    
    // Basic validation
    if (credentials.smtp) {
      const { host, port, user, pass } = credentials.smtp;
      if (!host || !port || !user) {
        logger.error('❌ Missing required SMTP settings');
        return;
      }
      
      if (!credentials.oauth2 && !pass) {
        logger.error('❌ Missing password (required for non-OAuth2)');
        return;
      }
      
      logger.info('✅ SMTP settings look valid');
      logger.info(`   Host: ${host}:${port}`);
      logger.info(`   User: ${user}`);
      logger.info(`   Auth: ${credentials.oauth2 ? 'OAuth2' : 'Password'}`);
    }
    
    // You could add actual SMTP connection test here
    logger.info('');
    logger.info('✅ Basic validation passed!');
    logger.info('💡 For full testing, try sending a campaign through the UI.');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

// Run the configuration
logger.info('Welcome to Email Account Configuration!');
logger.info('This will help you set up real email credentials for admin@demo.com');
logger.info('');
configureEmailCredentials();