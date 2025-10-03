const BaseSyncProvider = require('./BaseSyncProvider');
const OAuth2Service = require('../OAuth2Service');
const { google } = require('googleapis');

/**
 * GmailSyncProvider - Gmail-specific implementation of email synchronization
 * Supports bidirectional sync (App ↔ Gmail) and incremental sync for performance
 */
class GmailSyncProvider extends BaseSyncProvider {
  constructor(capabilities) {
    super('gmail', capabilities);
    this.oauth2Service = new OAuth2Service();
  }

  /**
   * Initialize Gmail client with OAuth2 credentials
   * @param {Object} account - OAuth2 account object
   * @param {string} organizationId - Organization ID
   * @returns {Object} Gmail client instance
   */
  async initializeClient(account, organizationId) {
    try {
      this.log('initializeClient', { accountId: account.id, email: account.email });
      
      // Get authenticated Gmail client from OAuth2Service
      const gmail = await this.oauth2Service.getGmailClient(account.email, organizationId);
      
      if (!gmail) {
        throw new Error('Failed to initialize Gmail client - OAuth2 authentication failed');
      }

      return gmail;
    } catch (error) {
      this.logError('initializeClient', error, { accountId: account.id });
      throw error;
    }
  }

  /**
   * Get incremental changes since last sync using Gmail API
   * @param {Object} gmail - Gmail client instance
   * @param {Date|string} lastSyncTimestamp - Last sync timestamp
   * @param {Object} options - Additional options
   * @returns {Array} Array of changed messages
   */
  async getIncrementalChanges(gmail, lastSyncTimestamp, options = {}) {
    try {
      const batchSize = options.batchSize || this.getMaxBatchSize();
      let query = '';

      if (lastSyncTimestamp) {
        // Convert timestamp to Gmail's after: format (Unix timestamp)
        const timestamp = new Date(lastSyncTimestamp);
        const unixTimestamp = Math.floor(timestamp.getTime() / 1000);
        query = `after:${unixTimestamp}`;
        
        this.log('getIncrementalChanges', { 
          lastSyncTimestamp, 
          unixTimestamp, 
          query,
          batchSize 
        });
      } else {
        // First sync - get last 24 hours to prevent overwhelming initial sync
        const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
        query = `after:${yesterday}`;
        
        this.log('getIncrementalChanges', { 
          type: 'initial_sync', 
          query,
          batchSize 
        });
      }

      // Get list of messages matching query
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: batchSize
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        this.log('getIncrementalChanges', { result: 'no_new_messages' });
        return [];
      }

      this.log('getIncrementalChanges', { 
        messageCount: response.data.messages.length,
        hasMore: response.data.nextPageToken ? true : false
      });

      // Get detailed message information for each message
      const messages = [];
      for (const msg of response.data.messages) {
        try {
          const messageDetail = await this.getMessageDetails(gmail, msg.id);
          if (messageDetail) {
            messages.push(messageDetail);
          }
        } catch (error) {
          this.logError('getMessageDetails', error, { messageId: msg.id });
          // Continue with other messages even if one fails
        }
      }

      return messages;

    } catch (error) {
      this.logError('getIncrementalChanges', error, { lastSyncTimestamp });
      throw error;
    }
  }

  /**
   * Get detailed message information from Gmail
   * @param {Object} gmail - Gmail client instance  
   * @param {string} providerMessageId - Gmail message ID
   * @returns {Object} Normalized message data
   */
  async getMessageDetails(gmail, providerMessageId) {
    try {
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: providerMessageId,
        format: 'full'
      });

      const message = messageResponse.data;
      return this.normalizeMessageData(message);

    } catch (error) {
      this.logError('getMessageDetails', error, { providerMessageId });
      throw error;
    }
  }

  /**
   * Mark message as read in Gmail
   * @param {Object} gmail - Gmail client instance
   * @param {string} providerMessageId - Gmail message ID
   * @returns {boolean} Success status
   */
  async markAsRead(gmail, providerMessageId) {
    try {
      this.log('markAsRead', { messageId: providerMessageId });

      const response = await gmail.users.messages.modify({
        userId: 'me',
        id: providerMessageId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });

      const success = response.status === 200;
      this.log('markAsRead', { messageId: providerMessageId, success });

      return success;
    } catch (error) {
      this.logError('markAsRead', error, { messageId: providerMessageId });
      throw error;
    }
  }

  /**
   * Mark message as unread in Gmail
   * @param {Object} gmail - Gmail client instance
   * @param {string} providerMessageId - Gmail message ID
   * @returns {boolean} Success status
   */
  async markAsUnread(gmail, providerMessageId) {
    try {
      this.log('markAsUnread', { messageId: providerMessageId });

      const response = await gmail.users.messages.modify({
        userId: 'me',
        id: providerMessageId,
        resource: {
          addLabelIds: ['UNREAD']
        }
      });

      const success = response.status === 200;
      this.log('markAsUnread', { messageId: providerMessageId, success });

      return success;
    } catch (error) {
      this.logError('markAsUnread', error, { messageId: providerMessageId });
      throw error;
    }
  }

  /**
   * Normalize Gmail message data to universal format
   * @param {Object} gmailMessage - Gmail message object
   * @returns {Object} Normalized message data
   */
  normalizeMessageData(gmailMessage) {
    try {
      const headers = gmailMessage.payload?.headers || [];
      
      // Extract headers
      const messageIdHeader = this.findHeader(headers, 'Message-ID');
      const subject = this.findHeader(headers, 'Subject');
      const from = this.findHeader(headers, 'From');
      const to = this.findHeader(headers, 'To');
      const dateHeader = this.findHeader(headers, 'Date');
      const inReplyTo = this.findHeader(headers, 'In-Reply-To');
      const references = this.findHeader(headers, 'References');

      // Determine if message is read (doesn't have UNREAD label)
      const isRead = !gmailMessage.labelIds?.includes('UNREAD');
      
      // Determine direction based on sender
      const fromEmail = this.extractEmail(from);
      const direction = gmailMessage.labelIds?.includes('SENT') ? 'sent' : 'received';

      // Extract message content from payload
      const { contentHtml, contentPlain } = this.extractMessageContent(gmailMessage.payload);

      // Parse timestamp - store in local format (not UTC)
      let localTimestamp = null;
      if (dateHeader) {
        try {
          const dateObj = new Date(dateHeader);
          // Store in local format as required by the system
          localTimestamp = dateObj.getFullYear() + '-' + 
            String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
            String(dateObj.getDate()).padStart(2, '0') + 'T' + 
            String(dateObj.getHours()).padStart(2, '0') + ':' + 
            String(dateObj.getMinutes()).padStart(2, '0') + ':' + 
            String(dateObj.getSeconds()).padStart(2, '0');
        } catch (error) {
          console.warn('Failed to parse Gmail date:', dateHeader, error);
          localTimestamp = new Date().toISOString();
        }
      }

      const normalized = {
        // Provider-specific IDs
        provider_message_id: gmailMessage.id,
        provider_thread_id: gmailMessage.threadId,
        
        // Universal message fields
        message_id_header: messageIdHeader,
        subject: subject || '(No subject)',
        from_email: this.extractEmail(from),
        to_email: this.extractEmail(to),
        direction: direction,
        is_read: isRead,
        
        // Message content
        content_html: contentHtml,
        content_plain: contentPlain,
        
        // Threading information
        in_reply_to: inReplyTo,
        message_references: references,
        
        // Timestamps (stored in local format)
        sent_at: direction === 'sent' ? localTimestamp : null,
        received_at: direction === 'received' ? localTimestamp : null,
        
        // Raw data for debugging
        raw_headers: {
          from: from,
          to: to,
          date: dateHeader,
          subject: subject
        },
        
        // Provider metadata
        provider: 'gmail',
        last_status_sync_at: new Date().toISOString(),
        sync_status: 'synced'
      };

      return normalized;

    } catch (error) {
      this.logError('normalizeMessageData', error, { messageId: gmailMessage.id });
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Find header value by name (case-insensitive)
   * @param {Array} headers - Array of header objects
   * @param {string} name - Header name to find
   * @returns {string|null} Header value or null
   */
  findHeader(headers, name) {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || null;
  }

  /**
   * Search Gmail directly for emails (bypasses local database)
   * @param {Object} gmail - Gmail client instance
   * @param {string} searchQuery - Search term (email, subject, content)
   * @param {Object} options - Search options
   * @returns {Array} Array of matching messages
   */
  async searchGmailDirect(gmail, searchQuery, options = {}) {
    try {
      const maxResults = options.maxResults || 50;
      const pageToken = options.pageToken;

      this.log('searchGmailDirect', { searchQuery, maxResults, pageToken: pageToken ? pageToken.substring(0, 20) + '...' : null });

      // Use Gmail search operators for comprehensive search
      // Search in from, to, subject, and body
      const requestParams = {
        userId: 'me',
        q: searchQuery, // Gmail search query (e.g., "from:email@example.com" or just "email@example.com")
        maxResults: maxResults
      };

      // Add pageToken if provided for pagination
      if (pageToken) {
        requestParams.pageToken = pageToken;
      }

      const response = await gmail.users.messages.list(requestParams);

      if (!response.data.messages || response.data.messages.length === 0) {
        this.log('searchGmailDirect', { result: 'no_matches' });
        return {
          messages: [],
          nextPageToken: null
        };
      }

      this.log('searchGmailDirect', {
        matchCount: response.data.messages.length,
        hasMore: response.data.nextPageToken ? true : false,
        nextPageToken: response.data.nextPageToken ? response.data.nextPageToken.substring(0, 20) + '...' : null
      });

      // Get detailed message information for each result
      const messages = [];
      for (const msg of response.data.messages) {
        try {
          const messageDetail = await this.getMessageDetails(gmail, msg.id);
          if (messageDetail) {
            messages.push(messageDetail);
          }
        } catch (error) {
          this.logError('searchGmailDirect - getMessageDetails', error, { messageId: msg.id });
          // Continue with other messages even if one fails
        }
      }

      // Return messages and nextPageToken for pagination
      return {
        messages,
        nextPageToken: response.data.nextPageToken || null
      };

    } catch (error) {
      this.logError('searchGmailDirect', error, { searchQuery });
      throw error;
    }
  }

  /**
   * Get Gmail message by Message-ID header (for reverse lookup)
   * @param {Object} gmail - Gmail client instance
   * @param {string} messageIdHeader - RFC Message-ID header
   * @returns {string|null} Gmail message ID or null
   */
  async getGmailMessageIdByHeader(gmail, messageIdHeader) {
    try {
      if (!messageIdHeader) return null;

      // Search Gmail for message with specific Message-ID
      const query = `rfc822msgid:${messageIdHeader}`;
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 1
      });

      if (response.data.messages && response.data.messages.length > 0) {
        return response.data.messages[0].id;
      }

      return null;
    } catch (error) {
      this.logError('getGmailMessageIdByHeader', error, { messageIdHeader });
      return null;
    }
  }

  /**
   * Batch mark multiple messages as read
   * @param {Object} gmail - Gmail client instance
   * @param {Array} providerMessageIds - Array of Gmail message IDs
   * @returns {Object} Results with success count and errors
   */
  async batchMarkAsRead(gmail, providerMessageIds) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const messageId of providerMessageIds) {
      try {
        await this.markAsRead(gmail, messageId);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ messageId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Extract HTML and plain text content from Gmail message payload
   * @param {Object} payload - Gmail message payload
   * @returns {Object} { contentHtml, contentPlain }
   */
  extractMessageContent(payload) {
    let contentHtml = '';
    let contentPlain = '';

    if (!payload) return { contentHtml, contentPlain };

    // Helper function to decode base64url
    const decodeBase64Url = (data) => {
      if (!data) return '';
      try {
        // Gmail uses base64url encoding
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64').toString('utf8');
      } catch (error) {
        console.warn('Failed to decode base64url data:', error);
        return '';
      }
    };

    // Recursive function to extract content from parts
    const extractFromParts = (parts) => {
      if (!parts || !Array.isArray(parts)) return;
      
      for (const part of parts) {
        const mimeType = part.mimeType;
        
        if (mimeType === 'text/plain' && part.body?.data) {
          contentPlain = decodeBase64Url(part.body.data);
        } else if (mimeType === 'text/html' && part.body?.data) {
          contentHtml = decodeBase64Url(part.body.data);
        } else if (part.parts) {
          // Recursive call for multipart messages
          extractFromParts(part.parts);
        }
      }
    };

    // Handle single-part message
    if (payload.body?.data) {
      const mimeType = payload.mimeType;
      if (mimeType === 'text/plain') {
        contentPlain = decodeBase64Url(payload.body.data);
      } else if (mimeType === 'text/html') {
        contentHtml = decodeBase64Url(payload.body.data);
      }
    }
    
    // Handle multipart message
    if (payload.parts) {
      extractFromParts(payload.parts);
    }

    // Generate plain text from HTML if only HTML is available
    if (contentHtml && !contentPlain) {
      try {
        // Simple HTML to text conversion (remove tags)
        contentPlain = contentHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } catch (error) {
        console.warn('Failed to convert HTML to plain text:', error);
      }
    }

    return { contentHtml, contentPlain };
  }
}

module.exports = GmailSyncProvider;