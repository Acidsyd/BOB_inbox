// IMAP Connection Debug Tool
// Usage: node test-imap-debug.js

require('dotenv').config();

const readline = require('readline');
const ImapService = require('./src/services/ImapService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testImapConnection() {
  console.log('🧪 IMAP Connection Debug Tool\n');

  try {
    // Get IMAP configuration from user
    const host = await question('IMAP Host (e.g., imap.gmail.com): ');
    const port = await question('IMAP Port (993 for SSL, 143 for non-SSL): ');
    const user = await question('Email/Username: ');
    const password = await question('Password (app-specific password if Gmail): ');
    const secureInput = await question('Use SSL/TLS? (y/n, default: y): ');

    const secure = !secureInput || secureInput.toLowerCase() === 'y';

    console.log('\n📋 Configuration Summary:');
    console.log(`Host: ${host}`);
    console.log(`Port: ${port}`);
    console.log(`User: ${user}`);
    console.log(`Password: ${password ? '***' + password.slice(-4) : '(empty)'}`);
    console.log(`SSL/TLS: ${secure}`);
    console.log(`\n🔍 Testing connection...\n`);

    // Validate required fields
    if (!host || !port || !user || !password) {
      console.error('❌ Missing required fields!');
      console.error('   Host:', host || '(empty)');
      console.error('   Port:', port || '(empty)');
      console.error('   User:', user || '(empty)');
      console.error('   Password:', password ? 'provided' : '(empty)');
      process.exit(1);
    }

    // Create IMAP config
    const imapConfig = {
      host,
      port: parseInt(port),
      user,
      pass: password,
      secure,
      tls: secure
    };

    // Test connection
    const imapService = new ImapService();

    console.log('📧 Attempting to connect and fetch 1 email...\n');
    const emails = await imapService._fetchImapEmails(imapConfig, 1);

    console.log('✅ Connection successful!');
    console.log(`📬 Found ${emails.length} email(s)`);

    if (emails.length > 0) {
      console.log('\n📨 Sample Email:');
      console.log(`   Subject: ${emails[0].subject || '(no subject)'}`);
      console.log(`   From: ${emails[0].from}`);
      console.log(`   Date: ${emails[0].date}`);
    }

    console.log('\n✅ IMAP configuration is correct and working!');
    console.log('\n💡 You can use these settings in the web interface.');

  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`Error: ${error.message}`);

    // Provide helpful suggestions based on error message
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Suggestion: Check the IMAP host address');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Suggestion: Check the port number and firewall settings');
    } else if (error.message.includes('AUTHENTICATIONFAILED') || error.message.includes('Invalid credentials')) {
      console.error('\n💡 Suggestions:');
      console.error('   - Verify your email and password are correct');
      console.error('   - For Gmail: Use an app-specific password (not your regular password)');
      console.error('   - For other providers: Check if 2FA is enabled and use an app password');
    } else if (error.message.includes('ECONNRESET')) {
      console.error('\n💡 Suggestion: Try toggling SSL/TLS settings (secure: true/false)');
    }

    console.error('\n🔍 Full error details:');
    console.error(error);
  } finally {
    rl.close();
  }
}

// Run the test
testImapConnection();
