const BaseSyncProvider = require('./BaseSyncProvider');
const ImapService = require('../ImapService');
const crypto = require('crypto');

/**
 * ImapSyncProvider - Email sync provider for IMAP-enabled accounts
 * Supports Mailgun and other relay accounts with IMAP receiving capability
 *
 * Use case: Hybrid accounts that send via relay API but receive via IMAP
 * - Mailgun account sends via API (professional deliverability)
 * - Same account receives via IMAP (inbox functionality)
 */
class ImapSyncProvider extends BaseSyncProvider {
  constructor(capabilities = {}) {
    super('imap', {
      bidirectional_sync: false, // IMAP is receive-only
      real_time_updates: false,
      incremental_sync: 'timestamp',
      max_batch_size: 50,
      ...capabilities
    });

    this.imapService = new ImapService();
  }

  /**
   * Initialize IMAP client with account credentials
   * @param {Object} account - Account object with IMAP configuration
   * @param {string} organizationId - Organization ID for isolation
   * @returns {Object} IMAP configuration ready for use
   */
  async initializeClient(account, organizationId) {
    try {
      this.log('Initializing IMAP client', {
        accountId: account.id,
        email: account.email,
        provider: account.provider
      });

      // Validate IMAP configuration exists
      if (!account.imap_config || !account.imap_credentials_encrypted) {
        throw new Error('IMAP configuration not found for account');
      }

      // Decrypt IMAP credentials
      const imapCredentials = this.decryptImapCredentials(
        account.imap_credentials_encrypted,
        account.imap_credentials_iv
      );

      // Merge config with decrypted credentials
      const imapConfig = {
        ...account.imap_config,
        pass: imapCredentials.password,
        user: account.imap_config.user || account.email
      };

      this.log('IMAP client initialized', {
        host: imapConfig.host,
        port: imapConfig.port,
        secure: imapConfig.secure
      });

      return imapConfig;

    } catch (error) {
      this.logError('Initialize IMAP client', error, {
        accountId: account.id,
        email: account.email
      });
      throw error;
    }
  }

  /**
   * Get incremental changes since last sync
   * @param {Object} imapConfig - IMAP configuration from initializeClient
   * @param {Date|string} lastSyncTimestamp - Last successful sync time
   * @param {Object} options - Additional sync options
   * @returns {Array} Array of email messages in normalized format
   */
  async getIncrementalChanges(imapConfig, lastSyncTimestamp, options = {}) {
    try {
      const batchSize = options.batchSize || this.getMaxBatchSize();

      this.log('Fetching incremental IMAP changes', {
        host: imapConfig.host,
        lastSync: lastSyncTimestamp,
        batchSize
      });

      // Use ImapService to fetch emails
      // Note: ImapService expects account object format
      const mockAccount = {
        email: imapConfig.user,
        credentials: {
          encrypted: null, // Not used - we provide config directly
          iv: null
        }
      };

      // Fetch emails using IMAP service
      const rawEmails = await this.imapService._fetchImapEmails(imapConfig, batchSize);

      // Normalize email format for unified inbox
      const normalizedMessages = rawEmails.map(email =>
        this.normalizeMessageData(email, imapConfig.user)
      );

      // Filter by timestamp if incremental sync
      let filteredMessages = normalizedMessages;
      if (lastSyncTimestamp) {
        const lastSyncDate = new Date(lastSyncTimestamp);
        filteredMessages = normalizedMessages.filter(msg => {
          const msgDate = new Date(msg.received_at);
          return msgDate > lastSyncDate;
        });
      }

      this.log('Incremental sync complete', {
        totalFetched: rawEmails.length,
        afterFiltering: filteredMessages.length,
        newMessages: filteredMessages.length
      });

      return filteredMessages;

    } catch (error) {
      this.logError('Get incremental changes', error, {
        host: imapConfig.host,
        lastSync: lastSyncTimestamp
      });
      throw error;
    }
  }

  /**
   * Get detailed message information
   * (Not fully implemented for IMAP - returns basic info)
   */
  async getMessageDetails(imapConfig, messageId) {
    this.log('Get message details not fully implemented for IMAP', { messageId });
    return null;
  }

  /**
   * Mark as read/unread - Not supported for IMAP in current implementation
   */
  async markAsRead(imapConfig, messageId) {
    throw new Error('Bidirectional sync not supported for IMAP provider');
  }

  async markAsUnread(imapConfig, messageId) {
    throw new Error('Bidirectional sync not supported for IMAP provider');
  }

  /**
   * Normalize IMAP message data to universal format
   * Compatible with UnifiedInboxService expectations
   *
   * @param {Object} imapMessage - Raw message from IMAP server
   * @param {string} accountEmail - Email account address
   * @returns {Object} Normalized message data
   */
  normalizeMessageData(imapMessage, accountEmail) {
    return {
      // Message identifiers
      message_id_header: imapMessage.messageId,
      in_reply_to: imapMessage.inReplyTo || null,
      references: Array.isArray(imapMessage.references)
        ? imapMessage.references
        : (imapMessage.references ? [imapMessage.references] : []),

      // Email addresses
      from_email: this.extractEmail(imapMessage.from),
      from_name: this.extractName(imapMessage.from),
      to_email: this.extractEmail(imapMessage.to),
      to_name: this.extractName(imapMessage.to),

      // Content
      subject: imapMessage.subject || '(no subject)',
      content_plain: imapMessage.text || '',
      content_html: imapMessage.html || imapMessage.text || '',

      // Metadata
      received_at: this.parseDate(imapMessage.date) || new Date().toISOString(),
      sent_at: this.parseDate(imapMessage.date) || new Date().toISOString(),
      is_read: false, // IMAP doesn't track read status in current implementation

      // Direction (always received for IMAP)
      direction: 'received',

      // Provider info
      provider_message_id: imapMessage.uid ? String(imapMessage.uid) : null,
      provider: 'imap',

      // Attachments
      has_attachments: imapMessage.attachments && imapMessage.attachments.length > 0,
      attachments: imapMessage.attachments || []
    };
  }

  /**
   * Decrypt IMAP credentials
   * @param {string} encryptedData - Encrypted password hex string
   * @param {string} ivHex - Initialization vector hex string
   * @returns {Object} Decrypted credentials { password }
   */
  decryptImapCredentials(encryptedData, ivHex) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logError('Decrypt IMAP credentials', error);
      throw new Error('Failed to decrypt IMAP credentials');
    }
  }

  /**
   * Extract name from email string
   * @param {string} emailString - Email in format "Name <email@example.com>"
   * @returns {string|null} Extracted name or null
   */
  extractName(emailString) {
    if (!emailString) return null;

    // Handle formats like "John Doe <john@example.com>"
    const match = emailString.match(/^([^<]+)\s*<[^>]+>/);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
    }

    return null;
  }

  /**
   * Test IMAP connection
   * @param {Object} imapConfig - IMAP configuration to test
   * @returns {Promise<Object>} Test result { success, error }
   */
  async testConnection(imapConfig) {
    try {
      this.log('Testing IMAP connection', {
        host: imapConfig.host,
        port: imapConfig.port,
        user: imapConfig.user
      });

      // Attempt to fetch 1 email to verify connection
      await this.imapService._fetchImapEmails(imapConfig, 1);

      this.log('IMAP connection test successful');

      return { success: true };
    } catch (error) {
      this.logError('IMAP connection test', error, {
        host: imapConfig.host,
        port: imapConfig.port
      });

      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ImapSyncProvider;
