// Use centralized Supabase client to avoid connection pool issues
const supabase = require('../config/supabase');
const TimezoneService = require('./TimezoneService');

/**
 * FolderService - Gmail-style folder management
 * Features:
 * - 3 system folders: Inbox, Sent, Untracked Replies
 * - Real-time folder counts
 * - Campaign vs Organic distinction
 */
class FolderService {
  constructor() {
    // Add caching and request deduplication to prevent database connection pool exhaustion
    this.folderCountCache = new Map();
    this.ongoingRequests = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache

    console.log('📁 FolderService initialized with request deduplication');
  }

  /**
   * Cache-aware operation to prevent duplicate concurrent requests
   */
  async getCachedOrExecute(cacheKey, operation) {
    // Check cache first
    const cached = this.folderCountCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log('🔄 Using cached result for:', cacheKey);
      return cached.data;
    }

    // Check if request is already in progress
    if (this.ongoingRequests.has(cacheKey)) {
      console.log('⏳ Waiting for ongoing request:', cacheKey);
      return await this.ongoingRequests.get(cacheKey);
    }

    // Execute operation
    const promise = operation();
    this.ongoingRequests.set(cacheKey, promise);

    try {
      const result = await promise;

      // Cache the result
      this.folderCountCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } finally {
      // Clean up ongoing request
      this.ongoingRequests.delete(cacheKey);
    }
  }

  /**
   * Retry mechanism for database operations to handle connection issues
   */
  async retryDatabaseOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.log(`🔄 Database operation attempt ${attempt}/${maxRetries} failed:`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Get all folders for an organization with counts
   */
  async getFoldersWithCounts(organizationId) {
    try {
      console.log('📊 Getting folder counts for organization:', organizationId);

      // Use hardcoded system folders since table may not exist yet
      const systemFolders = [
        {
          id: `inbox_${organizationId}`,
          organization_id: organizationId,
          name: 'Inbox',
          icon: 'Inbox',
          type: 'inbox',
          sort_order: 1,
          is_system: true
        },
        {
          id: `sent_${organizationId}`,
          organization_id: organizationId,
          name: 'Sent',
          icon: 'Send',
          type: 'sent',
          sort_order: 2,
          is_system: true
        },
        {
          id: `untracked_${organizationId}`,
          organization_id: organizationId,
          name: 'Untracked Replies',
          icon: 'MessageCircle',
          type: 'untracked_replies',
          sort_order: 3,
          is_system: true
        },
        {
          id: `bounces_${organizationId}`,
          organization_id: organizationId,
          name: 'Bounces',
          icon: 'AlertCircle',
          type: 'bounces',
          sort_order: 4,
          is_system: true
        },
        {
          id: `search_${organizationId}`,
          organization_id: organizationId,
          name: 'Search',
          icon: 'Search',
          type: 'search',
          sort_order: 5,
          is_system: true
        }
      ];

      // Calculate counts for each folder manually
      const foldersWithCounts = [];
      
      for (const folder of systemFolders) {
        const count = await this.getFolderCount(organizationId, folder.type);
        foldersWithCounts.push({
          ...folder,
          count
        });
      }

      console.log('✅ Retrieved folder counts:', foldersWithCounts.length, 'folders');
      return foldersWithCounts;

    } catch (error) {
      console.error('❌ FolderService.getFoldersWithCounts failed:', error);
      throw error;
    }
  }

  /**
   * Get conversations for a specific folder type
   */
  async getConversationsForFolder(organizationId, folderType, options = {}) {
    // Use shorter cache for conversations (5 seconds) since they change more frequently
    const cacheKey = `conversations:${organizationId}:${folderType}:${JSON.stringify(options)}`;

    return await this.getCachedOrExecute(cacheKey, async () => {
      try {
        console.log('🐛 DEBUG: options received:', JSON.stringify(options));
        const { limit = 50, offset = 0, search, unreadOnly = false, labelIds = null, timezone } = options;
      console.log('🐛 DEBUG: extracted search (NEW VERSION):', search);
      console.log('🐛 DEBUG: unreadOnly filter:', unreadOnly);
      console.log('🐛 DEBUG: labelIds filter (updated):', labelIds);
      
      console.log('📋 Getting conversations for folder:', folderType);

      let query = supabase
        .from('conversations')
        .select(`
          id,
          subject,
          participants,
          conversation_type,
          status,
          message_count,
          unread_count,
          last_activity_at,
          last_message_preview,
          created_at,
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
        .order('last_activity_at', { ascending: false });

      // Apply folder-specific filtering
      console.log('🔍 DEBUG BEFORE SWITCH: folderType =', JSON.stringify(folderType), 'type:', typeof folderType);
      console.log('🔍 DEBUG BEFORE SWITCH: About to enter switch statement');
      console.log('🔍 DEBUG SWITCH: folderType =', JSON.stringify(folderType), 'type:', typeof folderType);
      switch (folderType) {
        case 'inbox':
          console.log('🔍 DEBUG: ENTERED INBOX CASE');

          // Inbox shows campaign conversations that have received replies (message_count > 1)
          // Keeps them visible even after being read
          query = query
            .eq('conversation_type', 'campaign')
            .neq('status', 'archived')
            .gt('message_count', 1); // Only show campaigns with replies (>1 message)

          console.log(`🔍 DEBUG INBOX: Querying campaign conversations with replies`);
          break;

        case 'sent':
          console.log('🔍 DEBUG: Getting sent conversations - ORDERED BY LATEST SENT MESSAGE');
          
          // IMPROVED: Order by when YOU last sent a message, not by conversation activity
          // This ensures sent folder shows YOUR latest sent emails at the top
          
          // Get all sent messages with their sent timestamps
          const { data: allSentMessages, error: sentMsgError } = await supabase
            .from('conversation_messages')
            .select('conversation_id, sent_at, conversations!inner(status)')
            .eq('organization_id', organizationId)
            .eq('direction', 'sent')
            .eq('conversations.status', 'active')
            .order('sent_at', { ascending: false })
            .limit(5000); // High limit to get all sent messages

          if (sentMsgError) {
            console.error('❌ Error getting sent messages:', sentMsgError);
            throw sentMsgError;
          }

          // Group by conversation and get the latest sent timestamp for each
          const conversationLatestSent = new Map();
          allSentMessages?.forEach(msg => {
            const existing = conversationLatestSent.get(msg.conversation_id);
            if (!existing || new Date(msg.sent_at) > new Date(existing)) {
              conversationLatestSent.set(msg.conversation_id, msg.sent_at);
            }
          });

          // Sort conversations by their latest sent message timestamp
          const sortedConversations = Array.from(conversationLatestSent.entries())
            .sort((a, b) => new Date(b[1]) - new Date(a[1]))
            .map(([conversationId]) => conversationId);

          console.log('🔍 DEBUG: Found', sortedConversations.length, 'total conversations with sent messages');

          if (sortedConversations.length === 0) {
            // No sent messages found - return empty array directly for sent folder
            return [];
          }

          // Apply pagination to the sorted conversation IDs
          const paginatedConversationIds = sortedConversations.slice(offset, offset + limit);
          console.log('🔍 DEBUG: Applying pagination - showing conversations', offset + 1, 'to', offset + paginatedConversationIds.length, 'of', sortedConversations.length);

          // Now fetch full conversation data for the paginated IDs
          // IMPORTANT: We'll maintain our custom sort order after fetching
          const { data: unsortedConversations, error: convError } = await supabase
            .from('conversations')
            .select(`
              id,
              subject,
              participants,
              conversation_type,
              status,
              message_count,
              unread_count,
              last_activity_at,
              last_message_preview,
              created_at,
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
            .in('id', paginatedConversationIds);

          if (convError) {
            console.error('❌ Error fetching conversations:', convError);
            throw convError;
          }

          // Maintain our custom sort order (by latest sent message)
          const conversationMap = new Map(unsortedConversations?.map(c => [c.id, c]) || []);
          const orderedConversations = paginatedConversationIds
            .map(id => conversationMap.get(id))
            .filter(Boolean);

          // Check if any of these conversations have bounced emails or tracking data
          // Get all scheduled_email_ids for these conversations
          const { data: sentMessages } = await supabase
            .from('conversation_messages')
            .select('conversation_id, scheduled_email_id')
            .eq('organization_id', organizationId)
            .eq('direction', 'sent')
            .in('conversation_id', paginatedConversationIds)
            .not('scheduled_email_id', 'is', null);

          const sentScheduledEmailIds = [...new Set(sentMessages?.map(m => m.scheduled_email_id).filter(Boolean) || [])];

          if (sentScheduledEmailIds.length > 0) {
            // Check for bounces associated with these scheduled emails
            const { data: bounces } = await supabase
              .from('email_bounces')
              .select('scheduled_email_id, recipient_email')
              .eq('organization_id', organizationId)
              .in('scheduled_email_id', sentScheduledEmailIds);

            // Check for tracking data (opens and clicks)
            const { data: trackingData } = await supabase
              .from('email_tracking_events')
              .select('scheduled_email_id, event_type')
              .eq('organization_id', organizationId)
              .in('scheduled_email_id', sentScheduledEmailIds);

            // Create maps for bounce, open, and click tracking
            const bounceMap = new Map();
            const openMap = new Map();
            const clickMap = new Map();

            if (bounces && bounces.length > 0) {
              bounces.forEach(b => bounceMap.set(b.scheduled_email_id, b));
            }

            if (trackingData && trackingData.length > 0) {
              trackingData.forEach(t => {
                if (t.event_type === 'open') {
                  openMap.set(t.scheduled_email_id, true);
                } else if (t.event_type === 'click') {
                  clickMap.set(t.scheduled_email_id, true);
                }
              });
            }

            // Create conversation-level maps
            const conversationBounceMap = new Map();
            const conversationOpenMap = new Map();
            const conversationClickMap = new Map();

            sentMessages.forEach(msg => {
              if (bounceMap.has(msg.scheduled_email_id)) {
                conversationBounceMap.set(msg.conversation_id, true);
              }
              if (openMap.has(msg.scheduled_email_id)) {
                conversationOpenMap.set(msg.conversation_id, true);
              }
              if (clickMap.has(msg.scheduled_email_id)) {
                conversationClickMap.set(msg.conversation_id, true);
              }
            });

            // Mark conversations with bounces, opens, and clicks
            orderedConversations.forEach(conv => {
              if (conversationBounceMap.has(conv.id)) {
                conv.status = 'bounced';
              }
              if (conversationOpenMap.has(conv.id)) {
                conv.was_opened = true;
              }
              if (conversationClickMap.has(conv.id)) {
                conv.was_clicked = true;
              }
            });

            console.log('🔍 DEBUG: Marked', conversationBounceMap.size, 'conversations as bounced,', conversationOpenMap.size, 'as opened,', conversationClickMap.size, 'as clicked');
          }

          // Override the query result with our sorted data
          query = { data: orderedConversations, error: null };

          console.log('🔍 DEBUG: Fetched and sorted', orderedConversations.length, 'conversations by latest sent');
          break;

        case 'untracked_replies':
          // Organic conversations not linked to campaigns
          query = query
            .eq('conversation_type', 'organic')
            .eq('status', 'active');
          break;

        case 'search':
          // Search folder doesn't store conversations
          // Return empty array - actual search results handled by frontend
          return [];

        case 'bounces':
          // Bounce folder - show bounced emails as pseudo-conversations
          // Get bounced emails from email_bounces table
          const { data: bouncedEmailsData, error: bounceError } = await this.retryDatabaseOperation(
            () => supabase
              .from('email_bounces')
              .select('*')
              .eq('organization_id', organizationId)
              .order('bounced_at', { ascending: false })
              .range(offset, offset + limit - 1)
          );

          if (bounceError) {
            console.error('❌ Error fetching bounces:', bounceError);
            throw bounceError;
          }

          if (!bouncedEmailsData || bouncedEmailsData.length === 0) {
            return [];
          }

          // Get additional details for each bounce
          const scheduledEmailIds = bouncedEmailsData.map(b => b.scheduled_email_id).filter(Boolean);
          const campaignIds = [...new Set(bouncedEmailsData.map(b => b.campaign_id).filter(Boolean))];
          const leadIds = [...new Set(bouncedEmailsData.map(b => b.lead_id).filter(Boolean))];

          // Fetch scheduled emails
          let scheduledEmailsMap = {};
          if (scheduledEmailIds.length > 0) {
            const { data: scheduledEmails } = await supabase
              .from('scheduled_emails')
              .select('id, subject, to_email')
              .in('id', scheduledEmailIds);

            scheduledEmailsMap = Object.fromEntries(
              (scheduledEmails || []).map(se => [se.id, se])
            );
          }

          // Fetch campaigns
          let campaignsMap = {};
          if (campaignIds.length > 0) {
            const { data: campaigns } = await supabase
              .from('campaigns')
              .select('id, name')
              .in('id', campaignIds);

            campaignsMap = Object.fromEntries(
              (campaigns || []).map(c => [c.id, c])
            );
          }

          // Fetch leads
          let leadsMap = {};
          if (leadIds.length > 0) {
            const { data: leads } = await supabase
              .from('leads')
              .select('id, first_name, last_name, email')
              .in('id', leadIds);

            leadsMap = Object.fromEntries(
              (leads || []).map(l => [l.id, l])
            );
          }

          // Transform bounced emails into conversation-like objects for display
          const bounceConversations = bouncedEmailsData.map(bounce => {
            const scheduledEmail = scheduledEmailsMap[bounce.scheduled_email_id];
            const campaign = campaignsMap[bounce.campaign_id];
            const lead = leadsMap[bounce.lead_id];

            const leadName = lead
              ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email
              : bounce.recipient_email;

            return {
              id: `bounce_${bounce.id}`, // Pseudo conversation ID
              subject: scheduledEmail?.subject || '(No subject)',
              participants: [bounce.recipient_email || scheduledEmail?.to_email || 'Unknown'],
              conversation_type: 'bounce',
              status: 'bounced',
              message_count: 1,
              unread_count: 1, // Mark as unread by default
              last_activity_at: bounce.bounced_at,
              last_message_preview: `${bounce.bounce_type} bounce: ${bounce.bounce_reason}`,
              created_at: bounce.bounced_at,
              campaign_id: bounce.campaign_id,
              lead_id: bounce.lead_id,
              campaign_name: campaign?.name || null,
              lead_name: leadName,
              labels: [],
              is_read: false,
              // Bounce-specific fields
              bounce_type: bounce.bounce_type,
              bounce_reason: bounce.bounce_reason,
              scheduled_email_id: bounce.scheduled_email_id,
              // Timezone conversion
              last_activity_at_display: timezone
                ? TimezoneService.convertToUserTimezone(bounce.bounced_at, timezone)
                : null
            };
          });

          console.log(`✅ Retrieved ${bounceConversations.length} bounced emails as pseudo-conversations`);
          return bounceConversations;

        default:
          throw new Error(`Invalid folder type: ${folderType}`);
      }

      // Enhanced search - apply comprehensive search across all email fields
      if (search && search.trim()) {
        const searchTerm = search.trim();
        const searchTermLower = searchTerm.toLowerCase();
        
        console.log(`🔍 Applying enhanced search for: "${searchTerm}"`);
        
        try {
          // First get conversations that have matching messages in their content
          const { data: conversationsWithMatchingMessages, error: messageSearchError } = await supabase
            .from('conversation_messages')
            .select('conversation_id')
            .eq('organization_id', organizationId)
            .or(`from_email.ilike.%${searchTermLower}%,to_email.ilike.%${searchTermLower}%,content_html.ilike.%${searchTerm}%,content_plain.ilike.%${searchTerm}%,from_name.ilike.%${searchTerm}%`);
          
          if (messageSearchError) {
            console.error('❌ Error searching messages - Details:');
            console.error('  Code:', messageSearchError.code);
            console.error('  Message:', messageSearchError.message);
            console.error('  Details:', messageSearchError.details);
            console.error('  Hint:', messageSearchError.hint);
            // Fall back to basic search
            query = query.ilike('subject', `%${searchTerm}%`);
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
            }
            
            // Additional separate search for participants array
            // Use contains to check if participants array includes the search term
            if (searchTermLower && searchTermLower.includes('@')) {
              // If search term looks like an email, search in participants
              const currentQuery = query;
              query = query.or(`participants.cs.{"${searchTermLower}"}`);
            }
          }
        } catch (searchError) {
          console.error('❌ Search error, falling back to basic search:', searchError);
          // Fall back to basic search
          query = query.ilike('subject', `%${searchTerm}%`);
        }
      }

      // Apply unread filter if requested
      if (unreadOnly) {
        query = query.gt('unread_count', 0);
        console.log('🔍 Applied unread filter: showing only conversations with unread_count > 0');
      }

      // Apply label filter if provided
      if (labelIds && labelIds.length > 0) {
        console.log('🏷️ Applying label filter for labelIds:', labelIds);
        
        try {
          // First, get conversation IDs that have any of the specified labels
          const { data: labelAssignments, error: labelError } = await supabase
            .from('conversation_label_assignments')
            .select('conversation_id')
            .eq('organization_id', organizationId)
            .in('label_id', labelIds);
          
          if (labelError) {
            console.error('❌ Error getting label assignments:', labelError);
            console.error('❌ Label error details:', JSON.stringify(labelError, null, 2));
            // TEMPORARY FIX: Return without filtering instead of throwing error
            console.log('⚠️ Label filtering failed, continuing without filter...');
          } else {
            if (!labelAssignments || labelAssignments.length === 0) {
              console.log('🏷️ No conversations found with specified labels');
              return []; // No conversations have these labels
            }
            
            const conversationIds = labelAssignments.map(assignment => assignment.conversation_id);
            console.log('🏷️ Found', conversationIds.length, 'conversations with specified labels');
            
            // Filter main query by conversation IDs
            query = query.in('id', conversationIds);
          }
        } catch (filterError) {
          console.error('❌ Label filtering error caught:', filterError);
          console.log('⚠️ Continuing without label filter...');
          // Continue without filtering instead of failing
        }
      }

      // Sent folder filtering is now handled in the switch statement above

      // Apply pagination (sent folder handles its own pagination)
      if (folderType !== 'sent') {
        query = query.range(offset, offset + limit - 1);
      }

      console.log('🔍 DEBUG: About to execute final conversations query for folder:', folderType);
      
      // Special handling for sent folder since we override the query
      let conversations, error;
      if (folderType === 'sent' && query.data !== undefined) {
        conversations = query.data;
        error = query.error;
      } else {
        const result = await query;
        conversations = result.data;
        error = result.error;
      }
      
      console.log('🔍 DEBUG: Final query result:', { 
        conversations: conversations?.length || 0, 
        error: error?.message || 'none',
        folderType 
      });

      if (error) {
        console.error('❌ Error getting conversations:', error);
        throw error;
      }

      // No post-processing needed - sent folder now uses optimized query that already gets the right conversations
      let processedConversations = conversations || [];

      // Flatten label assignments and campaign data (like UnifiedInboxService)
      if (processedConversations.length > 0) {
        processedConversations = processedConversations.map(conversation => {
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
            // CRITICAL FIX: Add is_read property based on unread_count
            is_read: (conversation.unread_count || 0) === 0,
            // Convert last_activity_at to user timezone if timezone is provided
            last_activity_at_display: timezone
              ? TimezoneService.convertToUserTimezone(conversation.last_activity_at, timezone)
              : null,
            conversation_label_assignments: undefined, // Remove nested structure
            campaigns: undefined, // Remove nested structure
            leads: undefined // Remove nested structure
          };
        });
      }

        console.log(`✅ Retrieved ${processedConversations.length} conversations for ${folderType}`);
        return processedConversations;

      } catch (error) {
        console.error('❌ FolderService.getConversationsForFolder failed:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        console.error('❌ Query parameters:', { organizationId, folderType, options });
        console.error('❌ Search term:', options.search && options.search.trim() ? options.search.toLowerCase().trim() : 'none');
        throw error;
      }
    });
  }

  /**
   * Get individual folder count (real-time)
   */
  async getFolderCount(organizationId, folderType) {
    const cacheKey = `folderCount:${organizationId}:${folderType}`;

    return await this.getCachedOrExecute(cacheKey, async () => {
      try {
        console.log(`🔢 Getting count for folder: ${folderType}`);
        if (folderType === 'sent') {
          console.log('🚨 SENT FOLDER COUNT - NEW CODE ACTIVE');
        }

      let count = 0;

      switch (folderType) {
        case 'inbox':
          // Campaign conversations with unread replies
          const { count: inboxCount, error: inboxError } = await this.retryDatabaseOperation(
            () => supabase
              .from('conversations')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('conversation_type', 'campaign')
              .neq('status', 'archived')
              .gt('unread_count', 0) // Only count conversations with unread messages
          );

          if (inboxError) throw inboxError;
          count = inboxCount || 0;
          break;

        case 'sent':
          // IMPROVED: Use efficient fallback method since RPC function may not exist
          console.log('🔍 DEBUG: Calculating sent folder count using fallback method');
          
          // Get ALL conversations that have sent messages (no RPC dependency)
          const { data: sentConversations, error: fallbackError } = await this.retryDatabaseOperation(
            () => supabase
              .from('conversation_messages')
              .select('conversation_id, conversations!inner(status)')
              .eq('organization_id', organizationId)
              .eq('direction', 'sent')
              .eq('conversations.status', 'active')
              .limit(2000) // High limit to get all conversations
          );
          
          if (fallbackError) throw fallbackError;
          
          // Count unique conversation IDs
          const uniqueConversationIds = new Set(sentConversations?.map(msg => msg.conversation_id) || []);
          count = uniqueConversationIds.size;
          console.log('🔍 DEBUG: Efficient count of sent conversations:', count);
          break;

        case 'untracked_replies':
          // Organic conversations - count UNREAD ones only
          const { count: untrackedCount, error: untrackedError } = await this.retryDatabaseOperation(
            () => supabase
              .from('conversations')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('conversation_type', 'organic')
              .eq('status', 'active')
              .gt('unread_count', 0) // Only count conversations with unread messages
          );

          if (untrackedError) throw untrackedError;
          count = untrackedCount || 0;
          break;

        case 'bounces':
          // Bounce folder count - count all bounced emails directly from email_bounces table
          const { count: bounceCount, error: bounceCountError } = await this.retryDatabaseOperation(
            () => supabase
              .from('email_bounces')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
          );

          if (bounceCountError) throw bounceCountError;
          count = bounceCount || 0;
          break;

        case 'search':
          // Search folder has no persistent count
          count = 0;
          break;

        default:
          throw new Error(`Invalid folder type: ${folderType}`);
      }

        console.log(`✅ Count for ${folderType}: ${count}`);
        return count;

      } catch (error) {
        console.error(`❌ Error getting count for ${folderType}:`, error);
        return 0;
      }
    });
  }

  /**
   * Initialize system folders for organization (called during org creation)
   */
  async initializeFoldersForOrganization(organizationId) {
    try {
      console.log('🆕 Initializing system folders for organization:', organizationId);

      // Check if folders already exist
      const { data: existingFolders } = await supabase
        .from('system_folders')
        .select('type')
        .eq('organization_id', organizationId);

      if (existingFolders && existingFolders.length > 0) {
        console.log('ℹ️ Folders already exist for organization');
        return existingFolders;
      }

      // Create the 3 system folders
      const { data: newFolders, error } = await supabase
        .from('system_folders')
        .insert([
          {
            organization_id: organizationId,
            name: 'Inbox',
            icon: 'Inbox',
            type: 'inbox',
            sort_order: 1
          },
          {
            organization_id: organizationId,
            name: 'Sent',
            icon: 'Send',
            type: 'sent',
            sort_order: 2
          },
          {
            organization_id: organizationId,
            name: 'Untracked Replies',
            icon: 'MessageCircle',
            type: 'untracked_replies',
            sort_order: 3
          }
        ])
        .select();

      if (error) {
        console.error('❌ Error creating system folders:', error);
        throw error;
      }

      console.log('✅ System folders created:', newFolders?.length || 0);
      return newFolders;

    } catch (error) {
      console.error('❌ FolderService.initializeFoldersForOrganization failed:', error);
      throw error;
    }
  }

  /**
   * Get folder statistics for an organization
   */
  async getFolderStatistics(organizationId) {
    try {
      console.log('📊 Getting folder statistics for:', organizationId);

      // Sequential folder counts to prevent connection pool exhaustion
      const inboxCount = await this.getFolderCount(organizationId, 'inbox');
      const sentCount = await this.getFolderCount(organizationId, 'sent');
      const untrackedCount = await this.getFolderCount(organizationId, 'untracked_replies');
      const bounceCount = await this.getFolderCount(organizationId, 'bounces');

      const stats = {
        organizationId,
        totalConversations: inboxCount + untrackedCount + bounceCount, // Don't double count sent
        folders: {
          inbox: inboxCount,
          sent: sentCount,
          untracked_replies: untrackedCount,
          bounces: bounceCount
        },
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Folder statistics:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Error getting folder statistics:', error);
      throw error;
    }
  }

  /**
   * Refresh folder counts (for real-time updates)
   */
  async refreshFolderCounts(organizationId) {
    try {
      console.log('🔄 Refreshing folder counts for:', organizationId);

      // If using materialized view, refresh it
      const { error } = await this.retryDatabaseOperation(
        () => supabase.rpc('refresh_folder_counts')
      );
      
      if (error) {
        console.log('ℹ️ Materialized view refresh failed (may not exist):', error.message);
      }

      // Get fresh counts
      const folders = await this.getFoldersWithCounts(organizationId);
      
      console.log('✅ Folder counts refreshed');
      return folders;

    } catch (error) {
      console.error('❌ Error refreshing folder counts:', error);
      throw error;
    }
  }

  /**
   * Move conversation to different folder (archive/unarchive)
   */
  async moveConversationToFolder(conversationId, organizationId, targetFolder) {
    try {
      console.log(`📂 Moving conversation ${conversationId} to ${targetFolder}`);

      const updateData = {};

      switch (targetFolder) {
        case 'archive':
          updateData.is_archived = true;
          break;
        case 'inbox':
          updateData.is_archived = false;
          break;
        default:
          throw new Error(`Invalid target folder: ${targetFolder}`);
      }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ Error moving conversation:', error);
        throw error;
      }

      console.log('✅ Conversation moved successfully');
      return true;

    } catch (error) {
      console.error('❌ FolderService.moveConversationToFolder failed:', error);
      throw error;
    }
  }
}

module.exports = FolderService;