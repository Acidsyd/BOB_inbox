const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * IMAP Service for fetching emails from SMTP/IMAP accounts
 * Provides same functionality as OAuth2Service but uses IMAP protocol
 */
class ImapService {
  constructor() {
    this.name = 'ImapService';
  }

  /**
   * Decrypt IMAP credentials
   */
  decryptCredentials(encryptedData, iv) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Fetch emails from IMAP account
   * @param {Object} account - Email account from database
   * @param {Number} limit - Maximum number of emails to fetch
   * @returns {Promise<Array>} - Array of parsed emails
   */
  async fetchEmails(account, limit = 50) {
    try {
      // Decrypt credentials
      const credentials = this.decryptCredentials(
        account.credentials.encrypted,
        account.credentials.iv
      );

      if (!credentials.imap) {
        throw new Error('IMAP credentials not found');
      }

      const imapConfig = credentials.imap;

      console.log(`📥 Fetching emails for ${account.email} via IMAP`);

      // Fetch emails using IMAP
      const emails = await this._fetchImapEmails(imapConfig, limit);

      console.log(`✅ Fetched ${emails.length} emails for ${account.email}`);

      return emails;

    } catch (error) {
      console.error(`❌ Error fetching IMAP emails for ${account.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch emails from IMAP server
   * @private
   */
  async _fetchImapEmails(imapConfig, limit) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: imapConfig.user,
        password: imapConfig.pass,
        host: imapConfig.host,
        port: imapConfig.port,
        tls: imapConfig.secure !== false,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 15000,
        authTimeout: 10000
      });

      const emails = [];

      imap.once('ready', () => {
        // Open inbox
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Search for recent emails
          const searchCriteria = ['ALL'];
          const fetchOptions = {
            bodies: '',
            struct: true,
            markSeen: false
          };

          imap.search(searchCriteria, (searchErr, results) => {
            if (searchErr) {
              imap.end();
              return reject(searchErr);
            }

            if (!results || results.length === 0) {
              imap.end();
              return resolve([]);
            }

            // Limit results
            const messagesToFetch = results.slice(-limit);

            const fetch = imap.fetch(messagesToFetch, fetchOptions);

            fetch.on('message', (msg, seqno) => {
              let buffer = '';
              let attributes = null;

              msg.on('body', (stream, info) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
              });

              msg.once('attributes', (attrs) => {
                attributes = attrs;
              });

              msg.once('end', () => {
                // Parse email
                simpleParser(buffer)
                  .then((parsed) => {
                    emails.push({
                      uid: attributes.uid,
                      date: parsed.date || new Date(),
                      from: parsed.from ? parsed.from.text : '',
                      to: parsed.to ? parsed.to.text : '',
                      subject: parsed.subject || '(no subject)',
                      text: parsed.text || '',
                      html: parsed.html || '',
                      messageId: parsed.messageId || `<${attributes.uid}@imap>`,
                      inReplyTo: parsed.inReplyTo || null,
                      references: parsed.references || [],
                      attachments: parsed.attachments || []
                    });
                  })
                  .catch((parseErr) => {
                    console.error('❌ Error parsing email:', parseErr.message);
                  });
              });
            });

            fetch.once('error', (fetchErr) => {
              imap.end();
              reject(fetchErr);
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
          });
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.once('end', () => {
        console.log('📪 IMAP connection closed');
      });

      imap.connect();
    });
  }

  /**
   * Sync emails for an IMAP account
   * Similar to OAuth2Service.syncEmailsForAccount
   */
  async syncEmailsForAccount(accountId, organizationId) {
    try {
      console.log(`🔄 Starting IMAP sync for account ${accountId}`);

      // Get account details from oauth2_tokens table (SMTP accounts stored here)
      const { data: account, error: accountError } = await supabase
        .from('oauth2_tokens')
        .select('*')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .eq('provider', 'smtp')
        .eq('status', 'linked_to_account')
        .single();

      if (accountError || !account) {
        throw new Error(`Account not found: ${accountError?.message || 'Unknown error'}`);
      }

      // Parse encrypted tokens
      const tokensData = JSON.parse(account.encrypted_tokens);
      account.credentials = {
        encrypted: tokensData.encrypted,
        iv: tokensData.iv
      };

      // Fetch emails
      const emails = await this.fetchEmails(account, 50);

      if (!emails || emails.length === 0) {
        console.log(`📭 No new emails found for ${account.email}`);
        return { success: true, emailsProcessed: 0 };
      }

      // Store emails in database (similar to OAuth2Service)
      let processed = 0;
      for (const email of emails) {
        try {
          await this._storeEmail(email, account, organizationId);
          processed++;
        } catch (storeErr) {
          console.error(`❌ Error storing email: ${storeErr.message}`);
        }
      }

      console.log(`✅ IMAP sync completed for ${account.email}: ${processed}/${emails.length} emails processed`);

      return { success: true, emailsProcessed: processed };

    } catch (error) {
      console.error(`❌ IMAP sync failed for account ${accountId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store email in database
   * @private
   */
  async _storeEmail(email, account, organizationId) {
    // Check if email already exists (by Message-ID)
    const { data: existing } = await supabase
      .from('conversation_messages')
      .select('id')
      .eq('message_id_header', email.messageId)
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      // Email already stored
      return;
    }

    // Determine direction (sent or received)
    const direction = email.from.toLowerCase().includes(account.email.toLowerCase())
      ? 'sent'
      : 'received';

    // Insert email into conversation_messages
    await supabase
      .from('conversation_messages')
      .insert({
        organization_id: organizationId,
        email_account_id: account.id,
        message_id_header: email.messageId,
        in_reply_to: email.inReplyTo,
        from_email: email.from,
        to_email: email.to,
        subject: email.subject,
        body_text: email.text,
        body_html: email.html,
        sent_at: email.date,
        received_at: email.date,
        direction: direction,
        status: 'received'
      });
  }
}

module.exports = ImapService;
