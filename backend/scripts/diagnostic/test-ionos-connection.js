#!/usr/bin/env node
/**
 * IONOS Connection Test Script
 *
 * Tests SMTP and IMAP connectivity to IONOS servers
 * Usage: node test-ionos-connection.js your-email@domain.com your-password
 */

const nodemailer = require('nodemailer');
const Imap = require('imap');

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error('❌ Usage: node test-ionos-connection.js your-email@domain.com your-password');
  process.exit(1);
}

console.log('🧪 IONOS Connection Test');
console.log('='.repeat(50));
console.log('Email:', email);
console.log('');

// Test SMTP configurations
const smtpConfigs = [
  {
    name: 'SMTP Port 587 (STARTTLS - Recommended)',
    host: 'smtp.ionos.it',
    port: 587,
    secure: false
  },
  {
    name: 'SMTP Port 465 (SSL)',
    host: 'smtp.ionos.it',
    port: 465,
    secure: true
  }
];

// Test IMAP configurations
const imapConfigs = [
  {
    name: 'IMAP Port 993 (SSL - Recommended)',
    host: 'imap.ionos.it',
    port: 993,
    tls: true
  },
  {
    name: 'IMAP Port 143 (STARTTLS)',
    host: 'imap.ionos.it',
    port: 143,
    tls: true
  }
];

async function testSmtp(config) {
  return new Promise((resolve, reject) => {
    console.log(`\n📤 Testing: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Secure: ${config.secure}`);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: email,
        pass: password
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000
    });

    const startTime = Date.now();

    transporter.verify((error, success) => {
      const duration = Date.now() - startTime;

      if (error) {
        console.log(`   ❌ FAILED (${duration}ms)`);
        console.log(`   Error: ${error.code || 'UNKNOWN'} - ${error.message}`);
        reject(error);
      } else {
        console.log(`   ✅ SUCCESS (${duration}ms)`);
        resolve(success);
      }

      transporter.close();
    });
  });
}

async function testImap(config) {
  return new Promise((resolve, reject) => {
    console.log(`\n📥 Testing: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   TLS: ${config.tls}`);

    const imap = new Imap({
      user: email,
      password: password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 5000
    });

    let connectionSuccessful = false;
    const startTime = Date.now();

    imap.once('ready', () => {
      const duration = Date.now() - startTime;
      connectionSuccessful = true;
      console.log(`   ✅ SUCCESS (${duration}ms)`);
      imap.end();
      resolve(true);
    });

    imap.once('error', (err) => {
      const duration = Date.now() - startTime;
      console.log(`   ❌ FAILED (${duration}ms)`);
      console.log(`   Error: ${err.code || 'UNKNOWN'} - ${err.message}`);
      imap.end();
      reject(err);
    });

    imap.once('end', () => {
      if (!connectionSuccessful) {
        reject(new Error('IMAP connection ended before ready'));
      }
    });

    try {
      imap.connect();
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('\n🔧 SMTP Tests:');
  console.log('='.repeat(50));

  for (const config of smtpConfigs) {
    try {
      await testSmtp(config);
    } catch (error) {
      // Continue to next test
    }
  }

  console.log('\n\n🔧 IMAP Tests:');
  console.log('='.repeat(50));

  for (const config of imapConfigs) {
    try {
      await testImap(config);
    } catch (error) {
      // Continue to next test
    }
  }

  console.log('\n\n' + '='.repeat(50));
  console.log('✅ Test completed!');
  console.log('\nRecommended configuration:');
  console.log('  SMTP: smtp.ionos.it:587 (secure: false)');
  console.log('  IMAP: imap.ionos.it:993 (secure: true)');
  console.log('='.repeat(50));
}

runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
