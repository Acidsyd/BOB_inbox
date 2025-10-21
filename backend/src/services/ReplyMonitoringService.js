const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const OAuth2Service = require('./OAuth2Service');
const UnifiedInboxService = require('./UnifiedInboxService');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * ReplyMonitoringService - Monitors Gmail inboxes for replies to campaign emails
 * Uses Gmail API to check for replies and updates campaign metrics
 */
class ReplyMonitoringService {
  constructor() {
    this.oauth2Service = new OAuth2Service();
    this.unifiedInboxService = new UnifiedInboxService();
    console.log('📬 ReplyMonitoringService initialized with UnifiedInbox integration');
  }

  /**
   * Sanitize message body to prevent JSON encoding errors
   * Removes problematic Unicode characters and normalizes content
   */
  sanitizeMessageBody(messageBody) {
    if (!messageBody || typeof messageBody !== 'string') {
      return '';
    }

    try {
      // Remove or replace problematic Unicode characters
      let sanitized = messageBody
        // Remove null bytes and control characters (except \n, \r, \t)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
        // Replace lone surrogates (the source of the JSON error)
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Trim excessive whitespace
        .trim();

      // Truncate if too long to prevent JSON size issues
      if (sanitized.length > 50000) {
        sanitized = sanitized.substring(0, 50000) + '... [truncated]';
      }

      return sanitized;
      
    } catch (error) {
      console.error('❌ Error sanitizing message body:', error);
      return '[Error processing message content]';
    }
  }

  /**
   * Get actual email address from account ID 
   */
  async getEmailAddressFromAccountId(accountId, organizationId) {
    try {
      // First try oauth2_tokens table
      const { data: oauth2Account } = await supabase
        .from('oauth2_tokens')
        .select('email')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();
        
      if (oauth2Account) {
        return oauth2Account.email;
      }

      // Then try email_accounts table
      const { data: emailAccount } = await supabase
        .from('email_accounts')
        .select('email')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();
        
      return emailAccount?.email || null;
      
    } catch (error) {
      console.error(`❌ Error getting email address for account ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Ingest recent messages into unified inbox
   */
  async ingestRecentMessages(gmail, messages, emailAccount, organizationId) {
    try {
      console.log(`🔄 Ingesting ${messages.length} recent messages for ${emailAccount}`);
      
      for (const msg of messages) {
        try {
          // Get full message details
          const messageDetail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
          });

          // Extract headers
          const headers = messageDetail.data.payload.headers;
          const messageId = headers.find(h => h.name === 'Message-ID')?.value;
          const subject = headers.find(h => h.name === 'Subject')?.value;
          const from = headers.find(h => h.name === 'From')?.value;
          const to = headers.find(h => h.name === 'To')?.value;
          const date = headers.find(h => h.name === 'Date')?.value;
          const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value;
          const references = headers.find(h => h.name === 'References')?.value;

          if (!messageId) {
            console.log('⚠️ Message has no Message-ID, skipping');
            continue;
          }

          // Check if this message already exists
          const { data: existingMessage } = await supabase
            .from('conversation_messages')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('message_id_header', messageId)
            .single();

          if (existingMessage) {
            console.log(`📧 Message already exists: ${subject?.substring(0, 30)}...`);
            continue;
          }

          // Get message body
          let content = '';
          if (messageDetail.data.payload.parts) {
            // Multipart message
            const textPart = messageDetail.data.payload.parts.find(part => 
              part.mimeType === 'text/html' || part.mimeType === 'text/plain'
            );
            if (textPart?.body?.data) {
              content = Buffer.from(textPart.body.data, 'base64').toString();
            }
          } else if (messageDetail.data.payload.body?.data) {
            // Simple message
            content = Buffer.from(messageDetail.data.payload.body.data, 'base64').toString();
          }

          // Sanitize content
          content = this.sanitizeMessageBody(content);

          // Determine direction (sent vs received)
          const direction = from?.includes(emailAccount) ? 'sent' : 'received';

          // Ingest into unified inbox
          await this.unifiedInboxService.ingestEmail({
            message_id_header: messageId,
            from_email: from,
            to_email: to,
            subject: subject,
            content_html: content.includes('<html>') ? content : null,
            content_plain: content.includes('<html>') ? null : content,
            sent_at: direction === 'sent' ? new Date(date).toISOString() : null,
            received_at: direction === 'received' ? new Date(date).toISOString() : null,
            in_reply_to: inReplyTo,
            message_references: references,
            gmail_message_id: msg.id,
            provider_type: 'gmail',
            sync_status: 'synced',
            organization_id: organizationId
          }, direction);

          console.log(`✅ Ingested new ${direction} email: ${subject?.substring(0, 40)}...`);

        } catch (msgError) {
          console.error('❌ Error processing recent message:', msgError.message);
        }
      }

    } catch (error) {
      console.error('❌ Error ingesting recent messages:', error.message);
    }
  }

  /**
   * Get Gmail client for a specific email account
   */
  async getGmailClient(email, organizationId) {
    try {
      // Get OAuth2 tokens for this email account
      const { data: tokenData, error } = await supabase
        .from('oauth2_tokens')
        .select('encrypted_tokens, email')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();

      if (error || !tokenData) {
        console.error(`❌ No OAuth2 tokens found for ${email}:`, error);
        return null;
      }

      // Parse encrypted tokens
      let tokens;
      try {
        tokens = JSON.parse(tokenData.encrypted_tokens);
      } catch (parseError) {
        console.error(`❌ Failed to parse tokens for ${email}:`, parseError);
        return null;
      }

      // Create OAuth2 client and set credentials
      const oauth2Client = this.oauth2Service.createOAuth2Client();
      oauth2Client.setCredentials(tokens);

      // Create Gmail API client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      console.log(`✅ Gmail client ready for reply monitoring: ${email}`);
      return gmail;
      
    } catch (error) {
      console.error(`❌ Error creating Gmail client for ${email}:`, error);
      return null;
    }
  }

  /**
   * Check for replies to a specific message
   * originalMessageId should be the actual Message-ID header (e.g., <CAAz6doV...@mail.gmail.com>)
   */
  async checkForReplies(originalMessageId, emailAccount, organizationId, scheduledEmailId, campaignId, leadId) {
    try {
      const gmail = await this.getGmailClient(emailAccount, organizationId);
      if (!gmail) {
        console.error(`❌ Could not get Gmail client for ${emailAccount}`);
        return [];
      }

      console.log(`📬 Checking for replies to message ${originalMessageId} in ${emailAccount}`);

      // Search for messages in the same thread that are not from us
      const query = `in:inbox -from:${emailAccount}`;
      
      console.log(`🔍 Gmail search query: "${query}"`);
      
      // Also check for recent emails in the last hour (for testing)
      const recentQuery = `newer_than:1h`;
      console.log(`🔍 Testing recent query: "${recentQuery}"`);
      
      const recentResponse = await gmail.users.messages.list({
        userId: 'me',
        q: recentQuery,
        maxResults: 10
      });
      
      console.log(`📧 Recent messages found: ${recentResponse.data.messages?.length || 0}`);
      
      // Ingest recent messages into unified inbox if any found
      if (recentResponse.data.messages && recentResponse.data.messages.length > 0) {
        console.log(`📥 Processing ${recentResponse.data.messages.length} recent messages for ingestion...`);
        await this.ingestRecentMessages(gmail, recentResponse.data.messages, emailAccount, organizationId);
      }
      
      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      console.log(`📧 Gmail search returned ${searchResponse.data.messages?.length || 0} messages`);

      if (!searchResponse.data.messages) {
        console.log(`📭 No messages found in inbox for ${emailAccount}`);
        return [];
      }

      const replies = [];
      
      // Check each message to see if it's a reply to our original message
      for (const message of searchResponse.data.messages) {
        try {
          const messageData = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = messageData.data.payload.headers;
          const inReplyTo = headers.find(h => h.name.toLowerCase() === 'in-reply-to')?.value;
          const references = headers.find(h => h.name.toLowerCase() === 'references')?.value;
          const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value;
          const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value;
          
          console.log(`📧 Checking message from: ${fromHeader}, subject: ${subjectHeader}`);
          console.log(`🔗 In-Reply-To: ${inReplyTo || 'none'}`);
          console.log(`🔗 References: ${references || 'none'}`);
          console.log(`🎯 Looking for original Message-ID: ${originalMessageId}`);
          
          // 🔥 ENHANCED: Proper Message-ID header matching
          // Now we have actual Message-ID headers (e.g., <CAAz6doV...@mail.gmail.com>)
          let isReply = false;
          
          if (originalMessageId && (originalMessageId.startsWith('<') && originalMessageId.endsWith('>'))) {
            // Exact Message-ID header matching (the proper way)
            isReply = (inReplyTo && inReplyTo.includes(originalMessageId)) || 
                     (references && references.includes(originalMessageId));
            console.log(`🎯 Using proper Message-ID header matching for: ${originalMessageId}`);
          } else {
            // Fallback for old Gmail API format (backward compatibility)
            console.log(`⚠️ Fallback: Gmail API ID format detected: ${originalMessageId}`);
            const syntheticMessageId = `<${originalMessageId}@mail.gmail.com>`;
            isReply = (inReplyTo && inReplyTo.includes(syntheticMessageId)) || 
                     (references && references.includes(syntheticMessageId));
            console.log(`🎯 Checking synthetic Message-ID: ${syntheticMessageId}`);
          }
          
          console.log(`📬 Is this a reply? ${isReply ? '✅ YES' : '❌ NO'}`);
          
          if (isReply) {
            const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value;
            
            // Extract message body with proper Unicode handling
            let messageBody = '';
            try {
              if (messageData.data.payload.body.data) {
                messageBody = Buffer.from(messageData.data.payload.body.data, 'base64').toString('utf-8');
              } else if (messageData.data.payload.parts) {
                // Handle multipart messages
                for (const part of messageData.data.payload.parts) {
                  if (part.mimeType === 'text/plain' && part.body.data) {
                    messageBody += Buffer.from(part.body.data, 'base64').toString('utf-8');
                  }
                }
              }
              
              // Sanitize message body to prevent JSON encoding issues
              messageBody = this.sanitizeMessageBody(messageBody);
              
            } catch (bodyError) {
              console.error(`❌ Error extracting message body:`, bodyError);
              messageBody = '[Error extracting message content]';
            }

            replies.push({
              messageId: messageData.data.id,
              threadId: messageData.data.threadId,
              from: this.sanitizeMessageBody(fromHeader || ''),
              subject: this.sanitizeMessageBody(subjectHeader || ''),
              body: messageBody,
              receivedAt: new Date(dateHeader || Date.now()),
              scheduledEmailId,
              campaignId,
              leadId,
              originalMessageId
            });

            console.log(`📬 Found reply from ${fromHeader} to message ${originalMessageId}`);
          }
        } catch (messageError) {
          console.error(`❌ Error processing message ${message.id}:`, messageError);
          continue;
        }
      }

      return replies;
      
    } catch (error) {
      console.error(`❌ Error checking for replies:`, error);
      return [];
    }
  }

  /**
   * Store reply in database
   */
  async storeReply(reply, organizationId, toEmail) {
    try {
      const { data, error } = await supabase
        .from('email_replies')
        .insert({
          scheduled_email_id: reply.scheduledEmailId,
          campaign_id: reply.campaignId,
          lead_id: reply.leadId,
          from_email: reply.from,
          to_email: toEmail,
          subject: reply.subject,
          message_body: reply.body,
          reply_message_id: reply.messageId,
          original_message_id: reply.originalMessageId,
          parent_message_id_header: reply.originalMessageId, // 🔥 NEW: Store actual Message-ID
          conversation_thread_id: reply.threadId, // 🔥 NEW: Store thread for conversations
          thread_id: reply.threadId,
          reply_received_at: reply.receivedAt,
          organization_id: organizationId
        });

      if (error) {
        console.error('❌ Error storing reply:', error);
        return false;
      }

      console.log(`✅ Reply stored successfully: ${reply.from} → ${toEmail}`);

      // 🔥 NEW: Ingest reply into unified inbox system
      try {
        await this.ingestReplyIntoUnifiedInbox(reply, organizationId, toEmail);
      } catch (unifiedInboxError) {
        console.error('⚠️ Error ingesting reply into unified inbox (non-fatal):', unifiedInboxError);
        // Don't fail the reply storage if unified inbox fails
      }

      // 🔥 HYBRID APPROACH: Proactively cancel scheduled follow-ups after reply detected
      try {
        await this.cancelFollowUpsAfterReply(reply, organizationId);
      } catch (cancelError) {
        console.error('⚠️ Error cancelling follow-ups after reply (non-fatal):', cancelError);
        // Don't fail the reply storage if cancellation fails
        // The send-time check will still catch this as a safety net
      }

      return true;

    } catch (error) {
      console.error('❌ Error in storeReply:', error);
      return false;
    }
  }

  /**
   * Cancel scheduled follow-ups after a reply is detected (Proactive Cancellation)
   * This is part of the hybrid approach - provides immediate cancellation
   * while the send-time check acts as a safety net
   */
  async cancelFollowUpsAfterReply(reply, organizationId) {
    try {
      console.log(`🔍 Checking for scheduled follow-ups to cancel for lead ${reply.leadId} in campaign ${reply.campaignId}`);

      // First check if the campaign has stopOnReply enabled
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('config')
        .eq('id', reply.campaignId)
        .eq('organization_id', organizationId)
        .single();

      if (!campaign?.config?.stopOnReply) {
        console.log('⚠️ Campaign does not have stopOnReply enabled, skipping cancellation');
        return;
      }

      console.log('✅ Campaign has stopOnReply enabled, proceeding with cancellation');

      // Cancel all scheduled follow-ups for this lead in this campaign
      // Only cancel follow-ups (sequence_step > 0), not initial emails
      // Use 'skipped' status (database constraint doesn't allow 'cancelled')
      const { data: cancelledEmails, error } = await supabase
        .from('scheduled_emails')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString()
        })
        .eq('campaign_id', reply.campaignId)
        .eq('lead_id', reply.leadId)
        .eq('status', 'scheduled')
        .gt('sequence_step', 0)
        .select('id, to_email, subject, send_at, sequence_step');

      if (error) {
        console.error('❌ Error cancelling follow-ups:', error);
        return;
      }

      if (!cancelledEmails || cancelledEmails.length === 0) {
        console.log('📭 No scheduled follow-ups found to cancel');
        return;
      }

      console.log(`✅ Proactively cancelled ${cancelledEmails.length} scheduled follow-up(s) after reply:`);
      cancelledEmails.forEach(email => {
        console.log(`   - Email ${email.id}: "${email.subject}" to ${email.to_email} (was scheduled for ${email.send_at})`);
      });

    } catch (error) {
      console.error('❌ Error in cancelFollowUpsAfterReply:', error);
      throw error;
    }
  }

  /**
   * Ingest reply into unified inbox system
   */
  async ingestReplyIntoUnifiedInbox(reply, organizationId, toEmail) {
    try {
      console.log(`📬 Ingesting reply into unified inbox: ${reply.from} → ${toEmail}`);

      // Prepare email data for unified inbox
      const emailData = {
        message_id_header: reply.messageId, // Gmail message ID (will be converted if needed)
        in_reply_to: reply.originalMessageId, // The Message-ID we're replying to
        message_references: reply.originalMessageId, // References chain
        thread_id: reply.threadId,
        from_email: reply.from,
        to_email: toEmail,
        subject: reply.subject,
        content_html: reply.body,
        content_plain: reply.body,
        received_at: reply.receivedAt,
        campaign_id: reply.campaignId,
        lead_id: reply.leadId,
        scheduled_email_id: reply.scheduledEmailId,
        organization_id: organizationId,
        provider: 'gmail'
      };

      // Ingest as received email
      const result = await this.unifiedInboxService.ingestEmail(emailData, 'received');
      
      console.log(`✅ Reply ingested into unified inbox - Conversation: ${result.conversation.id}`);
      return result;

    } catch (error) {
      console.error('❌ Error ingesting reply into unified inbox:', error);
      throw error;
    }
  }

  /**
   * Monitor all sent emails for replies
   */
  async monitorReplies() {
    try {
      console.log('📬 Starting reply monitoring...');

      // Get all sent emails from the last 7 days that we haven't checked for replies recently
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Query emails with Message-ID headers for proper reply detection
      console.log('✅ Using Message-ID header field for accurate reply detection');
      const { data: sentEmails, error } = await supabase
        .from('scheduled_emails')
        .select(`
          id, campaign_id, lead_id, email_account_id, from_email, to_email, 
          message_id, message_id_header, thread_id, organization_id, sent_at
        `)
        .eq('status', 'sent')
        .gte('sent_at', sevenDaysAgo.toISOString())
        .not('message_id_header', 'is', null);

      if (error) {
        console.error('❌ Error fetching sent emails:', error);
        return;
      }

      if (!sentEmails || sentEmails.length === 0) {
        console.log('📭 No sent emails to monitor for replies');
        return;
      }

      console.log(`📬 Monitoring ${sentEmails.length} sent emails for replies...`);

      // Group emails by email account ID for efficient processing
      const emailsByAccountId = {};
      sentEmails.forEach(email => {
        if (!emailsByAccountId[email.email_account_id]) {
          emailsByAccountId[email.email_account_id] = [];
        }
        emailsByAccountId[email.email_account_id].push(email);
      });

      // Process each email account
      for (const [accountId, emails] of Object.entries(emailsByAccountId)) {
        // Get organization ID (assuming all emails in the group have same org)
        const organizationId = emails[0].organization_id;
        
        // Get the actual email address for this account
        const emailAddress = await this.getEmailAddressFromAccountId(accountId, organizationId);
        if (!emailAddress) {
          console.error(`❌ Could not resolve email address for account ${accountId}`);
          continue;
        }
        
        console.log(`📬 Checking ${emails.length} emails for account ${emailAddress}`);

        for (const email of emails) {
          // Check if we already have a reply record for this email
          const { data: existingReply } = await supabase
            .from('email_replies')
            .select('id')
            .eq('scheduled_email_id', email.id)
            .single();

          if (existingReply) {
            // Already processed this email
            continue;
          }

          // Use Message-ID header for proper reply detection
          const messageIdToCheck = email.message_id_header;
          if (!messageIdToCheck) {
            console.log(`⚠️ No Message-ID header available for email ${email.id}, skipping reply check`);
            continue;
          }
          
          console.log(`🔍 Checking replies for email ${email.id} with Message-ID header: ${messageIdToCheck}`);
          
          const replies = await this.checkForReplies(
            messageIdToCheck,
            emailAddress,
            organizationId,
            email.id,
            email.campaign_id,
            email.lead_id
          );

          // Store any replies found
          for (const reply of replies) {
            await this.storeReply(reply, organizationId, emailAddress);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('✅ Reply monitoring completed');
      
    } catch (error) {
      console.error('❌ Error in monitorReplies:', error);
    }
  }

  /**
   * Get reply count for a campaign
   */
  async getCampaignReplyCount(campaignId, organizationId) {
    try {
      const { data: replies, error } = await supabase
        .from('email_replies')
        .select('id', { count: 'exact' })
        .eq('campaign_id', campaignId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ Error fetching reply count:', error);
        return 0;
      }

      return replies?.length || 0;
      
    } catch (error) {
      console.error('❌ Error in getCampaignReplyCount:', error);
      return 0;
    }
  }
}

module.exports = ReplyMonitoringService;