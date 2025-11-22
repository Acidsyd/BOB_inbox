require('dotenv').config();
const ImapService = require('./src/services/ImapService');

async function testImapConnection() {
  const imapConfig = {
    host: 'imap.ionos.com',
    port: 993,
    user: 'gianpiero@gkt-group.it',
    pass: 'Gianpiero1!1990',
    secure: true,
    tls: true
  };

  console.log('🔄 Testing IMAP connection to imap.ionos.com...');
  console.log('📧 Email:', imapConfig.user);
  console.log('🔌 Port:', imapConfig.port);
  console.log('🔒 Secure:', imapConfig.secure);

  const imapService = new ImapService();

  try {
    console.log('\n⏳ Attempting to fetch 1 email to test connection...\n');
    const emails = await imapService._fetchImapEmails(imapConfig, 1);

    console.log('✅ IMAP CONNECTION SUCCESSFUL!\n');
    console.log(`📬 Found ${emails.length} email(s) in inbox`);

    if (emails.length > 0) {
      console.log('\nMost recent email:');
      console.log('  From:', emails[0].from || 'N/A');
      console.log('  Subject:', emails[0].subject || 'N/A');
      console.log('  Date:', emails[0].date || 'N/A');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ IMAP CONNECTION FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testImapConnection();
