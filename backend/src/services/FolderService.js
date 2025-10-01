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
          // Campaign conversations - show only campaign conversations that have received replies
          // First get conversation IDs that have received messages
          const { data: repliedCampaignIds, error: replyError } = await this.retryDatabaseOperation(
            () => supabase
              .from('conversation_messages')
              .select('conversation_id')
              .eq('organization_id', organizationId)
              .eq('direction', 'received')
          );

          if (replyError) throw replyError;

          console.log('🔍 DEBUG INBOX: Found conversations with received messages:', repliedCampaignIds?.length || 0);

          if (!repliedCampaignIds || repliedCampaignIds.length === 0) {
            // No conversations with replies found - return empty result
            console.log('🔍 DEBUG INBOX: No replies found - returning empty result');
            return [];
          }

          const uniqueIds = [...new Set(repliedCampaignIds.map(msg => msg.conversation_id))];
          console.log('🔍 DEBUG INBOX: Unique conversation IDs with replies:', uniqueIds.length);

          // Get campaign conversations from those IDs
          const { data: campaignConversationsWithReplies, error: campaignError } = await this.retryDatabaseOperation(
            () => supabase
              .from('conversations')
              .select('id')
              .eq('organization_id', organizationId)
              .eq('conversation_type', 'campaign')
              .neq('status', 'archived')
              .in('id', uniqueIds)
          );

          if (campaignError) throw campaignError;

          console.log('🔍 DEBUG INBOX: Campaign conversations with replies:', campaignConversationsWithReplies?.length || 0);

          if (!campaignConversationsWithReplies || campaignConversationsWithReplies.length === 0) {
            // No campaign conversations with replies found - return empty result
            console.log('🔍 DEBUG INBOX: No campaign conversations with replies - returning empty result');
            return [];
          }

          const finalIds = campaignConversationsWithReplies.map(c => c.id);
          query = query.in('id', finalIds);
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

        case 'bounces':
          // Bounce conversations - filter by conversations with bounce messages
          // Get conversation IDs that have bounce messages
          const { data: bounceConvIds } = await supabase
            .from('conversation_messages')
            .select('conversation_id')
            .eq('organization_id', organizationId)
            .eq('direction', 'received')
            .or('from_email.ilike.%daemon%,from_email.ilike.%delivery%,subject.ilike.%bounce%,subject.ilike.%delivery%,subject.ilike.%undelivered%');

          if (bounceConvIds && bounceConvIds.length > 0) {
            const uniqueIds = [...new Set(bounceConvIds.map(c => c.conversation_id))];
            query = query.in('id', uniqueIds).eq('status', 'active');
          } else {
            // No bounce messages found - return empty result
            return [];
          }
          break;

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
          // Campaign conversations - count only campaign conversations that have received replies
          const { data: repliedCampaignIdsCount, error: replyCountError } = await this.retryDatabaseOperation(
            () => supabase
              .from('conversation_messages')
              .select('conversation_id')
              .eq('organization_id', organizationId)
              .eq('direction', 'received')
          );

          if (replyCountError) throw replyCountError;

          if (repliedCampaignIdsCount && repliedCampaignIdsCount.length > 0) {
            const uniqueIdsCount = [...new Set(repliedCampaignIdsCount.map(msg => msg.conversation_id))];

            const { count: inboxCount, error: inboxError } = await this.retryDatabaseOperation(
              () => supabase
                .from('conversations')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .eq('conversation_type', 'campaign')
                .neq('status', 'archived')
                .gt('unread_count', 0) // Only count conversations with unread messages
                .in('id', uniqueIdsCount) // Only conversations that have received replies
            );

            if (inboxError) throw inboxError;
            count = inboxCount || 0;
          } else {
            count = 0; // No conversations with replies
          }
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
          // Bounce conversations - count UNREAD conversations with bounce messages
          const { data: bounceConversations } = await this.retryDatabaseOperation(
            () => supabase
              .from('conversation_messages')
              .select('conversation_id')
              .eq('organization_id', organizationId)
              .eq('direction', 'received')
              .or('from_email.ilike.%daemon%,from_email.ilike.%delivery%,subject.ilike.%bounce%,subject.ilike.%delivery%,subject.ilike.%undelivered%')
          );

          if (bounceConversations) {
            const uniqueBounceIds = [...new Set(bounceConversations.map(c => c.conversation_id))];
            
            // Count UNREAD active conversations from the bounce IDs
            const { count: bounceCount, error: bounceError } = await this.retryDatabaseOperation(
              () => supabase
                .from('conversations')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .eq('status', 'active')
                .gt('unread_count', 0) // Only count conversations with unread messages
                .in('id', uniqueBounceIds)
            );

            if (bounceError) throw bounceError;
            count = bounceCount || 0;
          } else {
            count = 0;
          }
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