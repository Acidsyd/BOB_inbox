const { createClient } = require('@supabase/supabase-js');
const ProviderFactory = require('./providers/ProviderFactory');
const UnifiedInboxService = require('./UnifiedInboxService');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Universal EmailSyncService - Provider-agnostic email synchronization
 * Features:
 * - Universal provider support (Gmail, Microsoft, SMTP)
 * - Bidirectional sync for supported providers
 * - Incremental sync with timestamp tracking
 * - Performance optimization with parallel processing
 * - Comprehensive sync monitoring and error handling
 */
class EmailSyncService {
  constructor() {
    this.unifiedInboxService = new UnifiedInboxService();
    console.log('🔄 Universal EmailSyncService initialized');
  }

  /**
   * Get UTC timestamp in consistent format
   */
  getUTCTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Universal sync trigger for an email account
   * @param {string} accountId - Account ID to sync
   * @param {string} organizationId - Organization ID
   * @returns {Object} Sync result with statistics
   */
  async syncAccount(accountId, organizationId) {
    const syncStart = Date.now();
    let syncHistoryId = null;

    try {
      console.log('🔄 === UNIVERSAL SYNC TRIGGERED ===');
      console.log('📧 Account ID:', accountId);
      console.log('🏢 Organization:', organizationId);

      // Get account with provider capabilities
      const account = await this.getAccountWithCapabilities(accountId, organizationId);
      if (!account) {
        throw new Error('Email account not found or access denied');
      }

      // Create sync history entry
      syncHistoryId = await this.createSyncHistoryEntry(account, organizationId, 'manual');

      console.log('📧 Syncing account:', account.email, 'Provider:', account.provider);
      console.log('🔧 Provider capabilities:', account.provider_capabilities);

      // Create appropriate provider instance
      const provider = ProviderFactory.createProvider(account.provider);
      
      // Initialize provider client
      const client = await provider.initializeClient(account, organizationId);

      // Get incremental changes since last sync
      const messages = await provider.getIncrementalChanges(
        client, 
        account.last_sync_at,
        { batchSize: provider.getMaxBatchSize() }
      );

      console.log(`📬 Found ${messages.length} messages to sync`);

      // Process messages through unified inbox
      let newMessages = 0;
      let updatedMessages = 0;

      for (const messageData of messages) {
        try {
          // Check if message already exists
          const existingMessage = await this.findExistingMessage(
            messageData.message_id_header,
            organizationId
          );

          if (existingMessage) {
            // Update existing message if read status changed
            if (existingMessage.is_read !== messageData.is_read) {
              await this.updateMessageReadStatus(
                existingMessage.id,
                messageData.is_read
              );
              updatedMessages++;
              console.log(`📖 Updated read status: ${messageData.subject}`);
            }
          } else {
            // CRITICAL FIX: Add email_account_id to messageData before ingestion
            const enrichedMessageData = {
              ...messageData,
              email_account_id: account.id,
              organization_id: organizationId
            };

            // Ingest new message via unified inbox service
            await this.unifiedInboxService.ingestEmail(enrichedMessageData, messageData.direction, organizationId);
            newMessages++;
            console.log(`📧 New message ingested: ${messageData.subject} (account: ${account.email})`);
          }

        } catch (error) {
          console.error('⚠️ Failed to process message:', messageData.subject, error.message);
          // Continue with other messages
        }
      }

      // Update account sync timestamp
      await this.updateAccountSyncTimestamp(account.id, account.type);

      const syncResult = {
        success: true,
        provider: account.provider,
        syncedMessages: messages.length,
        newMessages,
        updatedMessages,
        timestamp: this.getUTCTimestamp(),
        duration: Date.now() - syncStart
      };

      // Complete sync history entry
      await this.completeSyncHistoryEntry(
        syncHistoryId, 
        'completed', 
        syncResult.syncedMessages,
        syncResult.newMessages,
        syncResult.updatedMessages,
        syncResult.duration
      );

      console.log('✅ Universal sync completed:', syncResult);
      return syncResult;

    } catch (error) {
      console.error('❌ Universal sync failed:', error);

      // Mark sync history as failed
      if (syncHistoryId) {
        await this.completeSyncHistoryEntry(
          syncHistoryId, 
          'failed', 
          0, 0, 0, 
          Date.now() - syncStart,
          error.message
        );
      }

      throw error;
    }
  }

  /**
   * Bidirectional sync - mark message as read in provider
   * @param {string} messageId - Internal message ID
   * @param {string} organizationId - Organization ID
   * @param {boolean} isRead - Read status
   * @returns {Object} Sync result
   */
  async markMessageReadInProvider(messageId, organizationId, isRead) {
    try {
      console.log(`📖 Marking message ${isRead ? 'READ' : 'UNREAD'} in provider:`, messageId);

      // Get message with provider information
      const { data: message } = await supabase
        .from('conversation_messages')
        .select(`
          id, 
          provider_message_id, 
          message_id_header,
          email_account_id,
          organization_id
        `)
        .eq('id', messageId)
        .eq('organization_id', organizationId)
        .single();

      if (!message || !message.provider_message_id || !message.email_account_id) {
        throw new Error('Message not found or missing provider information');
      }

      // Get account information
      const account = await this.getAccountWithCapabilities(
        message.email_account_id, 
        organizationId
      );
      
      if (!account) {
        throw new Error('Associated email account not found');
      }

      // Check if provider supports bidirectional sync
      const provider = ProviderFactory.createProvider(account.provider);
      if (!provider.supportsBidirectionalSync()) {
        throw new Error(`${account.provider} does not support bidirectional sync`);
      }

      // Initialize provider client
      const client = await provider.initializeClient(account, organizationId);

      // Mark message as read/unread in provider
      const success = isRead 
        ? await provider.markAsRead(client, message.provider_message_id)
        : await provider.markAsUnread(client, message.provider_message_id);

      if (success) {
        // Update local database
        await this.updateMessageReadStatus(messageId, isRead);
        
        // Update sync timestamp
        await this.updateMessageSyncStatus(messageId, 'synced');

        console.log(`✅ Message ${isRead ? 'READ' : 'unread'} status synced to ${account.provider}`);
        
        return {
          success: true,
          messageId,
          isRead,
          provider: account.provider,
          syncedAt: this.getUTCTimestamp()
        };
      } else {
        throw new Error('Provider sync operation failed');
      }

    } catch (error) {
      console.error(`❌ Failed to sync message read status:`, error);
      throw error;
    }
  }

  /**
   * Get email account with sync capabilities
   */
  async getEmailAccountForSync(accountId, organizationId) {
    try {
      // Try OAuth2 accounts first (Gmail/Outlook)
      const { data: oauthAccount, error: oauthError } = await supabase
        .from('oauth2_tokens')
        .select('id, email, provider, encrypted_tokens')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();

      if (oauthAccount) {
        return {
          ...oauthAccount,
          type: 'oauth2',
          syncCapable: true
        };
      }

      // Try SMTP accounts
      const { data: smtpAccount, error: smtpError } = await supabase
        .from('email_accounts')
        .select('id, email, provider, credentials')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      if (smtpAccount) {
        return {
          ...smtpAccount,
          type: 'smtp',
          syncCapable: false // SMTP has limited sync capabilities
        };
      }

      console.error('❌ Account not found:', { oauthError, smtpError });
      return null;

    } catch (error) {
      console.error('❌ Error getting account for sync:', error);
      return null;
    }
  }

  /**
   * Gmail OAuth2 sync
   */
  async syncGmailAccount(account, organizationId) {
    try {
      console.log('🔐 Syncing Gmail account via OAuth2');

      if (account.type !== 'oauth2') {
        throw new Error('Account is not OAuth2 type for Gmail sync');
      }

      // Get OAuth2 credentials
      const gmail = await this.oauth2Service.getGmailClient(account.email, organizationId);

      let syncCount = 0;
      let newMessages = 0;
      let updatedStatus = 0;

      // Sync recent messages (last 3 days, reduced for performance)
      const query = 'newer_than:3d';
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      if (response.data.messages) {
        console.log(`📬 Found ${response.data.messages.length} recent messages to sync`);

        for (const msg of response.data.messages) {
          try {
            const messageDetail = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'metadata',
              metadataHeaders: ['Message-ID', 'Subject', 'From', 'To', 'Date']
            });

            // Extract headers
            const headers = messageDetail.data.payload.headers;
            const messageId = headers.find(h => h.name === 'Message-ID')?.value;
            const subject = headers.find(h => h.name === 'Subject')?.value;
            const from = headers.find(h => h.name === 'From')?.value;

            if (messageId) {
              // Check if we already have this message
              const { data: existingMessage } = await supabase
                .from('conversation_messages')
                .select('id, is_read')
                .eq('organization_id', organizationId)
                .eq('message_id_header', messageId)
                .single();

              if (existingMessage) {
                // Update existing message read status
                const isRead = !messageDetail.data.labelIds?.includes('UNREAD');
                
                if (existingMessage.is_read !== isRead) {
                  await supabase
                    .from('conversation_messages')
                    .update({ is_read: isRead })
                    .eq('id', existingMessage.id);
                  updatedStatus++;
                }
                
                syncCount++;
              } else {
                // This is a new message from Gmail - import it into unified inbox
                console.log(`📥 New message from Gmail: ${subject?.substring(0, 50)}...`);
                
                // Get full message content for ingestion
                const fullMessage = await gmail.users.messages.get({
                  userId: 'me',
                  id: msg.id,
                  format: 'full'
                });
                
                // Extract email details for ingestion
                const fullHeaders = fullMessage.data.payload.headers;
                const to = fullHeaders.find(h => h.name === 'To')?.value;
                const date = fullHeaders.find(h => h.name === 'Date')?.value;
                const inReplyTo = fullHeaders.find(h => h.name === 'In-Reply-To')?.value;
                const references = fullHeaders.find(h => h.name === 'References')?.value;
                
                // Store the original Gmail time as UTC (consistent with database)
                let utcTimestamp = null;
                if (date) {
                  // Parse Gmail date and store as UTC for database consistency
                  const dateObj = new Date(date);
                  utcTimestamp = dateObj.toISOString();
                }
                
                // DEBUG: Log original Gmail Date header vs parsed timestamp
                console.log(`📅 Gmail Date Debug for "${subject?.substring(0, 30)}..."`);
                console.log(`   Raw Gmail Date header: "${date}"`);
                console.log(`   UTC Timestamp: "${utcTimestamp}"`);
                console.log(`   Display time: "${date ? new Date(date).toLocaleString() : 'null'}"`);
                console.log(`   Current sync time: "${new Date().toLocaleString()}"`);
                console.log(`   Time difference: ${date ? ((new Date().getTime() - new Date(date).getTime()) / (1000 * 60)) : 0} minutes`);
                
                
                // Get message body
                let content = '';
                if (fullMessage.data.payload.parts) {
                  // Multipart message
                  const textPart = fullMessage.data.payload.parts.find(part => 
                    part.mimeType === 'text/html' || part.mimeType === 'text/plain'
                  );
                  if (textPart?.body?.data) {
                    content = Buffer.from(textPart.body.data, 'base64').toString();
                  }
                } else if (fullMessage.data.payload.body?.data) {
                  // Simple message
                  content = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString();
                }
                
                // Determine direction (sent vs received)
                const direction = from?.includes(account.email) ? 'sent' : 'received';
                
                // Ingest into unified inbox
                try {
                  if (!this.unifiedInboxService) {
                    const UnifiedInboxService = require('./UnifiedInboxService');
                    this.unifiedInboxService = new UnifiedInboxService();
                  }
                  
                  // Use the UTC timestamp for database consistency
                  
                  await this.unifiedInboxService.ingestEmail({
                    message_id_header: messageId,
                    from_email: from,
                    to_email: to,
                    subject: subject,
                    content_html: content.includes('<html>') ? content : null,
                    content_plain: content.includes('<html>') ? null : content,
                    sent_at: direction === 'sent' ? utcTimestamp : null,
                    received_at: direction === 'received' ? utcTimestamp : null,
                    in_reply_to: inReplyTo,
                    message_references: references,
                    organization_id: organizationId
                  }, direction);
                  
                  console.log(`✅ Ingested new ${direction} email: ${subject?.substring(0, 30)}...`);
                  newMessages++;
                } catch (ingestError) {
                  console.error('❌ Failed to ingest email:', ingestError.message);
                }
              }
            }

          } catch (msgError) {
            console.error('⚠️ Error processing message:', msgError.message);
          }
        }
      }

      return {
        success: true,
        provider: 'gmail',
        syncedMessages: syncCount,
        newMessages: newMessages,
        updatedStatus: updatedStatus,
        timestamp: this.getUTCTimestamp()
      };

    } catch (error) {
      console.error('❌ Gmail sync failed:', error);
      return {
        success: false,
        provider: 'gmail',
        error: error.message,
        timestamp: this.getUTCTimestamp()
      };
    }
  }

  /**
   * Outlook sync (placeholder for Microsoft Graph API)
   */
  async syncOutlookAccount(account, organizationId) {
    try {
      console.log('📧 Outlook sync not yet implemented');
      
      // TODO: Implement Microsoft Graph API sync
      // Similar pattern to Gmail but using Microsoft Graph API
      
      return {
        success: false,
        provider: 'outlook',
        error: 'Outlook sync not yet implemented',
        timestamp: this.getUTCTimestamp()
      };

    } catch (error) {
      console.error('❌ Outlook sync failed:', error);
      return {
        success: false,
        provider: 'outlook',
        error: error.message,
        timestamp: this.getUTCTimestamp()
      };
    }
  }

  /**
   * SMTP/IMAP sync (limited capabilities)
   */
  async syncSmtpAccount(account, organizationId) {
    try {
      console.log('📨 SMTP account sync (limited capabilities)');
      
      // SMTP accounts have very limited sync capabilities
      // Can only update local messages with SMTP provider type
      
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('organization_id', organizationId)
        .or(`from_email.eq.${account.email},to_email.eq.${account.email}`)
        .is('provider_type', null);

      let updated = 0;
      if (messages && messages.length > 0) {
        const { error } = await supabase
          .from('conversation_messages')
          .update({ 
            provider_type: 'smtp',
            sync_status: 'local',
            last_synced_at: this.getUTCTimestamp()
          })
          .in('id', messages.map(m => m.id));

        if (!error) {
          updated = messages.length;
        }
      }

      return {
        success: true,
        provider: 'smtp',
        syncedMessages: updated,
        note: 'SMTP has limited sync capabilities - only local tagging',
        timestamp: this.getUTCTimestamp()
      };

    } catch (error) {
      console.error('❌ SMTP sync failed:', error);
      return {
        success: false,
        provider: 'smtp',
        error: error.message,
        timestamp: this.getUTCTimestamp()
      };
    }
  }

  /**
   * Update message with sync information
   */
  async updateMessageSyncInfo(messageId, provider, providerMessageId, syncStatus = 'synced') {
    try {
      const updateData = {
        provider_type: provider,
        sync_status: syncStatus,
        last_synced_at: this.getUTCTimestamp()
      };

      // Add provider-specific message ID
      if (provider === 'gmail' && providerMessageId) {
        updateData.gmail_message_id = providerMessageId;
      } else if (provider === 'outlook' && providerMessageId) {
        updateData.outlook_message_id = providerMessageId;
      }

      const { error } = await supabase
        .from('conversation_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('❌ Failed to update message sync info:', error);
        return false;
      }

      console.log('✅ Message sync info updated:', messageId);
      return true;

    } catch (error) {
      console.error('❌ Error updating message sync info:', error);
      return false;
    }
  }

  /**
   * Sync message read status with provider
   */
  async syncMessageReadStatus(messageId, isRead, provider) {
    try {
      console.log(`📖 Syncing read status: ${isRead ? 'READ' : 'UNREAD'} (${provider})`);

      if (provider === 'gmail') {
        return await this.syncGmailReadStatus(messageId, isRead);
      } else if (provider === 'outlook') {
        return await this.syncOutlookReadStatus(messageId, isRead);
      } else {
        console.log('ℹ️ SMTP accounts cannot sync read status');
        return { success: true, note: 'SMTP does not support read status sync' };
      }

    } catch (error) {
      console.error('❌ Read status sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync Gmail read status
   */
  async syncGmailReadStatus(providerMessageId, isRead) {
    try {
      console.log(`🔍 Syncing Gmail read status for message: ${providerMessageId}`);
      
      // Determine if we have a UUID or a Gmail message ID
      let gmailMessageId = null;
      let emailAccount = null;
      let organizationId = null;
      
      // Check if this looks like a database UUID (8-4-4-4-12 format)
      const isUuid = providerMessageId && providerMessageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (isUuid) {
        // This is our internal message UUID, look up the actual Gmail message ID
        const { data: message } = await supabase
          .from('conversation_messages')
          .select('provider_message_id, gmail_message_id, from_email, to_email, direction, organization_id')
          .eq('id', providerMessageId)
          .single();

        if (!message) {
          throw new Error('Message not found in database');
        }

        // Use provider_message_id if it exists and is not a UUID, otherwise use gmail_message_id
        if (message.provider_message_id && !message.provider_message_id.match(/^[0-9a-f]{8}-/)) {
          gmailMessageId = message.provider_message_id;
        } else if (message.gmail_message_id) {
          gmailMessageId = message.gmail_message_id;
        }
        
        // For received messages, use to_email (our account), for sent use from_email
        emailAccount = message.direction === 'sent' ? message.from_email : message.to_email;
        organizationId = message.organization_id;
        
        console.log(`📋 Found message in DB: gmail_id=${gmailMessageId}, account=${emailAccount}, direction=${message.direction}`);
      } else {
        // This is already a Gmail message ID, but we still need the account info
        gmailMessageId = providerMessageId;
        console.log(`📋 Using direct Gmail message ID: ${gmailMessageId}`);
        
        // Try to find message in database to get account info
        const { data: message } = await supabase
          .from('conversation_messages')
          .select('from_email, to_email, direction, organization_id')
          .or(`provider_message_id.eq.${gmailMessageId},gmail_message_id.eq.${gmailMessageId}`)
          .single();
        
        if (message) {
          emailAccount = message.direction === 'sent' ? message.from_email : message.to_email;
          organizationId = message.organization_id;
          console.log(`📧 Found account from message: ${emailAccount}`);
        }
      }

      if (!gmailMessageId || gmailMessageId.match(/^[0-9a-f]{8}-/)) {
        throw new Error('No valid Gmail message ID available for sync');
      }
      
      // If we still don't have an account, try to find any OAuth2 account for this organization
      if (!emailAccount && organizationId) {
        const { data: accounts } = await supabase
          .from('oauth2_tokens')
          .select('email')
          .eq('organization_id', organizationId)
          .eq('status', 'linked_to_account')
          .limit(1);
        
        if (accounts && accounts.length > 0) {
          emailAccount = accounts[0].email;
          console.log(`📧 Fallback to OAuth2 account: ${emailAccount}`);
        }
      }

      if (!emailAccount) {
        throw new Error('No email account found for Gmail sync');
      }

      const gmail = await this.oauth2Service.getGmailClient(
        emailAccount, 
        organizationId
      );

      // Update Gmail message labels
      const labelModifications = isRead 
        ? { removeLabelIds: ['UNREAD'] }
        : { addLabelIds: ['UNREAD'] };

      console.log(`🏷️ Modifying Gmail message ${gmailMessageId}: ${isRead ? 'removing UNREAD' : 'adding UNREAD'}`);

      await gmail.users.messages.modify({
        userId: 'me',
        id: gmailMessageId,
        resource: labelModifications
      });

      console.log('✅ Gmail read status synced successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Gmail read status sync failed:', error);
      
      // Don't throw the error, return failure status instead
      return { 
        success: false, 
        error: error.message,
        note: 'Gmail sync failed but message was marked in app database'
      };
    }
  }

  /**
   * Sync Outlook read status (placeholder)
   */
  async syncOutlookReadStatus(messageId, isRead) {
    try {
      console.log('📧 Outlook read status sync not yet implemented');
      
      // TODO: Implement Microsoft Graph API read status sync
      
      return { success: false, error: 'Outlook read status sync not yet implemented' };

    } catch (error) {
      console.error('❌ Outlook read status sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // UNIVERSAL HELPER METHODS - Support new provider architecture
  // ============================================================================

  /**
   * Get account with provider capabilities
   * @param {string} accountId - Account ID
   * @param {string} organizationId - Organization ID
   * @returns {Object|null} Account with capabilities
   */
  async getAccountWithCapabilities(accountId, organizationId) {
    try {
      // Try OAuth2 accounts first (Gmail/Microsoft)
      const { data: oauthAccount } = await supabase
        .from('oauth2_tokens')
        .select(`
          id, email, provider, encrypted_tokens, 
          last_sync_at, provider_capabilities
        `)
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();

      if (oauthAccount) {
        return {
          ...oauthAccount,
          type: 'oauth2',
          syncCapable: true
        };
      }

      // Try SMTP/relay accounts (Mailgun/SendGrid with IMAP)
      const { data: smtpAccount } = await supabase
        .from('email_accounts')
        .select(`
          id, email, provider, credentials_encrypted,
          imap_config, imap_credentials_encrypted, imap_credentials_iv,
          last_sync_at, provider_capabilities
        `)
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      if (smtpAccount) {
        return {
          ...smtpAccount,
          type: smtpAccount.provider === 'smtp' ? 'smtp' : 'relay', // relay for Mailgun/SendGrid
          syncCapable: smtpAccount.imap_config ? true : false // Can sync if IMAP configured
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting account with capabilities:', error);
      return null;
    }
  }

  /**
   * Find existing message by Message-ID header
   * @param {string} messageIdHeader - RFC Message-ID header
   * @param {string} organizationId - Organization ID
   * @returns {Object|null} Existing message or null
   */
  async findExistingMessage(messageIdHeader, organizationId) {
    if (!messageIdHeader) return null;

    try {
      const { data: message } = await supabase
        .from('conversation_messages')
        .select('id, is_read, provider_message_id')
        .eq('organization_id', organizationId)
        .eq('message_id_header', messageIdHeader)
        .single();

      return message;
    } catch (error) {
      // Message not found - this is normal for new messages
      return null;
    }
  }

  /**
   * Update message read status
   * @param {string} messageId - Message ID
   * @param {boolean} isRead - Read status
   */
  async updateMessageReadStatus(messageId, isRead) {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .update({ 
          is_read: isRead,
          last_status_sync_at: this.getUTCTimestamp()
        })
        .eq('id', messageId);

      if (error) throw error;
      
      console.log(`✅ Updated message read status: ${isRead}`);
    } catch (error) {
      console.error('❌ Failed to update message read status:', error);
      throw error;
    }
  }

  /**
   * Update message sync status
   * @param {string} messageId - Message ID  
   * @param {string} syncStatus - Sync status
   */
  async updateMessageSyncStatus(messageId, syncStatus) {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .update({ 
          sync_status: syncStatus,
          last_status_sync_at: this.getUTCTimestamp()
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to update message sync status:', error);
      throw error;
    }
  }

  /**
   * Update account sync timestamp
   * @param {string} accountId - Account ID
   * @param {string} accountType - Account type ('oauth2' or 'smtp')
   */
  async updateAccountSyncTimestamp(accountId, accountType) {
    try {
      const table = accountType === 'oauth2' ? 'oauth2_tokens' : 'email_accounts';
      const timestamp = this.getUTCTimestamp();

      console.log(`🕐 Updating ${table} sync timestamp for account ${accountId} to ${timestamp}`);

      const { data, error } = await supabase
        .from(table)
        .update({ last_sync_at: timestamp })
        .eq('id', accountId)
        .select();

      if (error) {
        console.error(`❌ Database error updating ${table}:`, error);
        throw error;
      }

      console.log(`✅ Updated ${accountType} account sync timestamp:`, data);
    } catch (error) {
      console.error('❌ Failed to update account sync timestamp:', error);
    }
  }

  /**
   * Create sync history entry
   * @param {Object} account - Account object
   * @param {string} organizationId - Organization ID
   * @param {string} syncType - Sync type ('manual', 'auto')
   * @returns {string} Sync history ID
   */
  async createSyncHistoryEntry(account, organizationId, syncType) {
    try {
      const { data, error } = await supabase
        .from('email_sync_history')
        .insert({
          organization_id: organizationId,
          account_id: account.id,
          account_type: account.type,
          provider: account.provider,
          sync_type: syncType,
          status: 'started',
          started_at: this.getUTCTimestamp()
        })
        .select('id')
        .single();

      if (error) throw error;
      
      return data.id;
    } catch (error) {
      console.error('❌ Failed to create sync history entry:', error);
      return null;
    }
  }

  /**
   * Complete sync history entry
   * @param {string} syncHistoryId - Sync history ID
   * @param {string} status - Final status ('completed' or 'failed')
   * @param {number} messagesProcessed - Messages processed count
   * @param {number} messagesNew - New messages count
   * @param {number} messagesUpdated - Updated messages count
   * @param {number} duration - Duration in milliseconds
   * @param {string} errorMessage - Error message if failed
   */
  async completeSyncHistoryEntry(syncHistoryId, status, messagesProcessed = 0, messagesNew = 0, messagesUpdated = 0, duration = 0, errorMessage = null) {
    if (!syncHistoryId) return;

    try {
      const { error } = await supabase
        .from('email_sync_history')
        .update({
          status,
          messages_processed: messagesProcessed,
          messages_new: messagesNew,
          messages_updated: messagesUpdated,
          sync_duration_ms: duration,
          error_message: errorMessage,
          completed_at: this.getUTCTimestamp()
        })
        .eq('id', syncHistoryId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to complete sync history entry:', error);
    }
  }

  /**
   * Get sync status for an organization
   */
  async getSyncStatus(organizationId) {
    try {
      const { data: history } = await supabase
        .from('email_sync_history')
        .select('provider, status, messages_processed, completed_at')
        .eq('organization_id', organizationId)
        .order('completed_at', { ascending: false })
        .limit(50);

      const summary = (history || []).reduce((acc, sync) => {
        const provider = sync.provider || 'unknown';
        if (!acc[provider]) acc[provider] = {};
        
        const status = sync.status || 'unknown';
        acc[provider][status] = (acc[provider][status] || 0) + 1;
        
        return acc;
      }, {});

      const totalMessages = (history || []).reduce((sum, sync) => 
        sum + (sync.messages_processed || 0), 0
      );

      return {
        organizationId,
        totalMessages,
        providerSummary: summary,
        lastChecked: this.getUTCTimestamp()
      };

    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      return null;
    }
  }
}

module.exports = EmailSyncService;