require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');

async function testImapContent() {
  const imapConfig = {
    host: 'imap.ionos.it',
    port: 993,
    user: 'gianpiero@gkt-group.it',
    password: 'Gianpiero1!1990',
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  };

  console.log('🔍 Testing IMAP content parsing from IONOS...\n');

  const imap = new Imap(imapConfig);

  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      console.log('✅ Connected to IMAP server\n');

      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          console.error('❌ Failed to open inbox:', err.message);
          imap.end();
          reject(err);
          return;
        }

        console.log(`📬 Inbox contains ${box.messages.total} messages\n`);

        if (box.messages.total === 0) {
          console.log('No messages to fetch');
          imap.end();
          resolve();
          return;
        }

        // Fetch the most recent 5 messages
        const fetchLimit = Math.min(5, box.messages.total);
        const fetchRange = `${Math.max(1, box.messages.total - fetchLimit + 1)}:${box.messages.total}`;

        console.log(`🔄 Fetching messages: ${fetchRange}\n`);

        const fetch = imap.seq.fetch(fetchRange, {
          bodies: ['HEADER', 'TEXT', ''],
          struct: true
        });

        let messageCount = 0;

        fetch.on('message', (msg, seqno) => {
          console.log(`\n${'='.repeat(80)}`);
          console.log(`MESSAGE #${seqno}`);
          console.log('='.repeat(80));

          let headers = {};
          let body = '';
          let fullMessage = '';

          msg.on('body', (stream, info) => {
            let buffer = '';

            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });

            stream.once('end', () => {
              if (info.which === 'HEADER') {
                console.log('\n📋 HEADERS:');
                console.log(buffer.substring(0, 500)); // First 500 chars

                // Parse headers manually
                const headerLines = buffer.split('\r\n');
                headerLines.forEach(line => {
                  const match = line.match(/^([^:]+):\s*(.+)$/);
                  if (match) {
                    headers[match[1].toLowerCase()] = match[2];
                  }
                });

                console.log('\n📌 Parsed Headers:');
                console.log('  From:', headers['from'] || 'N/A');
                console.log('  To:', headers['to'] || 'N/A');
                console.log('  Subject:', headers['subject'] || 'N/A');
                console.log('  Date:', headers['date'] || 'N/A');
                console.log('  Message-ID:', headers['message-id'] || 'N/A');

              } else if (info.which === 'TEXT') {
                body = buffer;
                console.log('\n📝 BODY (first 500 chars):');
                console.log(buffer.substring(0, 500));

              } else if (info.which === '') {
                fullMessage = buffer;
                console.log('\n📧 FULL MESSAGE (parsing with mailparser)...');

                simpleParser(buffer)
                  .then(parsed => {
                    console.log('\n✅ Parsed with mailparser:');
                    console.log('  From:', parsed.from?.text || 'N/A');
                    console.log('  To:', parsed.to?.text || 'N/A');
                    console.log('  Subject:', parsed.subject || 'N/A');
                    console.log('  Date:', parsed.date || 'N/A');
                    console.log('  Message-ID:', parsed.messageId || 'N/A');
                    console.log('  Text Body:', parsed.text?.substring(0, 200) || 'N/A');
                    console.log('  HTML Body:', parsed.html ? `${parsed.html.substring(0, 200)}...` : 'N/A');
                    console.log('  Attachments:', parsed.attachments?.length || 0);
                  })
                  .catch(parseErr => {
                    console.error('❌ Mailparser error:', parseErr.message);
                  });
              }
            });
          });

          msg.once('attributes', (attrs) => {
            console.log('\n📊 Attributes:');
            console.log('  UID:', attrs.uid);
            console.log('  Flags:', attrs.flags);
            console.log('  Date:', attrs.date);
          });

          msg.once('end', () => {
            messageCount++;
            console.log(`\n✅ Message #${seqno} processed`);
          });
        });

        fetch.once('error', (err) => {
          console.error('❌ Fetch error:', err);
          imap.end();
          reject(err);
        });

        fetch.once('end', () => {
          console.log(`\n\n${'='.repeat(80)}`);
          console.log(`✅ Finished fetching ${messageCount} messages`);
          console.log('='.repeat(80));

          setTimeout(() => {
            imap.end();
            resolve();
          }, 2000);
        });
      });
    });

    imap.once('error', (err) => {
      console.error('❌ IMAP connection error:', err);
      reject(err);
    });

    imap.once('end', () => {
      console.log('\n👋 Connection closed');
    });

    imap.connect();
  });
}

testImapContent()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
