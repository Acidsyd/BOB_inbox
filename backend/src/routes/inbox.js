const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UnifiedInboxService = require('../services/UnifiedInboxService');
const FolderService = require('../services/FolderService');
const EmailSyncService = require('../services/EmailSyncService');
const SyncSchedulerService = require('../services/SyncSchedulerService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize services
const unifiedInboxService = new UnifiedInboxService();
const folderService = new FolderService();
const emailSyncService = new EmailSyncService();
const syncSchedulerService = new SyncSchedulerService();

// Helper function to create proper names from email addresses
function createProperName(email) {
  if (!email) return 'Unknown';
  
  // Known mappings for specific users
  const nameMap = {
    'gianpiero.difelice@gmail.com': 'Gianpiero Di Felice',
    'difelice@qquadro.com': 'Gianpiero Di Felice',
    'gianpierodfg@ophirstd.com': 'Gianpiero Di Felice',
    'gianpiero@vnext-it.com': 'Gianpiero Di Felice',
    'g.impact@fieraimpact.it': 'Gianpiero Impact',
    'gpr.impact@fieraimpact.com': 'Gianpiero Impact'
  };
  
  // Check if we have a specific mapping
  if (nameMap[email.toLowerCase()]) {
    return nameMap[email.toLowerCase()];
  }
  
  // Extract and format name from email
  const emailPrefix = email.split('@')[0];
  
  // Handle common patterns
  if (emailPrefix.includes('.')) {
    // "gianpiero.difelice" -> "Gianpiero Di Felice"
    return emailPrefix
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Single word: "gianpiero" -> "Gianpiero"
  return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase();
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

/**
 * GET /api/inbox/conversations
 * Get all conversations for the authenticated user's organization
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { 
      status = 'active',
      limit = 50,
      offset = 0,
      search = null,
      type = null,
      isRead = null,
      sender = null,
      dateFrom = null,
      dateTo = null,
      campaignId = null,
      labelIds = null,
      sortBy = 'last_activity_at',
      sortOrder = 'desc'
    } = req.query;

    // Process labelIds parameter (can be single value or array)
    let processedLabelIds = null;
    if (labelIds) {
      processedLabelIds = Array.isArray(labelIds) ? labelIds : [labelIds];
    }

    console.log(`📬 Fetching conversations for organization: ${organizationId} with filters:`, {
      status, search, type, isRead, sender, dateFrom, dateTo, campaignId, labelIds: processedLabelIds, sortBy, sortOrder
    });

    const conversations = await unifiedInboxService.getConversations(organizationId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
      search,
      conversationType: type,
      isRead: isRead !== null ? isRead === 'true' : null,
      sender,
      dateFrom,
      dateTo,
      campaignId,
      labelIds: processedLabelIds,
      sortBy,
      sortOrder
    });

    res.json({
      conversations,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: conversations.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: error.message 
    });
  }
});

/**
 * GET /api/inbox/conversations/:id/messages
 * Get all messages in a specific conversation
 */
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: conversationId } = req.params;
    const { timezone = 'UTC' } = req.query; // Allow timezone parameter from frontend

    console.log(`📬 Fetching messages for conversation: ${conversationId}`);

    const messages = await unifiedInboxService.getConversationMessages(conversationId, organizationId);

    // Convert UTC timestamps to user timezone (similar to campaign scheduled activity fix)
    const messagesWithTimezone = messages.map(message => {
      const convertedMessage = { ...message };

      // Convert sent_at timestamp if exists
      if (message.sent_at) {
        try {
          const sentAtDate = new Date(message.sent_at);
          convertedMessage.sent_at_display = sentAtDate.toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (error) {
          console.warn(`⚠️ Error converting sent_at timestamp: ${message.sent_at}`, error);
          convertedMessage.sent_at_display = message.sent_at; // Fallback to original
        }
      }

      // Convert received_at timestamp if exists
      if (message.received_at) {
        try {
          const receivedAtDate = new Date(message.received_at);
          convertedMessage.received_at_display = receivedAtDate.toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (error) {
          console.warn(`⚠️ Error converting received_at timestamp: ${message.received_at}`, error);
          convertedMessage.received_at_display = message.received_at; // Fallback to original
        }
      }

      return convertedMessage;
    });

    res.json({
      conversationId,
      messages: messagesWithTimezone
    });

  } catch (error) {
    console.error('❌ Error fetching conversation messages:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation messages',
      details: error.message
    });
  }
});

/**
 * PUT /api/inbox/conversations/:id/read
 * Mark conversation as read/unread
 */
router.put('/conversations/:id/read', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: conversationId } = req.params;
    const { isRead = true } = req.body;

    console.log(`📬 Marking conversation ${conversationId} as ${isRead ? 'read' : 'unread'}`);

    await unifiedInboxService.markConversationRead(conversationId, organizationId, isRead);

    res.json({
      success: true,
      conversationId,
      isRead
    });

  } catch (error) {
    console.error('❌ Error updating conversation read status:', error);
    res.status(500).json({ 
      error: 'Failed to update conversation read status',
      details: error.message 
    });
  }
});

/**
 * PUT /api/inbox/conversations/:id/archive
 * Archive/unarchive conversation
 */
router.put('/conversations/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: conversationId } = req.params;
    const { archived = true } = req.body;

    console.log(`📬 ${archived ? 'Archiving' : 'Unarchiving'} conversation ${conversationId}`);

    await unifiedInboxService.archiveConversation(conversationId, organizationId, archived);

    res.json({
      success: true,
      conversationId,
      archived
    });

  } catch (error) {
    console.error('❌ Error updating conversation archive status:', error);
    res.status(500).json({ 
      error: 'Failed to update conversation archive status',
      details: error.message 
    });
  }
});

/**
 * GET /api/inbox/stats
 * Get conversation statistics for the organization
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log(`📊 Fetching conversation stats for organization: ${organizationId}`);

    const stats = await unifiedInboxService.getConversationStats(organizationId);

    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching conversation stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversation stats',
      details: error.message 
    });
  }
});

/**
 * POST /api/inbox/conversations/bulk-action
 * Perform bulk actions on multiple conversations
 */
router.post('/conversations/bulk-action', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { conversationIds, action, value } = req.body;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({ error: 'conversationIds array is required' });
    }

    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    console.log(`📬 Bulk ${action} requested for ${conversationIds.length} conversations`);

    let result = {};

    switch (action) {
      case 'markRead':
        await unifiedInboxService.bulkMarkRead(conversationIds, organizationId, value !== false);
        result = { action: 'markRead', count: conversationIds.length, isRead: value !== false };
        break;
      
      case 'archive':
        await unifiedInboxService.bulkArchive(conversationIds, organizationId, value !== false);
        result = { action: 'archive', count: conversationIds.length, archived: value !== false };
        break;
      
      case 'delete':
        await unifiedInboxService.bulkDelete(conversationIds, organizationId);
        result = { action: 'delete', count: conversationIds.length };
        break;
      
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Error performing bulk action:', error);
    res.status(500).json({ 
      error: 'Failed to perform bulk action',
      details: error.message 
    });
  }
});

/**
 * POST /api/inbox/send
 * Send a new email (compose and send)
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { fromAccountId, to, cc, bcc, subject, html, text, attachments = [] } = req.body;

    // Validate required fields
    if (!fromAccountId || !to || !Array.isArray(to) || to.length === 0 || !subject || !html) {
      return res.status(400).json({
        error: 'fromAccountId, to (array), subject, and html are required'
      });
    }

    console.log(`📤 Sending new email from account ${fromAccountId} to ${to.join(', ')}`);

    // Get the sender email account details (check both email_accounts and oauth2_tokens)
    let emailAccount = null;
    
    // Try email_accounts first (SMTP)
    const { data: smtpAccount } = await supabase
      .from('email_accounts')
      .select('email, display_name')
      .eq('id', fromAccountId)
      .eq('organization_id', organizationId)
      .single();
    
    if (smtpAccount) {
      emailAccount = smtpAccount;
      console.log(`📤 Using SMTP account: ${emailAccount.email}`);
    } else {
      // Try oauth2_tokens (Gmail/OAuth2)
      const { data: oauthAccount } = await supabase
        .from('oauth2_tokens')
        .select('email, id')
        .eq('id', fromAccountId)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();
      
      if (oauthAccount) {
        emailAccount = {
          email: oauthAccount.email,
          display_name: oauthAccount.email // Use email as display name for OAuth accounts
        };
        console.log(`📤 Using OAuth2 account: ${emailAccount.email}`);
      }
    }

    if (!emailAccount) {
      console.error('❌ Email account not found for ID:', fromAccountId);
      return res.status(400).json({ error: 'Email account not found' });
    }

    // Send the email using EmailService
    const EmailService = require('../services/EmailService');
    const emailService = new EmailService();
    
    const emailData = {
      accountId: fromAccountId,
      organizationId,
      to: to, // All recipients (array)
      cc: cc && cc.length > 0 ? cc : undefined,
      bcc: bcc && bcc.length > 0 ? bcc : undefined,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      attachments: attachments && attachments.length > 0 ? attachments : undefined
    };

    const result = await emailService.sendEmail(emailData);

    if (result.success) {
      console.log(`✅ Email sent successfully with Message-ID: ${result.messageId}`);
      
      res.json({
        success: true,
        messageId: result.messageId,
        from: emailAccount.email,
        to: to,
        subject: subject
      });
    } else {
      throw new Error(result.error || 'Failed to send email');
    }

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

/**
 * POST /api/inbox/conversations/:id/reply
 * Send a reply to a conversation (future implementation)
 */
router.post('/conversations/:id/reply', authenticateToken, async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { id: conversationId } = req.params;
    const { content, html, fromAccountId, attachments = [] } = req.body;

    if (!content || !fromAccountId) {
      return res.status(400).json({
        error: 'Content and fromAccountId are required'
      });
    }

    console.log(`📬 Sending reply to conversation ${conversationId}`);

    // Get conversation details to find the recipient
    const conversation = await unifiedInboxService.getConversationDetails(conversationId, organizationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get conversation messages to find reply target
    const messages = await unifiedInboxService.getConversationMessages(conversationId, organizationId);
    console.log(`📬 Found ${messages.length} messages in conversation`);
    
    // Try to find the last received message to reply to, or fall back to any message for threading
    let lastReceivedMessage = messages.find(m => m.direction === 'received');
    let threadingReference = lastReceivedMessage || messages[messages.length - 1]; // Use last message for threading
    let replyToEmail = null;
    
    if (lastReceivedMessage) {
      replyToEmail = lastReceivedMessage.from_email;
      console.log(`📬 Replying to received message from: ${replyToEmail}`);
    } else {
      // If no received message, this might be a conversation where we sent to someone
      // Use the participants to determine who to reply to
      if (conversation.participants && conversation.participants.length > 0) {
        // Find a participant that's not our own email
        const senderAccount = await supabase
          .from('email_accounts')
          .select('email')
          .eq('id', fromAccountId)
          .eq('organization_id', organizationId)
          .single();
        
        if (senderAccount.data) {
          const ourEmail = senderAccount.data.email;
          replyToEmail = conversation.participants.find(p => 
            !p.toLowerCase().includes(ourEmail.toLowerCase()) && 
            p.includes('@')
          );
        }
        
        // If still no recipient, try to extract from any message's to_email
        if (!replyToEmail && messages.length > 0) {
          const firstMessage = messages[0];
          if (firstMessage.direction === 'sent' && firstMessage.to_email) {
            replyToEmail = firstMessage.to_email;
          }
        }
      }
      
      if (!replyToEmail) {
        console.error('❌ Cannot determine reply recipient:', {
          conversation: conversation.subject,
          participants: conversation.participants,
          messageCount: messages.length
        });
        return res.status(400).json({ 
          error: 'Cannot determine who to reply to. This conversation may not have a clear recipient.',
          details: 'No received messages found and unable to extract recipient from conversation participants'
        });
      }
      
      console.log(`📬 No received message found, replying to participant: ${replyToEmail}`);
    }

    // Get the sender email account details (check both email_accounts and oauth2_tokens)
    let emailAccount = null;
    
    // Try email_accounts first
    const { data: smtpAccount } = await supabase
      .from('email_accounts')
      .select('email, display_name')
      .eq('id', fromAccountId)
      .eq('organization_id', organizationId)
      .single();
    
    if (smtpAccount) {
      emailAccount = smtpAccount;
      console.log(`📬 Found SMTP account: ${emailAccount.email}`);
    } else {
      // Try oauth2_tokens
      const { data: oauthAccount } = await supabase
        .from('oauth2_tokens')
        .select('email, id')
        .eq('id', fromAccountId)
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account')
        .single();
      
      if (oauthAccount) {
        emailAccount = {
          email: oauthAccount.email,
          display_name: oauthAccount.email // Use email as display name for OAuth accounts
        };
        console.log(`📬 Found OAuth2 account: ${emailAccount.email}`);
      }
    }

    if (!emailAccount) {
      console.error('❌ Email account not found for ID:', fromAccountId);
      return res.status(400).json({ error: 'Email account not found' });
    }

    console.log(`📬 Using sender email: ${emailAccount.email}`);

    // Send the reply using EmailService
    const EmailService = require('../services/EmailService');
    const emailService = new EmailService();
    
    const subject = conversation.subject || 'No subject';
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    
    const emailData = {
      accountId: fromAccountId,
      organizationId,
      to: replyToEmail,
      subject: replySubject,
      html: html || content, // Use HTML content if provided, otherwise use plain content
      text: content, // Use plain text content for text version
      inReplyTo: threadingReference?.message_id_header,
      references: threadingReference?.message_references || threadingReference?.message_id_header,
      threadId: threadingReference?.provider_thread_id, // Add Gmail thread ID for proper threading
      attachments // Pass attachments to EmailService
    };

    const result = await emailService.sendReply(emailData);

    if (result.success) {
      // Ingest the sent reply directly into the original conversation
      console.log(`📬 Ingesting reply directly into conversation: ${conversationId}`);
      
      await unifiedInboxService.ingestEmailIntoConversation({
        message_id_header: result.messageId,
        from_email: result.fromEmail || emailAccount.email, // Use actual sender email from account
        from_name: emailAccount.display_name || createProperName(emailAccount.email),
        to_email: replyToEmail,
        subject: emailData.subject,
        content_html: html || emailData.html, // Store the rich HTML content
        content_plain: content, // Store the plain text content
        sent_at: new Date().toLocaleString('sv-SE').replace(' ', 'T') + 'Z', // Store local time as ISO format
        in_reply_to: threadingReference?.message_id_header, // Critical for threading
        message_references: threadingReference?.message_references || threadingReference?.message_id_header,
        organization_id: organizationId
      }, conversationId, 'sent');

      res.json({
        success: true,
        messageId: result.messageId,
        conversationId
      });
    } else {
      throw new Error(result.error || 'Failed to send email');
    }

  } catch (error) {
    console.error('❌ Error sending reply:', error);
    res.status(500).json({ 
      error: 'Failed to send reply',
      details: error.message 
    });
  }
});

/**
 * GET /api/inbox/search
 * Search conversations by content
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    console.log(`🔍 Searching conversations for: "${query}"`);

    const conversations = await unifiedInboxService.getConversations(organizationId, {
      search: query,
      limit: parseInt(limit),
      status: 'all'
    });

    res.json({
      query,
      results: conversations,
      count: conversations.length
    });

  } catch (error) {
    console.error('❌ Error searching conversations:', error);
    res.status(500).json({ 
      error: 'Failed to search conversations',
      details: error.message 
    });
  }
});

// ============================================================================
// LABEL MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/inbox/labels
 * Get all labels for the authenticated user's organization
 */
router.get('/labels', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log(`🏷️ Fetching labels for organization: ${organizationId}`);

    const { data: labels, error } = await supabase
      .from('conversation_labels')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) throw error;

    res.json({
      labels: labels || []
    });

  } catch (error) {
    console.error('❌ Error fetching labels:', error);
    res.status(500).json({ 
      error: 'Failed to fetch labels',
      details: error.message 
    });
  }
});

/**
 * POST /api/inbox/labels
 * Create a new label
 */
router.post('/labels', authenticateToken, async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { name, color = '#3B82F6', description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Label name is required'
      });
    }

    if (name.length > 50) {
      return res.status(400).json({
        error: 'Label name must be 50 characters or less'
      });
    }

    console.log(`🏷️ Creating label: ${name} for organization: ${organizationId}`);

    const { data: label, error } = await supabase
      .from('conversation_labels')
      .insert([{
        organization_id: organizationId,
        name: name.trim(),
        color: color,
        description: description?.trim() || null
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          error: 'A label with this name already exists'
        });
      }
      throw error;
    }

    res.status(201).json({
      label
    });

  } catch (error) {
    console.error('❌ Error creating label:', error);
    res.status(500).json({ 
      error: 'Failed to create label',
      details: error.message 
    });
  }
});

/**
 * PUT /api/inbox/labels/:id
 * Update an existing label
 */
router.put('/labels/:id', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: labelId } = req.params;
    const { name, color, description } = req.body;

    console.log(`🏷️ Updating label: ${labelId}`);

    const updates = {};
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Label name cannot be empty'
        });
      }
      if (name.length > 50) {
        return res.status(400).json({
          error: 'Label name must be 50 characters or less'
        });
      }
      updates.name = name.trim();
    }
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description?.trim() || null;

    const { data: label, error } = await supabase
      .from('conversation_labels')
      .update(updates)
      .eq('id', labelId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          error: 'A label with this name already exists'
        });
      }
      throw error;
    }

    if (!label) {
      return res.status(404).json({
        error: 'Label not found'
      });
    }

    res.json({
      label
    });

  } catch (error) {
    console.error('❌ Error updating label:', error);
    res.status(500).json({ 
      error: 'Failed to update label',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/inbox/labels/:id
 * Delete a label and all its assignments
 */
router.delete('/labels/:id', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: labelId } = req.params;

    console.log(`🏷️ Deleting label: ${labelId}`);

    const { data: label, error } = await supabase
      .from('conversation_labels')
      .delete()
      .eq('id', labelId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    if (!label) {
      return res.status(404).json({
        error: 'Label not found'
      });
    }

    res.json({
      success: true,
      deletedLabel: label
    });

  } catch (error) {
    console.error('❌ Error deleting label:', error);
    res.status(500).json({ 
      error: 'Failed to delete label',
      details: error.message 
    });
  }
});

/**
 * GET /api/inbox/conversations/:id/labels
 * Get all labels for a specific conversation
 */
router.get('/conversations/:id/labels', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: conversationId } = req.params;

    console.log(`🏷️ Fetching labels for conversation: ${conversationId}`);

    const { data: assignments, error } = await supabase
      .from('conversation_label_assignments')
      .select(`
        *,
        conversation_labels (*)
      `)
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    const labels = assignments?.map(assignment => assignment.conversation_labels) || [];

    res.json({
      conversationId,
      labels
    });

  } catch (error) {
    console.error('❌ Error fetching conversation labels:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversation labels',
      details: error.message 
    });
  }
});

/**
 * POST /api/inbox/conversations/:id/labels
 * Add labels to a conversation
 */
router.post('/conversations/:id/labels', authenticateToken, async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { id: conversationId } = req.params;
    const { labelIds } = req.body;

    if (!Array.isArray(labelIds) || labelIds.length === 0) {
      return res.status(400).json({
        error: 'labelIds array is required'
      });
    }

    console.log(`🏷️ Adding ${labelIds.length} labels to conversation: ${conversationId}`);

    // Verify conversation belongs to organization
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single();

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    // Check for existing assignments to avoid conflicts
    const { data: existingAssignments } = await supabase
      .from('conversation_label_assignments')
      .select('label_id')
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .in('label_id', labelIds);

    const existingLabelIds = existingAssignments?.map(a => a.label_id) || [];
    const newLabelIds = labelIds.filter(id => !existingLabelIds.includes(id));

    let createdAssignments = [];
    
    // Only insert new assignments
    if (newLabelIds.length > 0) {
      const assignments = newLabelIds.map(labelId => ({
        conversation_id: conversationId,
        label_id: labelId,
        organization_id: organizationId,
        assigned_by: userId
      }));

      const { data, error } = await supabase
        .from('conversation_label_assignments')
        .insert(assignments)
        .select(`
          *,
          conversation_labels (*)
        `);

      if (error) {
        throw error;
      }
      
      createdAssignments = data || [];
    }

    const labels = createdAssignments?.map(assignment => assignment.conversation_labels) || [];

    res.status(201).json({
      conversationId,
      addedLabels: labels,
      count: labels.length
    });

  } catch (error) {
    console.error('❌ Error adding labels to conversation:', error);
    res.status(500).json({ 
      error: 'Failed to add labels to conversation',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/inbox/conversations/:id/labels/:labelId
 * Remove a label from a conversation
 */
router.delete('/conversations/:id/labels/:labelId', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: conversationId, labelId } = req.params;

    console.log(`🏷️ Removing label ${labelId} from conversation: ${conversationId}`);

    const { data: assignments, error } = await supabase
      .from('conversation_label_assignments')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('label_id', labelId)
      .eq('organization_id', organizationId)
      .select();

    if (error) throw error;

    // If no assignments were deleted, the label wasn't assigned (which is fine)
    if (!assignments || assignments.length === 0) {
      console.log(`⚠️ Label ${labelId} was not assigned to conversation ${conversationId} (already removed or never assigned)`);
    }

    res.json({
      success: true,
      conversationId,
      removedLabelId: labelId
    });

  } catch (error) {
    console.error('❌ Error removing label from conversation:', error);
    res.status(500).json({ 
      error: 'Failed to remove label from conversation',
      details: error.message 
    });
  }
});

/**
 * PUT /api/inbox/conversations/bulk-label
 * Bulk add/remove labels from multiple conversations
 */
router.put('/conversations/bulk-label', authenticateToken, async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { conversationIds, labelIds, action = 'add' } = req.body;

    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        error: 'conversationIds array is required'
      });
    }

    if (!Array.isArray(labelIds) || labelIds.length === 0) {
      return res.status(400).json({
        error: 'labelIds array is required'
      });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({
        error: 'action must be "add" or "remove"'
      });
    }

    console.log(`🏷️ Bulk ${action} ${labelIds.length} labels for ${conversationIds.length} conversations`);

    let result = {};

    if (action === 'add') {
      // Create all possible combinations of conversation + label assignments
      const assignments = [];
      for (const conversationId of conversationIds) {
        for (const labelId of labelIds) {
          assignments.push({
            conversation_id: conversationId,
            label_id: labelId,
            organization_id: organizationId,
            assigned_by: userId
          });
        }
      }

      const { data: createdAssignments, error } = await supabase
        .from('conversation_label_assignments')
        .insert(assignments)
        .select();

      if (error && error.code !== '23505') { // Ignore duplicate key violations
        throw error;
      }

      result = {
        action: 'add',
        conversationCount: conversationIds.length,
        labelCount: labelIds.length,
        assignmentsCreated: createdAssignments?.length || 0
      };

    } else if (action === 'remove') {
      const { data: deletedAssignments, error } = await supabase
        .from('conversation_label_assignments')
        .delete()
        .in('conversation_id', conversationIds)
        .in('label_id', labelIds)
        .eq('organization_id', organizationId)
        .select();

      if (error) throw error;

      result = {
        action: 'remove',
        conversationCount: conversationIds.length,
        labelCount: labelIds.length,
        assignmentsRemoved: deletedAssignments?.length || 0
      };
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Error performing bulk label operation:', error);
    res.status(500).json({ 
      error: 'Failed to perform bulk label operation',
      details: error.message 
    });
  }
});

// ============================================================================
// FOLDER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/inbox/folders
 * Get all system folders with counts for the authenticated user's organization
 */
router.get('/folders', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log(`📁 Fetching folders with counts for organization: ${organizationId}`);

    const folders = await folderService.getFoldersWithCounts(organizationId);

    res.json({
      folders: folders || []
    });

  } catch (error) {
    console.error('❌ Error fetching folders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch folders',
      details: error.message 
    });
  }
});

/**
 * GET /api/inbox/folders/:type/conversations
 * Get conversations for a specific folder type
 */
router.get('/folders/:type/conversations', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { type: folderType } = req.params;
    
    // DEBUG: Log request details
    console.log('🐛 DEBUG AUTH:', {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      folderType,
      queryParams: req.query,
      hasLabelIds: !!req.query.labelIds,
      labelIds: req.query.labelIds
    });
    const { 
      limit = 50,
      offset = 0,
      search = null,
      unreadOnly = false,
      labelIds = null
    } = req.query;

    // Process labelIds parameter (can be single value or array)
    let processedLabelIds = null;
    if (labelIds) {
      processedLabelIds = Array.isArray(labelIds) ? labelIds : [labelIds];
    }

    console.log(`📂 Fetching conversations for folder: ${folderType}`);

    // Validate folder type
    const validTypes = ['inbox', 'sent', 'untracked_replies', 'bounces'];
    if (!validTypes.includes(folderType)) {
      return res.status(400).json({
        error: `Invalid folder type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const conversations = await folderService.getConversationsForFolder(
      organizationId, 
      folderType, 
      {
        limit: parseInt(limit),
        offset: parseInt(offset),
        search,
        unreadOnly: unreadOnly === 'true',
        labelIds: processedLabelIds
      }
    );

    res.json({
      folderType,
      conversations: conversations || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: conversations?.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching folder conversations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch folder conversations',
      details: error.message 
    });
  }
});

/**
 * GET /api/inbox/folders/stats
 * Get folder statistics for the organization
 */
router.get('/folders/stats', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log(`📊 Getting folder statistics for organization: ${organizationId}`);

    const stats = await folderService.getFolderStatistics(organizationId);

    res.json(stats);

  } catch (error) {
    console.error('❌ Error getting folder statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get folder statistics',
      details: error.message 
    });
  }
});

// ============================================================================
// EMAIL SYNC ENDPOINTS
// ============================================================================

/**
 * POST /api/inbox/sync/manual
 * Trigger manual sync for all email accounts
 */
router.post('/sync/manual', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { accountId } = req.body;

    console.log('🔄 Manual sync triggered by user for organization:', organizationId);

    if (accountId) {
      // Sync specific account
      console.log('📧 Syncing specific account:', accountId);
      const result = await emailSyncService.syncAccount(accountId, organizationId);
      
      res.json({
        success: true,
        syncType: 'single_account',
        accountId,
        result,
        timestamp: new Date().toISOString()
      });
    } else {
      // Sync all accounts for the organization
      console.log('📧 Syncing all accounts for organization');
      
      // Get all email accounts for the organization
      const { data: accounts, error } = await supabase
        .from('oauth2_tokens')
        .select('id, email, provider')
        .eq('organization_id', organizationId)
        .eq('status', 'linked_to_account');

      if (error) throw error;

      const syncResults = [];
      
      if (accounts && accounts.length > 0) {
        for (const account of accounts) {
          try {
            const result = await emailSyncService.syncAccount(account.id, organizationId);
            syncResults.push({
              accountId: account.id,
              email: account.email,
              provider: account.provider,
              ...result
            });
          } catch (syncError) {
            console.error(`⚠️ Sync failed for account ${account.email}:`, syncError.message);
            syncResults.push({
              accountId: account.id,
              email: account.email,
              provider: account.provider,
              success: false,
              error: syncError.message
            });
          }
        }
      }

      res.json({
        success: true,
        syncType: 'all_accounts',
        accountCount: accounts?.length || 0,
        results: syncResults,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    res.status(500).json({ 
      error: 'Manual sync failed',
      details: error.message 
    });
  }
});

/**
 * GET /api/inbox/sync/status
 * Get sync status for the organization
 */
router.get('/sync/status', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log('📊 Getting sync status for organization:', organizationId);

    const syncStatus = await emailSyncService.getSyncStatus(organizationId);

    res.json({
      syncStatus: syncStatus || {
        organizationId,
        totalMessages: 0,
        providerSummary: {},
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      details: error.message 
    });
  }
});

/**
 * POST /api/inbox/sync/read-status
 * Sync read/unread status with email provider
 */
router.post('/sync/read-status', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { messageId, isRead, provider } = req.body;

    if (!messageId || typeof isRead !== 'boolean' || !provider) {
      return res.status(400).json({
        error: 'messageId, isRead (boolean), and provider are required'
      });
    }

    console.log(`📖 Syncing read status: ${isRead ? 'READ' : 'UNREAD'} for message: ${messageId}`);

    const result = await emailSyncService.syncMessageReadStatus(messageId, isRead, provider);

    res.json({
      success: result.success,
      messageId,
      isRead,
      provider,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Read status sync failed:', error);
    res.status(500).json({ 
      error: 'Read status sync failed',
      details: error.message 
    });
  }
});

// ============================================================================
// BIDIRECTIONAL SYNC ENDPOINTS - App ↔ Provider sync
// ============================================================================

/**
 * POST /api/inbox/messages/:messageId/read
 * Mark message as read with provider sync (bidirectional)
 */
router.post('/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { messageId } = req.params;

    console.log(`📖 Marking message READ with provider sync: ${messageId}`);

    const result = await emailSyncService.markMessageReadInProvider(
      messageId, 
      organizationId, 
      true
    );

    res.json({
      success: true,
      action: 'mark_read',
      messageId,
      provider: result.provider,
      syncedAt: result.syncedAt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Mark read with provider sync failed:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as read',
      details: error.message,
      messageId: req.params.messageId
    });
  }
});

/**
 * POST /api/inbox/messages/:messageId/unread
 * Mark message as unread with provider sync (bidirectional)
 */
router.post('/messages/:messageId/unread', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { messageId } = req.params;

    console.log(`📖 Marking message UNREAD with provider sync: ${messageId}`);

    const result = await emailSyncService.markMessageReadInProvider(
      messageId, 
      organizationId, 
      false
    );

    res.json({
      success: true,
      action: 'mark_unread',
      messageId,
      provider: result.provider,
      syncedAt: result.syncedAt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Mark unread with provider sync failed:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as unread',
      details: error.message,
      messageId: req.params.messageId
    });
  }
});

/**
 * POST /api/inbox/conversations/:conversationId/read
 * Mark all messages in conversation as read with provider sync (bulk operation)
 */
router.post('/conversations/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { conversationId } = req.params;

    console.log(`📖 Marking conversation READ with provider sync: ${conversationId}`);

    // Get all messages in conversation
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('id, provider_message_id, is_read')
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'Conversation not found or no messages' });
    }

    // Mark all unread messages as read
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      alreadyRead: 0
    };

    for (const message of messages) {
      if (message.is_read) {
        results.alreadyRead++;
        continue;
      }

      try {
        await emailSyncService.markMessageReadInProvider(
          message.id, 
          organizationId, 
          true
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ messageId: message.id, error: error.message });
        console.error('⚠️ Failed to mark message as read:', message.id, error.message);
      }
    }

    res.json({
      success: true,
      action: 'mark_conversation_read',
      conversationId,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Mark conversation read with provider sync failed:', error);
    res.status(500).json({ 
      error: 'Failed to mark conversation as read',
      details: error.message,
      conversationId: req.params.conversationId
    });
  }
});

/**
 * GET /api/inbox/provider-capabilities/:accountId
 * Get provider sync capabilities for an account
 */
router.get('/provider-capabilities/:accountId', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { accountId } = req.params;

    console.log(`🔧 Getting provider capabilities for account: ${accountId}`);

    // Get account with capabilities
    const account = await emailSyncService.getAccountWithCapabilities(accountId, organizationId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const ProviderFactory = require('../services/providers/ProviderFactory');
    const capabilities = ProviderFactory.getProviderCapabilities(account.provider);

    res.json({
      accountId,
      email: account.email,
      provider: account.provider,
      capabilities,
      lastSyncAt: account.last_sync_at,
      syncCapable: account.syncCapable
    });

  } catch (error) {
    console.error('❌ Failed to get provider capabilities:', error);
    res.status(500).json({ 
      error: 'Failed to get provider capabilities',
      details: error.message,
      accountId: req.params.accountId
    });
  }
});

// ============================================================================
// SYNC MONITORING ENDPOINTS - Enhanced observability for universal sync system
// ============================================================================

/**
 * GET /api/inbox/sync/history
 * Get sync history for monitoring and debugging
 */
router.get('/sync/history', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { limit = 20, offset = 0, status = null, provider = null } = req.query;

    console.log('📊 Fetching sync history for organization:', organizationId);

    let query = supabase
      .from('email_sync_history')
      .select(`
        id, account_id, provider, sync_type, status,
        messages_processed, new_messages, updated_messages,
        duration_ms, error_message, started_at, completed_at,
        created_at
      `)
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data: history, error } = await query;

    if (error) {
      throw error;
    }

    console.log(`✅ Retrieved ${history.length} sync history entries`);

    res.json({
      success: true,
      history,
      pagination: {
        offset,
        limit,
        total: history.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sync history:', error);
    res.status(500).json({
      error: 'Failed to fetch sync history',
      details: error.message
    });
  }
});

/**
 * GET /api/inbox/sync/stats
 * Get sync statistics and health metrics
 */
router.get('/sync/stats', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { timeframe = '24h' } = req.query;

    console.log(`📊 Fetching sync stats for organization: ${organizationId}, timeframe: ${timeframe}`);

    // Calculate time range
    let timeRangeQuery = '';
    const now = new Date();
    switch (timeframe) {
      case '1h':
        timeRangeQuery = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        break;
      case '24h':
        timeRangeQuery = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        timeRangeQuery = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        timeRangeQuery = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        timeRangeQuery = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }

    // Get sync statistics
    const { data: stats } = await supabase
      .from('email_sync_history')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('started_at', timeRangeQuery);

    // Calculate metrics
    const totalSyncs = stats?.length || 0;
    const successfulSyncs = stats?.filter(s => s.status === 'completed').length || 0;
    const failedSyncs = stats?.filter(s => s.status === 'failed').length || 0;
    const totalMessages = stats?.reduce((sum, s) => sum + (s.messages_processed || 0), 0) || 0;
    const newMessages = stats?.reduce((sum, s) => sum + (s.new_messages || 0), 0) || 0;
    const avgDuration = stats?.length > 0 
      ? stats.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / stats.length
      : 0;

    // Get provider breakdown
    const providerStats = {};
    stats?.forEach(s => {
      if (!providerStats[s.provider]) {
        providerStats[s.provider] = {
          total: 0,
          successful: 0,
          failed: 0,
          messages: 0
        };
      }
      providerStats[s.provider].total++;
      if (s.status === 'completed') providerStats[s.provider].successful++;
      if (s.status === 'failed') providerStats[s.provider].failed++;
      providerStats[s.provider].messages += s.messages_processed || 0;
    });

    // Get recent errors
    const recentErrors = stats?.filter(s => s.status === 'failed' && s.error_message)
      .slice(0, 10)
      .map(s => ({
        provider: s.provider,
        error: s.error_message,
        timestamp: s.started_at
      })) || [];

    const syncStats = {
      timeframe,
      summary: {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs * 100).toFixed(1) : 0,
        totalMessages,
        newMessages,
        avgDuration: Math.round(avgDuration)
      },
      providers: providerStats,
      recentErrors,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Sync stats calculated:', syncStats.summary);

    res.json({
      success: true,
      stats: syncStats
    });

  } catch (error) {
    console.error('❌ Error fetching sync stats:', error);
    res.status(500).json({
      error: 'Failed to fetch sync stats',
      details: error.message
    });
  }
});

/**
 * GET /api/inbox/sync/accounts
 * Get sync status for all email accounts
 */
router.get('/sync/accounts', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;

    console.log('📧 Fetching sync account status for organization:', organizationId);

    // Get all OAuth2 accounts
    const { data: oauthAccounts } = await supabase
      .from('oauth2_tokens')
      .select(`
        id, email, provider, status, 
        last_sync_at, provider_capabilities,
        created_at
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'linked_to_account');

    // Get all SMTP accounts  
    const { data: smtpAccounts } = await supabase
      .from('email_accounts')
      .select(`
        id, email, provider,
        created_at
      `)
      .eq('organization_id', organizationId);

    // Get recent sync status for each account
    const accountsWithStatus = [];

    for (const account of (oauthAccounts || [])) {
      // Get last sync result
      const { data: lastSync } = await supabase
        .from('email_sync_history')
        .select('status, messages_processed, started_at, duration_ms, error_message')
        .eq('account_id', account.id)
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      const capabilities = account.provider_capabilities || {};
      
      accountsWithStatus.push({
        id: account.id,
        email: account.email,
        provider: account.provider,
        type: 'oauth2',
        syncCapable: true,
        bidirectionalSync: capabilities.bidirectional_sync || false,
        lastSyncAt: account.last_sync_at,
        lastSyncStatus: lastSync?.status || 'never',
        lastSyncMessages: lastSync?.messages_processed || 0,
        lastSyncDuration: lastSync?.duration_ms || 0,
        lastSyncError: lastSync?.error_message || null,
        createdAt: account.created_at
      });
    }

    for (const account of (smtpAccounts || [])) {
      accountsWithStatus.push({
        id: account.id,
        email: account.email,
        provider: account.provider,
        type: 'smtp',
        syncCapable: false,
        bidirectionalSync: false,
        lastSyncAt: null,
        lastSyncStatus: 'not_supported',
        createdAt: account.created_at
      });
    }

    console.log(`✅ Retrieved sync status for ${accountsWithStatus.length} accounts`);

    res.json({
      success: true,
      accounts: accountsWithStatus
    });

  } catch (error) {
    console.error('❌ Error fetching sync account status:', error);
    res.status(500).json({
      error: 'Failed to fetch sync account status',
      details: error.message
    });
  }
});

/**
 * POST /api/inbox/sync/test/:accountId
 * Test sync capabilities for a specific account
 */
router.post('/sync/test/:accountId', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { accountId } = req.params;

    console.log(`🧪 Testing sync capabilities for account: ${accountId}`);

    // Test the sync
    const syncResult = await emailSyncService.syncAccount(accountId, organizationId);
    
    console.log('✅ Sync test completed:', syncResult);

    res.json({
      success: true,
      testResult: syncResult
    });

  } catch (error) {
    console.error('❌ Sync test failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Sync test failed',
      details: error.message,
      accountId
    });
  }
});

// ============================================================================
// SMART SYNC SCHEDULER ENDPOINTS
// ============================================================================

/**
 * POST /api/inbox/sync/auto/start
 * Start automatic sync for organization
 */
router.post('/sync/auto/start', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    
    console.log(`🚀 Starting automatic sync for organization: ${organizationId}`);
    
    const result = await syncSchedulerService.startOrganizationSync(organizationId);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Automatic sync started for ${result.accountsStarted}/${result.totalAccounts} accounts`,
        ...result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to start automatic sync'
      });
    }
    
  } catch (error) {
    console.error('❌ Error starting automatic sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start automatic sync',
      details: error.message
    });
  }
});

/**
 * POST /api/inbox/sync/auto/stop
 * Stop automatic sync for organization
 */
router.post('/sync/auto/stop', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    
    console.log(`⏹️ Stopping automatic sync for organization: ${organizationId}`);
    
    const result = syncSchedulerService.stopOrganizationSync(organizationId);
    
    res.json({
      success: true,
      message: `Automatic sync stopped for ${result.accountsStopped} accounts`,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Error stopping automatic sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop automatic sync',
      details: error.message
    });
  }
});

/**
 * POST /api/inbox/sync/auto/account/:accountId/start
 * Start automatic sync for specific account
 */
router.post('/sync/auto/account/:accountId/start', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { accountId } = req.params;
    
    console.log(`🚀 Starting automatic sync for account: ${accountId}`);
    
    const started = await syncSchedulerService.startAccountSync(accountId, organizationId);
    
    if (started) {
      res.json({
        success: true,
        message: `Automatic sync started for account ${accountId}`,
        accountId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to start automatic sync for account',
        accountId
      });
    }
    
  } catch (error) {
    console.error('❌ Error starting account sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start account sync',
      details: error.message,
      accountId: req.params.accountId
    });
  }
});

/**
 * POST /api/inbox/sync/auto/account/:accountId/stop
 * Stop automatic sync for specific account
 */
router.post('/sync/auto/account/:accountId/stop', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    console.log(`⏹️ Stopping automatic sync for account: ${accountId}`);
    
    const stopped = syncSchedulerService.stopAccountSync(accountId);
    
    if (stopped) {
      res.json({
        success: true,
        message: `Automatic sync stopped for account ${accountId}`,
        accountId
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Account ${accountId} was not running automatic sync`,
        accountId
      });
    }
    
  } catch (error) {
    console.error('❌ Error stopping account sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop account sync',
      details: error.message,
      accountId: req.params.accountId
    });
  }
});

/**
 * GET /api/inbox/sync/auto/status
 * Get current automatic sync status
 */
router.get('/sync/auto/status', authenticateToken, async (req, res) => {
  try {
    const status = syncSchedulerService.getSyncStatus();
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message
    });
  }
});

/**
 * GET /api/inbox/sync/auto/health
 * Get sync scheduler health status
 */
router.get('/sync/auto/health', authenticateToken, async (req, res) => {
  try {
    const health = syncSchedulerService.getHealthStatus();
    
    // Set appropriate HTTP status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      ...health
    });
    
  } catch (error) {
    console.error('❌ Error getting sync health:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Failed to get sync health',
      details: error.message
    });
  }
});

/**
 * GET /api/inbox/sync/auto/intervals
 * Get current sync intervals configuration
 */
router.get('/sync/auto/intervals', authenticateToken, async (req, res) => {
  try {
    const intervals = {
      campaign: 1,    // 1 minute for active campaign accounts
      high: 2,        // 2 minutes for high-activity accounts  
      medium: 5,      // 5 minutes for medium-activity accounts
      low: 15,        // 15 minutes for low-activity accounts
      inactive: 30    // 30 minutes for inactive accounts
    };
    
    res.json({
      success: true,
      intervals,
      description: 'Sync interval minutes by activity level'
    });
    
  } catch (error) {
    console.error('❌ Error getting sync intervals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync intervals',
      details: error.message
    });
  }
});

module.exports = router;