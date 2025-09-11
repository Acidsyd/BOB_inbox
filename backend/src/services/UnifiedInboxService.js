const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * UnifiedInboxService - Master inbox infrastructure for cross-account conversation management
 * Handles conversation threading, email ingestion, and unified email management
 */
class UnifiedInboxService {
  constructor() {
    console.log('📬 UnifiedInboxService initialized');
    // Initialize EmailSyncService for provider sync
    this.emailSyncService = null;
  }

  /**
   * Helper function to create local timestamp (preserves timezone)
   * CRITICAL: EmailSyncService stores local timestamps, UnifiedInboxService must preserve them without UTC conversion
   */
  getLocalTimestamp() {
    // Use the same format as EmailSyncService to maintain consistency
    const dateObj = new Date();
    // Format using browser's local timezone (getHours() gives local browser time)
    return dateObj.getFullYear() + '-' + 
      String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
      String(dateObj.getDate()).padStart(2, '0') + 'T' + 
      String(dateObj.getHours()).padStart(2, '0') + ':' + 
      String(dateObj.getMinutes()).padStart(2, '0') + ':' + 
      String(dateObj.getSeconds()).padStart(2, '0') + '.000Z';
  }

  // Lazy load EmailSyncService to avoid circular dependency
  getEmailSyncService() {
    if (!this.emailSyncService) {
      const EmailSyncService = require('./EmailSyncService');
      this.emailSyncService = new EmailSyncService();
    }
    return this.emailSyncService;
  }

  /**
   * Ingest an email (sent or received) into the unified conversation system
   */
  async ingestEmail(emailData, direction = 'received', organizationId = null) {
    try {
      // Ensure organization_id is available (prioritize parameter over emailData)
      const orgId = organizationId || emailData.organization_id;
      if (!orgId) {
        throw new Error('organization_id is required for email ingestion');
      }
      
      // Ensure emailData has organization_id
      const enrichedEmailData = {
        ...emailData,
        organization_id: orgId
      };
      
      console.log(`📬 Ingesting ${direction} email: ${enrichedEmailData.subject} from ${enrichedEmailData.from_email} (org: ${orgId})`);

      // 🚫 BOUNCE FILTERING: Detect bounce messages and create special bounce conversation
      if (direction === 'received' && this.isBounceMessage(enrichedEmailData)) {
        console.log(`🚫 Detected bounce message, creating bounce conversation for visibility`);
        
        try {
          // Route to bounce detection system
          const GmailBounceDetector = require('./GmailBounceDetector');
          const bounceDetector = new GmailBounceDetector();
          
          // Parse the bounce and try to find the original email
          const bounceInfo = this.parseBounceMessageContent(enrichedEmailData);
          if (bounceInfo.recipientEmail) {
            // Try to find the original scheduled email
            const originalEmail = await this.findOriginalEmailForBounce(bounceInfo, orgId);
            if (originalEmail) {
              console.log(`✅ Found original email ${originalEmail.id} for bounce to ${bounceInfo.recipientEmail}`);
              
              // Record the bounce via BounceTrackingService
              const BounceTrackingService = require('./BounceTrackingService');
              const bounceTracker = new BounceTrackingService();
              
              await bounceTracker.recordBounce({
                bounceType: bounceInfo.bounceType,
                bounceReason: bounceInfo.bounceReason,
                recipientEmail: bounceInfo.recipientEmail,
                provider: 'gmail'
              }, originalEmail.id, orgId);
              
              console.log(`✅ Bounce recorded for ${bounceInfo.recipientEmail} (${bounceInfo.bounceType})`);
            } else {
              console.log(`⚠️ Could not find original email for bounced recipient: ${bounceInfo.recipientEmail}`);
            }
          } else {
            console.log(`⚠️ Could not extract recipient email from bounce message`);
          }
        } catch (bounceError) {
          console.error('❌ Error processing bounce message:', bounceError.message);
        }
        
        // Create a bounce conversation for visibility
        console.log(`📦 Creating bounce conversation for: ${enrichedEmailData.subject}`);
        
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            organization_id: orgId,
            email_account_id: enrichedEmailData.email_account_id,
            subject: enrichedEmailData.subject || 'Bounce Notification',
            participants: [enrichedEmailData.from_email, enrichedEmailData.to_email].filter(Boolean),
            conversation_type: 'bounce', // Special type for bounces  
            status: 'active',
            message_count: 1,
            unread_count: 1,
            last_activity_at: enrichedEmailData.received_at || this.getLocalTimestamp(),
            last_message_preview: enrichedEmailData.content_plain?.substring(0, 200) || 'Bounce notification',
            provider_thread_id: enrichedEmailData.provider_thread_id || `bounce-${Date.now()}`
          })
          .select()
          .single();
        
        if (convError) {
          console.error('❌ Error creating bounce conversation:', convError);
          return { 
            conversation: null, 
            message: null, 
            bounceSkipped: true,
            reason: 'Failed to create bounce conversation'
          };
        }
        
        // Store the bounce message
        const { data: message, error: msgError } = await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversation.id,
            organization_id: orgId,
            email_account_id: enrichedEmailData.email_account_id,
            message_id_header: enrichedEmailData.message_id_header,
            in_reply_to: enrichedEmailData.in_reply_to,
            message_references: enrichedEmailData.message_references,
            subject: enrichedEmailData.subject,
            from_email: enrichedEmailData.from_email,
            from_name: enrichedEmailData.from_name,
            to_email: enrichedEmailData.to_email,
            to_name: enrichedEmailData.to_name,
            cc: enrichedEmailData.cc,
            bcc: enrichedEmailData.bcc,
            content_html: enrichedEmailData.content_html,
            content_plain: enrichedEmailData.content_plain,
            direction: 'received',
            received_at: enrichedEmailData.received_at || this.getLocalTimestamp(),
            is_read: false,
            provider_message_id: enrichedEmailData.provider_message_id,
            provider_thread_id: enrichedEmailData.provider_thread_id
          })
          .select()
          .single();
        
        if (msgError) {
          console.error('❌ Error storing bounce message:', msgError);
          return { 
            conversation: conversation, 
            message: null, 
            isBounce: true,
            error: msgError.message
          };
        }
        
        console.log(`✅ Bounce conversation created with ID: ${conversation.id}`);
        return { 
          conversation: conversation, 
          message: message,
          isBounce: true
        };
      }

      // 0. CHECK FOR DUPLICATE MESSAGES FIRST
      if (enrichedEmailData.message_id_header || enrichedEmailData.provider_message_id) {
        console.log(`🔍 Checking for duplicates: message_id="${enrichedEmailData.message_id_header?.substring(0, 30)}...", provider_id="${enrichedEmailData.provider_message_id}"`);
        
        // Check all possible combinations since Gmail sync and local storage may swap the IDs
        const conditions = [];
        
        if (enrichedEmailData.message_id_header) {
          conditions.push(`message_id_header.eq.${enrichedEmailData.message_id_header}`);
          conditions.push(`provider_message_id.eq.${enrichedEmailData.message_id_header}`);
        }
        
        if (enrichedEmailData.provider_message_id) {
          conditions.push(`message_id_header.eq.${enrichedEmailData.provider_message_id}`);
          conditions.push(`provider_message_id.eq.${enrichedEmailData.provider_message_id}`);
        }
        
        if (conditions.length > 0) {
          const { data: existingMessages } = await supabase
            .from('conversation_messages')
            .select('id, conversation_id, conversations(*), message_id_header, provider_message_id')
            .eq('organization_id', orgId)
            .or(conditions.join(','))
            .limit(1);

          if (existingMessages && existingMessages.length > 0) {
            const existing = existingMessages[0];
            console.log(`⚠️ Email already exists - found: ${existing.message_id_header || existing.provider_message_id}, skipping duplicate`);
            return { 
              conversation: existing.conversations, 
              message: { id: existing.id } 
            };
          } else {
            console.log(`✅ No duplicate found, proceeding with ingestion`);
          }
        }
      }

      // 1. Find or create conversation based on Message-ID threading
      const conversation = await this.findOrCreateConversation(enrichedEmailData);
      
      // 2. Store message in conversation
      const message = await this.storeConversationMessage(conversation.id, enrichedEmailData, direction);
      
      // 3. Update conversation activity (triggers will handle this automatically)
      console.log(`✅ Email ingested into conversation ${conversation.id}`);
      
      return { conversation, message };
      
    } catch (error) {
      console.error('❌ Error ingesting email:', error);
      throw error;
    }
  }

  /**
   * Ingest an email directly into a specific conversation (used for replies)
   */
  async ingestEmailIntoConversation(emailData, conversationId, direction = 'received') {
    try {
      console.log(`📬 Ingesting ${direction} email directly into conversation ${conversationId}: ${emailData.subject}`);

      // Verify conversation exists and belongs to the organization
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, organization_id')
        .eq('id', conversationId)
        .eq('organization_id', emailData.organization_id)
        .single();

      if (convError || !conversation) {
        throw new Error(`Conversation ${conversationId} not found or access denied`);
      }

      // Store message directly in the specified conversation
      const message = await this.storeConversationMessage(conversationId, emailData, direction);
      
      console.log(`✅ Email ingested directly into conversation ${conversationId}`);
      
      return { conversation, message };
      
    } catch (error) {
      console.error('❌ Error ingesting email into conversation:', error);
      throw error;
    }
  }

  /**
   * Find existing conversation or create new one based on email threading rules
   */
  async findOrCreateConversation(emailData) {
    const { message_id_header, in_reply_to, message_references, subject, from_email, to_email, organization_id, campaign_id, lead_id } = emailData;

    try {
      let conversation = null;

      // Rule 1: If this email has In-Reply-To, find conversation by referenced Message-ID
      if (in_reply_to) {
        console.log(`🔍 Looking for conversation by In-Reply-To: ${in_reply_to}`);
        
        const { data: existingMessages } = await supabase
          .from('conversation_messages')
          .select('conversation_id, conversations(*)')
          .eq('message_id_header', in_reply_to)
          .eq('organization_id', organization_id)
          .limit(1);

        if (existingMessages && existingMessages.length > 0) {
          conversation = existingMessages[0].conversations;
          console.log(`✅ Found existing conversation by In-Reply-To: ${conversation.id}`);
        }
      }

      // Rule 2: If no In-Reply-To match, check References header
      if (!conversation && message_references) {
        console.log(`🔍 Looking for conversation by References: ${message_references}`);
        
        // Parse References header (comma-separated Message-IDs)
        const referencedIds = message_references.split(/[,\s]+/).filter(id => id.trim().length > 0);
        
        for (const refId of referencedIds) {
          const { data: existingMessages } = await supabase
            .from('conversation_messages')
            .select('conversation_id, conversations(*)')
            .eq('message_id_header', refId.trim())
            .eq('organization_id', organization_id)
            .limit(1);

          if (existingMessages && existingMessages.length > 0) {
            conversation = existingMessages[0].conversations;
            console.log(`✅ Found existing conversation by References: ${conversation.id}`);
            break;
          }
        }
      }

      // Rule 3: If no threading match, look for conversation by normalized subject and participants
      if (!conversation) {
        const normalizedSubject = this.normalizeSubject(subject);
        const participants = this.extractParticipants(from_email, to_email);
        
        console.log(`🔍 Looking for conversation by subject and participants: "${normalizedSubject}"`);
        
        const { data: existingConversations } = await supabase
          .from('conversations')
          .select('*')
          .eq('organization_id', organization_id)
          .eq('subject_normalized', normalizedSubject)
          .containedBy('participants', participants)
          .order('last_activity_at', { ascending: false })
          .limit(1);

        if (existingConversations && existingConversations.length > 0) {
          conversation = existingConversations[0];
          console.log(`✅ Found existing conversation by subject match: ${conversation.id}`);
        }
      }

      // Rule 4: Create new conversation if no match found
      if (!conversation) {
        console.log('📝 Creating new conversation');
        conversation = await this.createConversation({
          subject,
          participants: this.extractParticipants(from_email, to_email),
          message_id_root: message_id_header,
          organization_id,
          campaign_id,
          lead_id,
          conversation_type: campaign_id ? 'campaign' : 'organic'
        });
        console.log(`✅ Created new conversation: ${conversation.id}`);
      }

      return conversation;
      
    } catch (error) {
      console.error('❌ Error finding/creating conversation:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(conversationData) {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        subject: conversationData.subject,
        participants: conversationData.participants,
        message_id_root: conversationData.message_id_root,
        organization_id: conversationData.organization_id,
        campaign_id: conversationData.campaign_id,
        lead_id: conversationData.lead_id,
        conversation_type: conversationData.conversation_type || 'organic'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating conversation:', error);
      throw error;
    }

    return conversation;
  }

  /**
   * Store email message in conversation
   */
  async storeConversationMessage(conversationId, emailData, direction) {
    // Check for duplicates using multiple fields
    if (emailData.message_id_header || emailData.provider_message_id) {
      // Build OR conditions for duplicate detection
      let duplicateQuery = supabase
        .from('conversation_messages')
        .select('id, message_id_header, provider_message_id')
        .eq('organization_id', emailData.organization_id);
      
      // Check by message_id_header OR provider_message_id
      if (emailData.message_id_header && emailData.provider_message_id) {
        duplicateQuery = duplicateQuery.or(`message_id_header.eq.${emailData.message_id_header},provider_message_id.eq.${emailData.provider_message_id}`);
      } else if (emailData.message_id_header) {
        duplicateQuery = duplicateQuery.eq('message_id_header', emailData.message_id_header);
      } else if (emailData.provider_message_id) {
        duplicateQuery = duplicateQuery.eq('provider_message_id', emailData.provider_message_id);
      }

      const { data: existingMessages } = await duplicateQuery.limit(1);

      if (existingMessages && existingMessages.length > 0) {
        const existing = existingMessages[0];
        console.log(`⚠️ Message already exists (${existing.message_id_header || existing.provider_message_id}), skipping duplicate`);
        return existing;
      }
    }

    const messageData = {
      conversation_id: conversationId,
      message_id_header: emailData.message_id_header || emailData.message_id,
      in_reply_to: emailData.in_reply_to,
      message_references: emailData.message_references,
      thread_id: emailData.thread_id,
      direction: direction,
      email_account_id: emailData.email_account_id,
      provider: emailData.provider || 'gmail',
      provider_message_id: emailData.provider_message_id,
      provider_thread_id: emailData.provider_thread_id,
      sync_status: emailData.sync_status || 'synced',
      from_email: emailData.from_email,
      from_name: emailData.from_name,
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      subject: emailData.subject,
      content_html: emailData.content_html || emailData.content,
      content_plain: emailData.content_plain || this.stripHtml(emailData.content_html || emailData.content || ''),
      content_preview: this.generatePreview(emailData.content_plain || emailData.content_html || emailData.content || ''),
      sent_at: direction === 'sent' ? emailData.sent_at : null,
      received_at: direction === 'received' ? emailData.received_at : null,
      is_read: direction === 'sent' ? true : (emailData.is_read !== undefined ? emailData.is_read : false),
      scheduled_email_id: emailData.scheduled_email_id,
      campaign_id: emailData.campaign_id,
      lead_id: emailData.lead_id,
      organization_id: emailData.organization_id
    };

    const { data: message, error } = await supabase
      .from('conversation_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error storing conversation message:', error);
      throw error;
    }

    console.log(`✅ Stored ${direction} message in conversation: ${message.id}`);
    return message;
  }

  /**
   * Get all conversations for an organization
   */
  async getConversations(organizationId, options = {}) {
    const {
      status = 'active',
      limit = 50,
      offset = 0,
      search = null,
      conversationType = null,
      isRead = null,
      sender = null,
      dateFrom = null,
      dateTo = null,
      campaignId = null,
      labelIds = null,
      sortBy = 'last_activity_at',
      sortOrder = 'desc'
    } = options;

    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          message_count,
          unread_count,
          last_activity_at,
          last_message_preview,
          campaigns!campaign_id (
            id,
            name
          ),
          leads!lead_id (
            id,
            first_name,
            last_name,
            email
          ),
          conversation_label_assignments (
            conversation_labels (
              id,
              name,
              color,
              description
            )
          )
        `)
        .eq('organization_id', organizationId)
        .range(offset, offset + limit - 1);

      // Status filter
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // Conversation type filter
      if (conversationType) {
        query = query.eq('conversation_type', conversationType);
      }

      // Campaign filter
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      // Read/unread filter - check if conversation has unread messages
      if (isRead !== null) {
        if (isRead) {
          query = query.eq('unread_count', 0);
        } else {
          query = query.gt('unread_count', 0);
        }
      }

      // Date range filter
      if (dateFrom) {
        query = query.gte('last_activity_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('last_activity_at', dateTo);
      }

      // Sender filter - check participants array
      if (sender) {
        query = query.contains('participants', [sender.toLowerCase()]);
      }

      // Enhanced text search - search across all email fields
      if (search) {
        const searchTerm = search.trim();
        const searchTermLower = searchTerm.toLowerCase();
        
        console.log(`🔍 DEBUG: Starting search for term: "${searchTerm}"`);
        
        try {
          // First get conversations that have matching messages in their content
          const { data: conversationsWithMatchingMessages, error: searchError } = await supabase
            .from('conversation_messages')
            .select('conversation_id')
            .eq('organization_id', organizationId)
            .or(`from_email.ilike.%${searchTermLower}%,to_email.ilike.%${searchTermLower}%,content_html.ilike.%${searchTerm}%,content_plain.ilike.%${searchTerm}%,from_name.ilike.%${searchTerm}%`);
          
          if (searchError) {
            console.error('❌ Error searching messages:', searchError);
            // Fall back to basic conversation search only
            query = query.or(`subject.ilike.%${searchTerm}%,last_message_preview.ilike.%${searchTerm}%`);
          } else {
            // Deduplicate conversation IDs since we removed DISTINCT from the query
            const allConversationIds = conversationsWithMatchingMessages?.map(row => row.conversation_id) || [];
            const matchingConversationIds = [...new Set(allConversationIds)];
            console.log(`🔍 DEBUG: Found ${matchingConversationIds.length} unique conversations with matching messages`);
            
            // Build comprehensive search query
            const searchConditions = [
              `subject.ilike.%${searchTerm}%`,
              `last_message_preview.ilike.%${searchTerm}%`
            ];
            
            // Add conversation IDs that have matching message content
            if (matchingConversationIds.length > 0) {
              searchConditions.push(`id.in.(${matchingConversationIds.join(',')})`);
            }
            
            // Apply the search conditions - ensure we have at least one condition
            if (searchConditions.length > 0) {
              query = query.or(searchConditions.join(','));
              console.log(`🔍 DEBUG: Applied search conditions: ${searchConditions.join(',')}`);
            }
          }
        } catch (err) {
          console.error('❌ Unexpected search error:', err);
          // Fall back to basic conversation search only
          query = query.or(`subject.ilike.%${searchTerm}%,last_message_preview.ilike.%${searchTerm}%`);
        }
      }

      // Sorting
      const ascending = sortOrder === 'asc';
      switch (sortBy) {
        case 'subject':
          query = query.order('subject', { ascending });
          break;
        case 'message_count':
          query = query.order('message_count', { ascending });
          break;
        case 'created_at':
          query = query.order('created_at', { ascending });
          break;
        default:
          query = query.order('last_activity_at', { ascending });
      }

      let { data: conversations, error } = await query;

      if (error) {
        console.error('❌ Error fetching conversations:', error);
        throw error;
      }

      // Apply label filtering if specified
      if (labelIds && Array.isArray(labelIds) && labelIds.length > 0) {
        conversations = conversations?.filter(conversation => {
          const conversationLabels = conversation.conversation_label_assignments?.map(
            assignment => assignment.conversation_labels?.id
          ).filter(Boolean) || [];
          
          // Check if conversation has at least one of the requested labels
          return labelIds.some(labelId => conversationLabels.includes(labelId));
        }) || [];
      }

      // Flatten label assignments and add campaign/lead names (timestamps are correct in database)
      if (conversations && conversations.length > 0) {
        conversations = conversations.map(conversation => {
          const labels = conversation.conversation_label_assignments?.map(
            assignment => assignment.conversation_labels
          ).filter(Boolean) || [];
          
          // Extract campaign name and lead name from joined data
          const campaign_name = conversation.campaigns?.name || null;
          const lead_name = conversation.leads 
            ? `${conversation.leads.first_name || ''} ${conversation.leads.last_name || ''}`.trim() || conversation.leads.email || null
            : null;
          
          return {
            ...conversation,
            labels,
            campaign_name,
            lead_name,
            conversation_label_assignments: undefined, // Remove nested structure
            campaigns: undefined, // Remove nested structure
            leads: undefined // Remove nested structure
          };
        });
      }

      console.log(`📬 Retrieved ${conversations?.length || 0} conversations for org ${organizationId}`);
      return conversations || [];

    } catch (error) {
      console.error('❌ Error in getConversations:', error);
      throw error;
    }
  }

  /**
   * Get all messages in a conversation
   */
  async getConversationMessages(conversationId, organizationId) {
    try {
      let { data: messages, error } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          campaigns!left(
            id,
            name
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ Error fetching conversation messages:', error);
        throw error;
      }

      // Sort messages chronologically by the actual email timestamp
      // For sent messages, use sent_at; for received messages, use received_at
      if (messages && messages.length > 0) {
        messages.sort((a, b) => {
          const dateA = new Date(a.sent_at || a.received_at || a.created_at);
          const dateB = new Date(b.sent_at || b.received_at || b.created_at);
          return dateA.getTime() - dateB.getTime(); // Ascending order (oldest first, newest last)
        });
      }

      // Mark received messages as read
      if (messages && messages.length > 0) {
        const unreadMessageIds = messages
          .filter(m => m.direction === 'received' && !m.is_read)
          .map(m => m.id);

        if (unreadMessageIds.length > 0) {
          await supabase
            .from('conversation_messages')
            .update({ is_read: true })
            .in('id', unreadMessageIds);
        }
      }

      console.log(`📬 Retrieved ${messages?.length || 0} messages for conversation ${conversationId}`);
      
      // Parse email fields to extract names
      const parsedMessages = (messages || []).map(msg => {
        // Parse from_email if it contains name
        if (msg.from_email && msg.from_email.includes('<')) {
          const match = msg.from_email.match(/^([^<]+)<([^>]+)>$/);
          if (match) {
            msg.from_name = msg.from_name || match[1].trim();
            msg.from_email = match[2].trim();
          }
        }
        
        // Parse to_email if it contains name
        if (msg.to_email && msg.to_email.includes('<')) {
          const match = msg.to_email.match(/^([^<]+)<([^>]+)>$/);
          if (match) {
            msg.to_name = msg.to_name || match[1].trim();
            msg.to_email = match[2].trim();
          }
        }
        
        // For sent messages, keep original from_name if available, otherwise extract from email
        if (msg.direction === 'sent') {
          // Only set from_name to 'Me' if we don't already have a name
          if (!msg.from_name) {
            if (msg.from_email && msg.from_email.includes('<')) {
              // We already parsed this above, so from_name should be set
            } else if (msg.from_email) {
              // Extract name from email if no name was provided
              const emailPart = msg.from_email.split('@')[0];
              msg.from_name = emailPart.charAt(0).toUpperCase() + emailPart.slice(1).replace(/[._-]/g, ' ');
            } else {
              msg.from_name = 'Me';
            }
          }
        }
        
        // Flatten campaign data for frontend
        const campaign_name = msg.campaigns?.name || null;
        
        return {
          ...msg,
          campaign_name,
          campaigns: undefined // Remove nested structure
        };
      });
      
      return parsedMessages;

    } catch (error) {
      console.error('❌ Error in getConversationMessages:', error);
      throw error;
    }
  }

  /**
   * Mark conversation as read/unread
   */
  async markConversationRead(conversationId, organizationId, isRead = true) {
    try {
      console.log(`📖 Marking conversation ${isRead ? 'READ' : 'UNREAD'} with provider sync: ${conversationId}`);

      // First, get all received messages in the conversation with provider info
      const { data: messages, error: fetchError } = await supabase
        .from('conversation_messages')
        .select('id, provider_message_id, sync_status, from_email, to_email, is_read')
        .eq('conversation_id', conversationId)
        .eq('organization_id', organizationId)
        .eq('direction', 'received');

      if (fetchError) {
        console.error('❌ Error fetching conversation messages:', fetchError);
        throw fetchError;
      }

      // Update all received messages in the conversation
      const { error } = await supabase
        .from('conversation_messages')
        .update({ is_read: isRead })
        .eq('conversation_id', conversationId)
        .eq('organization_id', organizationId)
        .eq('direction', 'received');

      if (error) {
        console.error('❌ Error marking conversation as read:', error);
        throw error;
      }

      // CRITICAL FIX: Update conversation unread_count to ensure read status persistence
      let newUnreadCount;
      if (isRead) {
        // If marking as read, set unread_count to 0
        newUnreadCount = 0;
      } else {
        // If marking as unread, count how many received messages will be unread
        newUnreadCount = messages?.length || 1;
      }

      const { error: convError } = await supabase
        .from('conversations')
        .update({ unread_count: newUnreadCount })
        .eq('id', conversationId)
        .eq('organization_id', organizationId);

      if (convError) {
        console.error('❌ Error updating conversation unread_count:', convError);
        // Don't throw here - message updates succeeded, this is just for UI consistency
      } else {
        console.log(`✅ Updated conversation unread_count to ${newUnreadCount}`);
      }

      // Sync read status with providers for messages that have provider_message_id
      if (messages && messages.length > 0) {
        console.log(`🔄 Syncing read status for ${messages.length} messages with providers`);
        
        const emailSyncService = this.getEmailSyncService();
        let syncableMessages = 0;
        
        for (const message of messages) {
          // Only sync if we have a provider_message_id that looks like a Gmail ID (not UUID)
          if (message.provider_message_id && !message.provider_message_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}/)) {
            syncableMessages++;
            
            // Determine provider based on email domain
            let provider = 'gmail'; // Default to Gmail for now
            
            // Try to determine provider from email
            if (message.to_email && message.to_email.includes('@outlook.')) {
              provider = 'outlook';
            } else if (message.to_email && message.to_email.includes('@gmail.')) {
              provider = 'gmail';
            }
            
            console.log(`📖 Syncing ${provider} message ${message.provider_message_id} as ${isRead ? 'read' : 'unread'}`);
            
            const syncResult = await emailSyncService.syncMessageReadStatus(
              message.id, // Pass message UUID, let EmailSyncService handle the lookup
              isRead,
              provider
            );
            
            if (!syncResult.success) {
              console.error(`❌ Failed to sync read status for message ${message.id}:`, syncResult.error);
              // Continue with other messages even if one fails - don't throw error
            } else {
              console.log(`✅ Successfully synced message ${message.id} with ${provider}`);
            }
          } else {
            // Skip messages without Gmail IDs (they can't be synced)
            console.log(`⏭️ Skipping message ${message.id} - no Gmail provider ID available`);
          }
        }
        
        if (syncableMessages === 0) {
          console.log(`ℹ️ No messages with Gmail IDs found for sync (${messages.length} total messages)`);
        } else {
          console.log(`📊 Attempted sync for ${syncableMessages}/${messages.length} messages with Gmail IDs`);
        }
      }

      console.log(`✅ Marked conversation ${conversationId} as ${isRead ? 'read' : 'unread'}`);
      return true;

    } catch (error) {
      console.error('❌ Error in markConversationRead:', error);
      throw error;
    }
  }

  /**
   * Get conversation details by ID
   */
  async getConversationDetails(conversationId, organizationId) {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('❌ Error fetching conversation details:', error);
        return null;
      }

      return conversation;
    } catch (error) {
      console.error('❌ Error in getConversationDetails:', error);
      throw error;
    }
  }

  /**
   * Archive/unarchive conversation
   */
  async archiveConversation(conversationId, organizationId, archived = true) {
    try {
      const status = archived ? 'archived' : 'active';
      
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ Error archiving conversation:', error);
        throw error;
      }

      console.log(`✅ ${archived ? 'Archived' : 'Unarchived'} conversation ${conversationId}`);
      return true;

    } catch (error) {
      console.error('❌ Error in archiveConversation:', error);
      throw error;
    }
  }

  // ====================================
  // UTILITY METHODS
  // ====================================

  /**
   * Normalize email subject for better conversation grouping
   */
  normalizeSubject(subject) {
    if (!subject) return '';
    
    return subject
      .trim()
      .toLowerCase()
      .replace(/^(re:|fwd?:|fw:)\s*/gi, '') // Remove reply/forward prefixes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract unique participants from email addresses
   */
  extractParticipants(fromEmail, toEmail, ccEmails = [], bccEmails = []) {
    const participants = new Set();
    
    if (fromEmail) participants.add(fromEmail.toLowerCase());
    if (toEmail) participants.add(toEmail.toLowerCase());
    
    // Handle CC and BCC if they're arrays
    if (Array.isArray(ccEmails)) {
      ccEmails.forEach(email => {
        if (typeof email === 'string') {
          participants.add(email.toLowerCase());
        } else if (email.email) {
          participants.add(email.email.toLowerCase());
        }
      });
    }
    
    if (Array.isArray(bccEmails)) {
      bccEmails.forEach(email => {
        if (typeof email === 'string') {
          participants.add(email.toLowerCase());
        } else if (email.email) {
          participants.add(email.email.toLowerCase());
        }
      });
    }
    
    return Array.from(participants);
  }

  /**
   * Generate email content preview (first ~200 characters)
   */
  generatePreview(content) {
    if (!content) return '';
    
    // Strip HTML tags and normalize whitespace
    const plainText = this.stripHtml(content)
      .replace(/\s+/g, ' ')
      .trim();
    
    return plainText.length > 200 
      ? plainText.substring(0, 200) + '...'
      : plainText;
  }

  /**
   * Strip HTML tags from content
   */
  stripHtml(html) {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .trim();
  }

  /**
   * Get conversation statistics for organization
   */
  async getConversationStats(organizationId) {
    try {
      const { data: stats, error } = await supabase
        .from('conversations')
        .select('status, conversation_type, unread_count')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const result = {
        total: stats?.length || 0,
        active: stats?.filter(s => s.status === 'active').length || 0,
        archived: stats?.filter(s => s.status === 'archived').length || 0,
        campaign: stats?.filter(s => s.conversation_type === 'campaign').length || 0,
        organic: stats?.filter(s => s.conversation_type === 'organic').length || 0,
        totalUnread: stats?.reduce((sum, s) => sum + (s.unread_count || 0), 0) || 0
      };

      console.log(`📊 Conversation stats for org ${organizationId}:`, result);
      return result;

    } catch (error) {
      console.error('❌ Error getting conversation stats:', error);
      throw error;
    }
  }

  // ====================================
  // BULK OPERATIONS
  // ====================================

  /**
   * Bulk mark conversations as read/unread
   */
  async bulkMarkRead(conversationIds, organizationId, isRead = true) {
    try {
      // Update all received messages in the specified conversations
      const { error } = await supabase
        .from('conversation_messages')
        .update({ is_read: isRead })
        .in('conversation_id', conversationIds)
        .eq('organization_id', organizationId)
        .eq('direction', 'received');

      if (error) {
        console.error('❌ Error bulk marking conversations as read:', error);
        throw error;
      }

      // CRITICAL FIX: Update conversation unread_count for all conversations
      const newUnreadCount = isRead ? 0 : 1; // For bulk operations, use simple logic

      const { error: convError } = await supabase
        .from('conversations')
        .update({ unread_count: newUnreadCount })
        .in('id', conversationIds)
        .eq('organization_id', organizationId);

      if (convError) {
        console.error('❌ Error bulk updating conversation unread_count:', convError);
        // Don't throw here - message updates succeeded
      } else {
        console.log(`✅ Bulk updated ${conversationIds.length} conversations unread_count to ${newUnreadCount}`);
      }

      console.log(`✅ Bulk marked ${conversationIds.length} conversations as ${isRead ? 'read' : 'unread'}`);
      return true;

    } catch (error) {
      console.error('❌ Error in bulkMarkRead:', error);
      throw error;
    }
  }

  /**
   * Bulk archive/unarchive conversations
   */
  async bulkArchive(conversationIds, organizationId, archived = true) {
    try {
      const status = archived ? 'archived' : 'active';
      
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .in('id', conversationIds)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ Error bulk archiving conversations:', error);
        throw error;
      }

      console.log(`✅ Bulk ${archived ? 'archived' : 'unarchived'} ${conversationIds.length} conversations`);
      return true;

    } catch (error) {
      console.error('❌ Error in bulkArchive:', error);
      throw error;
    }
  }

  /**
   * Bulk delete conversations (soft delete by setting status to 'deleted')
   */
  async bulkDelete(conversationIds, organizationId) {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'deleted' })
        .in('id', conversationIds)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ Error bulk deleting conversations:', error);
        throw error;
      }

      console.log(`✅ Bulk deleted ${conversationIds.length} conversations`);
      return true;

    } catch (error) {
      console.error('❌ Error in bulkDelete:', error);
      throw error;
    }
  }

  // ====================================
  // BOUNCE DETECTION METHODS
  // ====================================

  /**
   * Check if an email message is a bounce message
   */
  isBounceMessage(emailData) {
    const { from_email, subject, content_html, content_plain } = emailData;
    
    if (!from_email || !subject) return false;
    
    // Check sender patterns
    const bounceFromPatterns = [
      'mailer-daemon',
      'mail delivery subsystem',
      'postmaster',
      'no-reply@google.com',
      'noreply-',
      'mail-noreply@'
    ];
    
    const lowerFrom = from_email.toLowerCase();
    const isBounceFrom = bounceFromPatterns.some(pattern => 
      lowerFrom.includes(pattern.toLowerCase())
    );
    
    // Check subject patterns
    const bounceSubjectPatterns = [
      'delivery status notification',
      'returned mail',
      'undelivered mail',
      'mail delivery failed',
      'delivery failure',
      'failure notice',
      'message could not be delivered',
      'undeliverable:'
    ];
    
    const lowerSubject = subject.toLowerCase();
    const isBounceSubject = bounceSubjectPatterns.some(pattern => 
      lowerSubject.includes(pattern.toLowerCase())
    );
    
    console.log(`🔍 Bounce check - From: "${from_email}", Subject: "${subject}"`);
    console.log(`🔍 From match: ${isBounceFrom}, Subject match: ${isBounceSubject}`);
    
    return isBounceFrom || isBounceSubject;
  }

  /**
   * Parse bounce message content to extract bounce information
   */
  parseBounceMessageContent(emailData) {
    const { subject, content_html, content_plain } = emailData;
    
    // Use plain text content first, fallback to HTML stripped
    const bodyText = content_plain || this.stripHtml(content_html || '');
    
    console.log(`📧 Parsing bounce content: "${subject}"`);
    
    // Extract recipient email using same patterns as GmailBounceDetector
    let recipientEmail = null;
    
    // Multiple strategies to extract bounced email address
    const bouncePatterns = [
      /the following address(?:es)? failed:[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /delivery to the following recipient failed:[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /recipient address rejected[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /user unknown[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/m, // Email on its own line
      /to:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /for\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /recipient.*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];
    
    for (const pattern of bouncePatterns) {
      const match = bodyText.match(pattern);
      if (match && match[1]) {
        recipientEmail = match[1];
        console.log(`📧 Extracted email using pattern: ${recipientEmail}`);
        break;
      }
    }
    
    // If no specific pattern matches, look for any email addresses
    if (!recipientEmail) {
      const allEmailMatches = bodyText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
      if (allEmailMatches) {
        // Filter out common non-recipient emails
        const filteredEmails = allEmailMatches.filter(email => {
          const lowerEmail = email.toLowerCase();
          return !lowerEmail.includes('mailer-daemon') && 
                 !lowerEmail.includes('postmaster') &&
                 !lowerEmail.includes('noreply') &&
                 !lowerEmail.includes('no-reply') &&
                 !lowerEmail.endsWith('.googlemail.com') &&
                 !lowerEmail.endsWith('google.com');
        });
        
        if (filteredEmails.length > 0) {
          recipientEmail = filteredEmails[0]; // Take the first non-system email
          console.log(`📧 Extracted email from general search: ${recipientEmail}`);
        }
      }
    }
    
    // Determine bounce type
    const lowerBody = bodyText.toLowerCase();
    const lowerSubject = subject.toLowerCase();
    
    let bounceType = 'soft'; // Default to soft bounce
    let bounceReason = 'Email delivery failed';
    
    // Hard bounce indicators
    const hardBounceIndicators = [
      'permanent failure',
      'user unknown',
      'recipient address rejected',
      'domain not found',
      'mailbox unavailable',
      'invalid recipient',
      'no such user'
    ];
    
    // Check for hard bounce indicators
    for (const indicator of hardBounceIndicators) {
      if (lowerBody.includes(indicator) || lowerSubject.includes(indicator)) {
        bounceType = 'hard';
        bounceReason = `Hard bounce: ${indicator}`;
        break;
      }
    }
    
    // Soft bounce indicators (if not already hard bounce)
    if (bounceType === 'soft') {
      const softBounceIndicators = [
        'temporary failure',
        'mailbox full',
        'try again later',
        'temporarily unavailable',
        'quota exceeded'
      ];
      
      for (const indicator of softBounceIndicators) {
        if (lowerBody.includes(indicator) || lowerSubject.includes(indicator)) {
          bounceReason = `Soft bounce: ${indicator}`;
          break;
        }
      }
    }
    
    console.log(`📧 Bounce analysis: ${recipientEmail} (${bounceType}) - ${bounceReason}`);
    
    return {
      recipientEmail,
      bounceType,
      bounceReason
    };
  }

  /**
   * Find original scheduled email for a bounce
   */
  async findOriginalEmailForBounce(bounceInfo, organizationId) {
    try {
      // Look for emails sent to this recipient in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: emails, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('to_email', bounceInfo.recipientEmail)
        .eq('organization_id', organizationId)
        .eq('status', 'sent')
        .gte('sent_at', sevenDaysAgo.toISOString())
        .order('sent_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('❌ Error finding original email:', error);
        return null;
      }
      
      return emails && emails.length > 0 ? emails[0] : null;
      
    } catch (error) {
      console.error('❌ Error in findOriginalEmailForBounce:', error.message);
      return null;
    }
  }
}

module.exports = UnifiedInboxService;