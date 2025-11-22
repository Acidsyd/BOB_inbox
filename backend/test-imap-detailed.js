require('dotenv').config();
const Imap = require('imap');

async function testImapConnection() {
  console.log('🔍 Testing multiple IMAP configurations for IONOS...\n');

  const configs = [
    {
      name: 'IONOS .com with SSL',
      host: 'imap.ionos.com',
      port: 993,
      user: 'gianpiero@gkt-group.it',
      password: 'Gianpiero1!1990',
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    },
    {
      name: 'IONOS .it with SSL',
      host: 'imap.ionos.it',
      port: 993,
      user: 'gianpiero@gkt-group.it',
      password: 'Gianpiero1!1990',
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    },
    {
      name: '1and1 (legacy) with SSL',
      host: 'imap.1and1.com',
      port: 993,
      user: 'gianpiero@gkt-group.it',
      password: 'Gianpiero1!1990',
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    },
    {
      name: 'IONOS .com without TLS',
      host: 'imap.ionos.com',
      port: 143,
      user: 'gianpiero@gkt-group.it',
      password: 'Gianpiero1!1990',
      tls: false
    }
  ];

  for (const config of configs) {
    console.log(`\n📡 Testing: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   User: ${config.user}`);
    console.log(`   TLS: ${config.tls}`);

    try {
      await testSingleConfig(config);
      console.log(`✅ SUCCESS with ${config.name}!`);
      process.exit(0);
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  console.log('\n❌ All configurations failed!');
  console.log('\n💡 Possible issues:');
  console.log('   1. Password might be incorrect');
  console.log('   2. IMAP access might not be enabled in IONOS settings');
  console.log('   3. Account might require app-specific password');
  console.log('   4. Two-factor authentication might be blocking access');
  console.log('   5. Account might be locked or restricted');
  process.exit(1);
}

function testSingleConfig(config) {
  return new Promise((resolve, reject) => {
    const imap = new Imap(config);

    const timeout = setTimeout(() => {
      imap.end();
      reject(new Error('Connection timeout after 10 seconds'));
    }, 10000);

    imap.once('ready', () => {
      clearTimeout(timeout);
      console.log('   🔓 Authentication successful!');

      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          imap.end();
          reject(err);
        } else {
          console.log(`   📬 Inbox contains ${box.messages.total} messages`);
          imap.end();
          resolve();
        }
      });
    });

    imap.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    imap.connect();
  });
}

testImapConnection();
