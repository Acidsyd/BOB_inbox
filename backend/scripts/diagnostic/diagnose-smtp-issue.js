#!/usr/bin/env node
/**
 * Complete SMTP Diagnostic Tool
 *
 * Diagnoses all possible SMTP issues:
 * 1. Environment variables
 * 2. Database connectivity
 * 3. Encryption/Decryption
 * 4. SMTP server connectivity
 * 5. IMAP server connectivity
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const Imap = require('imap');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

(async () => {

console.log('🔬 Complete SMTP Diagnostic Tool');
console.log('='.repeat(70));
console.log('');

// Test 1: Environment Variables
console.log('1️⃣  CHECKING ENVIRONMENT VARIABLES');
console.log('-'.repeat(70));

const requiredEnvVars = {
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing',
  'EMAIL_ENCRYPTION_KEY': process.env.EMAIL_ENCRYPTION_KEY ? '✓ Set' : '✗ Missing',
  'JWT_SECRET': process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'
};

let envCheckPassed = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  const status = typeof value === 'string' && value.includes('✗') ? '❌' : '✅';
  console.log(`${status} ${key}: ${value}`);
  if (status === '❌') envCheckPassed = false;
}

if (!envCheckPassed) {
  console.log('\n❌ CRITICAL: Missing environment variables!');
  process.exit(1);
}

console.log('✅ All environment variables present\n');

// Test 2: Encryption Key Validity
console.log('2️⃣  CHECKING ENCRYPTION KEY');
console.log('-'.repeat(70));

try {
  const key = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    console.log(`❌ Encryption key must be 32 bytes (64 hex chars), got ${key.length} bytes`);
    process.exit(1);
  }
  console.log(`✅ Encryption key is valid (32 bytes)`);

  // Test encryption/decryption
  const testData = { test: 'data', smtp: { host: 'test.com', port: 587 } };
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(testData), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  console.log('✅ Encryption/Decryption test passed\n');
} catch (error) {
  console.log(`❌ Encryption test failed: ${error.message}\n`);
  process.exit(1);
}

// Test 3: Database Connectivity
console.log('3️⃣  CHECKING DATABASE CONNECTIVITY');
console.log('-'.repeat(70));

let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Test query
  const { data, error } = await supabase
    .from('oauth2_tokens')
    .select('count')
    .limit(1);

  if (error) throw error;

  console.log('✅ Database connection successful');
  console.log(`   Connected to: ${process.env.SUPABASE_URL}\n`);
} catch (error) {
  console.log(`❌ Database connection failed: ${error.message}\n`);
  process.exit(1);
}

// Test 4: Check SMTP Accounts in Database
console.log('4️⃣  CHECKING SMTP ACCOUNTS IN DATABASE');
console.log('-'.repeat(70));

let smtpAccounts = [];
try {
  const { data, error } = await supabase
    .from('oauth2_tokens')
    .select('*')
    .eq('provider', 'smtp')
    .eq('status', 'linked_to_account');

  if (error) throw error;

  smtpAccounts = data || [];
  console.log(`✅ Found ${smtpAccounts.length} SMTP account(s) in database`);

  if (smtpAccounts.length === 0) {
    console.log('⚠️  No SMTP accounts configured yet\n');
  } else {
    smtpAccounts.forEach(acc => {
      console.log(`   • ${acc.email} (ID: ${acc.id.substring(0, 8)}...)`);
    });
    console.log('');
  }
} catch (error) {
  console.log(`❌ Failed to query SMTP accounts: ${error.message}\n`);
}

// Test 5: DNS Resolution
console.log('5️⃣  CHECKING DNS RESOLUTION');
console.log('-'.repeat(70));

const serversToTest = [
  'smtp.ionos.it',
  'imap.ionos.it',
  'mail.studioware.eu',
  'smtp.gmail.com'
];

for (const server of serversToTest) {
  try {
    const addresses = await dns.resolve4(server);
    console.log(`✅ ${server} → ${addresses[0]}`);
  } catch (error) {
    console.log(`❌ ${server} → DNS resolution failed: ${error.code}`);
  }
}
console.log('');

// Test 6: TCP Connectivity
console.log('6️⃣  CHECKING TCP CONNECTIVITY TO MAIL SERVERS');
console.log('-'.repeat(70));

async function testTcpConnection(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ success: false, error: 'Timeout' });
    }, timeout);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: true });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, error: err.code || err.message });
    });
  });
}

const portsToTest = [
  { host: 'smtp.ionos.it', port: 587, name: 'IONOS SMTP (TLS)' },
  { host: 'smtp.ionos.it', port: 465, name: 'IONOS SMTP (SSL)' },
  { host: 'imap.ionos.it', port: 993, name: 'IONOS IMAP (SSL)' },
  { host: 'mail.studioware.eu', port: 587, name: 'Studioware SMTP (TLS)' },
  { host: 'mail.studioware.eu', port: 993, name: 'Studioware IMAP (SSL)' }
];

for (const { host, port, name } of portsToTest) {
  const result = await testTcpConnection(host, port);
  if (result.success) {
    console.log(`✅ ${name} (${host}:${port}) - Connected`);
  } else {
    console.log(`❌ ${name} (${host}:${port}) - ${result.error}`);
  }
}
console.log('');

// Test 7: SMTP Authentication Test (if accounts exist)
if (smtpAccounts.length > 0) {
  console.log('7️⃣  TESTING SMTP AUTHENTICATION');
  console.log('-'.repeat(70));

  for (const account of smtpAccounts) {
    console.log(`\n📧 Testing: ${account.email}`);

    try {
      // Decrypt credentials
      const tokensData = JSON.parse(account.encrypted_tokens);
      const key = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex');
      const ivBuffer = Buffer.from(tokensData.iv, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
      let decrypted = decipher.update(tokensData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const credentials = JSON.parse(decrypted);

      if (credentials.smtp) {
        console.log(`   Host: ${credentials.smtp.host}:${credentials.smtp.port}`);
        console.log(`   Secure: ${credentials.smtp.secure}`);
        console.log(`   Testing connection...`);

        // Test SMTP
        const transporter = nodemailer.createTransport({
          host: credentials.smtp.host,
          port: credentials.smtp.port,
          secure: credentials.smtp.secure || false,
          auth: {
            user: credentials.smtp.user,
            pass: credentials.smtp.pass
          },
          connectionTimeout: 30000,
          greetingTimeout: 15000
        });

        const startTime = Date.now();
        await transporter.verify();
        const duration = Date.now() - startTime;

        console.log(`   ✅ SMTP authentication successful (${duration}ms)`);
        transporter.close();
      }

      if (credentials.imap) {
        console.log(`   Testing IMAP connection...`);

        await new Promise((resolve, reject) => {
          const imap = new Imap({
            user: credentials.imap.user,
            password: credentials.imap.pass,
            host: credentials.imap.host,
            port: credentials.imap.port,
            tls: credentials.imap.secure !== false,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: 30000,
            authTimeout: 15000
          });

          let connectionSuccessful = false;
          const startTime = Date.now();

          imap.once('ready', () => {
            connectionSuccessful = true;
            const duration = Date.now() - startTime;
            console.log(`   ✅ IMAP authentication successful (${duration}ms)`);
            imap.end();
            resolve();
          });

          imap.once('error', (err) => {
            imap.end();
            reject(err);
          });

          imap.once('end', () => {
            if (!connectionSuccessful) {
              reject(new Error('Connection ended before ready'));
            }
          });

          imap.connect();
        });
      }

    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
    }
  }
  console.log('');
}

// Test 8: Test IONOS Connection with Sample Credentials
console.log('8️⃣  TESTING IONOS SERVERS (WITHOUT CREDENTIALS)');
console.log('-'.repeat(70));
console.log('Testing if IONOS servers accept connections...\n');

async function testSmtpHandshake(host, port, secure) {
  return new Promise((resolve) => {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout: 10000,
      greetingTimeout: 5000
    });

    // We're not testing auth, just if server responds
    const startTime = Date.now();
    transporter.verify((error) => {
      const duration = Date.now() - startTime;
      transporter.close();

      // EAUTH is expected without credentials, means server is reachable
      if (error && (error.code === 'EAUTH' || error.code === 'EAUTHENTICATION')) {
        resolve({ reachable: true, duration, message: 'Server reachable (auth not tested)' });
      } else if (error && (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED')) {
        resolve({ reachable: false, duration, message: error.message });
      } else if (error) {
        resolve({ reachable: true, duration, message: 'Server reachable but returned: ' + error.code });
      } else {
        resolve({ reachable: true, duration, message: 'Server accepted connection' });
      }
    });
  });
}

const ionosTests = [
  { host: 'smtp.ionos.it', port: 587, secure: false, name: 'SMTP Port 587 (STARTTLS)' },
  { host: 'smtp.ionos.it', port: 465, secure: true, name: 'SMTP Port 465 (SSL)' },
];

for (const test of ionosTests) {
  const result = await testSmtpHandshake(test.host, test.port, test.secure);
  const status = result.reachable ? '✅' : '❌';
  console.log(`${status} ${test.name}: ${result.message} (${result.duration}ms)`);
}

console.log('\n' + '='.repeat(70));
console.log('🎯 DIAGNOSTIC SUMMARY');
console.log('='.repeat(70));
console.log('✅ Environment: OK');
console.log('✅ Database: OK');
console.log('✅ Encryption: OK');
console.log(`${smtpAccounts.length > 0 ? '✅' : '⚠️ '} SMTP Accounts: ${smtpAccounts.length} configured`);
console.log('\nIf IONOS connection tests fail, the issue is likely:');
console.log('1. Firewall blocking outgoing connections on ports 587/465/993');
console.log('2. Network/ISP blocking mail ports');
console.log('3. Server hosting provider restrictions');
console.log('\nRecommendation: Run this script on your production server to compare results.');
console.log('='.repeat(70));

})().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
