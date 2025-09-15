import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../lib/api'
import { Label } from './useLabels'
import { getUserTimezone } from '../lib/timezone'

interface Conversation {
  id: string
  subject: string
  last_activity_at?: string
  last_activity_at_display?: string // Timezone-converted display timestamp
  last_message_at?: string
  message_count: number
  is_read: boolean
  archived: boolean
  participants: string[]
  last_message_preview?: string
  conversation_type: 'sent' | 'received' | 'mixed'
  has_replies: boolean
  lead_name?: string
  campaign_name?: string
  email_account_id?: string
  labels?: Label[]
}

interface ConversationStats {
  total: number
  unread: number
  replied: number
  archived: number
  today: number
  active: number
}

interface InboxFilters {
  status?: 'all' | 'active' | 'archived'
  search?: string
  type?: string
  isRead?: boolean
  sender?: string
  dateFrom?: string
  dateTo?: string
  campaignId?: string
  labelIds?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useInbox(filters: InboxFilters = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [stats, setStats] = useState<ConversationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize filters to prevent infinite loops
  const memoizedFilters = useMemo(() => filters, [
    filters.status,
    filters.search,
    filters.type,
    filters.isRead,
    filters.sender,
    filters.dateFrom,
    filters.dateTo,
    filters.campaignId,
    filters.labelIds,
    filters.sortBy,
    filters.sortOrder
  ])

  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get user timezone for backend conversion
      const userTimezone = getUserTimezone()
      console.log('🔍 Frontend useInbox: getUserTimezone() returned:', userTimezone, typeof userTimezone)

      // Build query params
      const params = new URLSearchParams()
      params.append('status', memoizedFilters.status || 'active')
      params.append('limit', '50')
      params.append('offset', '0')

      // Only add timezone parameter if it's a valid timezone string (not null, undefined, or string 'null')
      if (userTimezone &&
          userTimezone !== 'null' &&
          userTimezone !== null &&
          userTimezone !== 'undefined' &&
          typeof userTimezone === 'string' &&
          userTimezone.length > 0) {
        params.append('timezone', userTimezone) // Add timezone parameter for conversion
        console.log('🔍 Frontend useInbox: Added timezone parameter:', userTimezone)
      } else {
        console.log('🔍 Frontend useInbox: Skipping timezone parameter, value was:', userTimezone, 'type:', typeof userTimezone)
        // Force browser timezone detection if getUserTimezone is failing
        try {
          const fallbackTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          if (fallbackTimezone && fallbackTimezone !== 'UTC') {
            params.append('timezone', fallbackTimezone)
            console.log('🔍 Frontend useInbox: Using fallback timezone:', fallbackTimezone)
          }
        } catch (fallbackError) {
          console.warn('🔍 Frontend useInbox: Fallback timezone detection failed:', fallbackError)
        }
      }

      params.append('_t', Date.now().toString()) // Cache buster for timestamp fixes

      console.log('🔍 Frontend useInbox: Final params.toString():', params.toString())
      
      if (memoizedFilters.search) params.append('search', memoizedFilters.search)
      if (memoizedFilters.type) params.append('type', memoizedFilters.type)
      if (memoizedFilters.isRead !== undefined) params.append('isRead', memoizedFilters.isRead.toString())
      if (memoizedFilters.sender) params.append('sender', memoizedFilters.sender)
      if (memoizedFilters.dateFrom) params.append('dateFrom', memoizedFilters.dateFrom)
      if (memoizedFilters.dateTo) params.append('dateTo', memoizedFilters.dateTo)
      if (memoizedFilters.campaignId) params.append('campaignId', memoizedFilters.campaignId)
      if (memoizedFilters.labelIds && memoizedFilters.labelIds.length > 0) {
        memoizedFilters.labelIds.forEach(labelId => params.append('labelIds', labelId))
      }
      if (memoizedFilters.sortBy) params.append('sortBy', memoizedFilters.sortBy)
      if (memoizedFilters.sortOrder) params.append('sortOrder', memoizedFilters.sortOrder)

      const response = await api.get(`/inbox/conversations?${params.toString()}`)
      
      if (response.data && response.data.conversations) {
        // Debug: Log first few conversation timestamps from API response
        console.log('🔍 API Response Analysis:')
        response.data.conversations.slice(0, 3).forEach((conv: any) => {
          console.log(`📧 ${conv.subject?.substring(0, 20)}... → last_activity_at: ${conv.last_activity_at} (${new Date(conv.last_activity_at).toLocaleTimeString()})`)
        })
        setConversations(response.data.conversations)
      } else {
        setConversations([])
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err)
      setError(err.message || 'Failed to fetch conversations')
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [memoizedFilters])

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/inbox/stats')
      if (response.data) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  const markAsRead = useCallback(async (conversationId: string, isRead: boolean) => {
    try {
      await api.put(`/inbox/conversations/${conversationId}/read`, { isRead })
      
      // Optimistically update local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, is_read: isRead } : conv
      ))
      
      // Refresh stats
      fetchStats()
    } catch (err) {
      console.error('Error marking conversation as read:', err)
    }
  }, [fetchStats])

  const archiveConversation = useCallback(async (conversationId: string, archived: boolean) => {
    try {
      await api.put(`/inbox/conversations/${conversationId}/archive`, { archived })
      
      // Optimistically update local state
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, archived } : conv
      ))
      
      // If we're viewing active/archived specifically, remove from list
      if (memoizedFilters.status !== 'all') {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      }
      
      // Refresh stats
      fetchStats()
    } catch (err) {
      console.error('Error archiving conversation:', err)
    }
  }, [memoizedFilters.status, fetchStats])

  const searchConversations = useCallback(async (query: string) => {
    if (!query) {
      return fetchConversations()
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.get(`/inbox/search?q=${encodeURIComponent(query)}&limit=20`)
      
      if (response.data && response.data.results) {
        setConversations(response.data.results)
      } else {
        setConversations([])
      }
    } catch (err: any) {
      console.error('Error searching conversations:', err)
      setError(err.message || 'Failed to search conversations')
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [fetchConversations])

  const bulkAction = useCallback(async (conversationIds: string[], action: string, value?: any) => {
    try {
      await api.post('/inbox/conversations/bulk-action', {
        conversationIds,
        action,
        value
      })
      
      // Refresh conversations and stats after bulk action
      fetchConversations()
      fetchStats()
    } catch (err) {
      console.error('Error performing bulk action:', err)
      throw err
    }
  }, [fetchConversations, fetchStats])

  const refreshConversations = useCallback(() => {
    fetchConversations()
    fetchStats()
  }, [fetchConversations, fetchStats])

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Set up polling for real-time updates (disabled to prevent constant refreshing)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchConversations()
  //     fetchStats()
  //   }, 60000) // Refresh every 60 seconds

  //   return () => clearInterval(interval)
  // }, [fetchConversations, fetchStats])

  return {
    conversations,
    stats,
    isLoading,
    error,
    markAsRead,
    archiveConversation,
    searchConversations,
    refreshConversations,
    bulkAction
  }
}