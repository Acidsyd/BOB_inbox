import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface Message {
  id: string
  conversation_id: string
  message_id_header: string
  thread_id?: string
  from_email: string
  to_email: string
  subject: string
  content_html?: string
  content_plain?: string
  sent_at: string
  direction: 'sent' | 'received'
  is_reply: boolean
  is_read: boolean // Added for bidirectional sync
  in_reply_to?: string
  message_references?: string[]
  lead_name?: string
  campaign_name?: string
  email_account_id?: string
  scheduled_email_id?: string
  provider_message_id?: string // Added for provider sync
  sync_status?: string // Added for sync status tracking
}

interface ReadSyncResult {
  success: boolean
  messageId: string
  isRead: boolean
  provider?: string
  syncedAt?: string
  error?: string
}

export function useInboxMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.get(`/inbox/conversations/${conversationId}/messages`)
      
      if (response.data && response.data.messages) {
        // Sort messages by sent_at date
        const sortedMessages = response.data.messages.sort((a: Message, b: Message) => 
          new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        )
        setMessages(sortedMessages)
      } else {
        setMessages([])
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err)
      setError(err.message || 'Failed to fetch messages')
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  const sendReply = useCallback(async (content: string, fromAccountId: string) => {
    if (!conversationId) {
      throw new Error('No conversation selected')
    }

    try {
      const response = await api.post(`/inbox/conversations/${conversationId}/reply`, {
        content,
        fromAccountId
      })
      
      // Refresh messages after sending
      await fetchMessages()
      
      return response.data
    } catch (err: any) {
      console.error('Error sending reply:', err)
      throw new Error(err.message || 'Failed to send reply')
    }
  }, [conversationId, fetchMessages])

  const refreshMessages = useCallback(() => {
    fetchMessages()
  }, [fetchMessages])

  // ============================================================================
  // BIDIRECTIONAL SYNC METHODS - App ↔ Provider
  // ============================================================================

  const markMessageAsRead = useCallback(async (messageId: string): Promise<ReadSyncResult> => {
    try {
      console.log('🔄 Marking message as read with provider sync:', messageId)
      
      // Optimistic update
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ))

      const response = await api.post(`/inbox/messages/${messageId}/read`)
      
      console.log('✅ Message marked as read:', response.data)
      
      // Refresh messages to ensure consistency
      await fetchMessages()
      
      return {
        success: true,
        messageId,
        isRead: true,
        provider: response.data.provider,
        syncedAt: response.data.syncedAt
      }

    } catch (error: any) {
      console.error('❌ Failed to mark message as read:', error)
      
      // Revert optimistic update on error
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: false } : msg
      ))

      return {
        success: false,
        messageId,
        isRead: true,
        error: error.message || 'Failed to mark as read'
      }
    }
  }, [fetchMessages])

  const markMessageAsUnread = useCallback(async (messageId: string): Promise<ReadSyncResult> => {
    try {
      console.log('🔄 Marking message as unread with provider sync:', messageId)
      
      // Optimistic update
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: false } : msg
      ))

      const response = await api.post(`/inbox/messages/${messageId}/unread`)
      
      console.log('✅ Message marked as unread:', response.data)
      
      // Refresh messages to ensure consistency
      await fetchMessages()
      
      return {
        success: true,
        messageId,
        isRead: false,
        provider: response.data.provider,
        syncedAt: response.data.syncedAt
      }

    } catch (error: any) {
      console.error('❌ Failed to mark message as unread:', error)
      
      // Revert optimistic update on error
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ))

      return {
        success: false,
        messageId,
        isRead: false,
        error: error.message || 'Failed to mark as unread'
      }
    }
  }, [fetchMessages])

  const markConversationAsRead = useCallback(async (): Promise<{ success: boolean, results?: any, error?: string }> => {
    if (!conversationId) {
      return { success: false, error: 'No conversation selected' }
    }

    try {
      console.log('🔄 Marking all messages in conversation as read:', conversationId)
      
      // Optimistic update - mark all messages as read
      setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })))

      const response = await api.post(`/inbox/conversations/${conversationId}/read`)
      
      console.log('✅ Conversation marked as read:', response.data)
      
      // Refresh messages to ensure consistency
      await fetchMessages()
      
      return {
        success: true,
        results: response.data.results
      }

    } catch (error: any) {
      console.error('❌ Failed to mark conversation as read:', error)
      
      // Refresh messages to revert optimistic update
      await fetchMessages()

      return {
        success: false,
        error: error.message || 'Failed to mark conversation as read'
      }
    }
  }, [conversationId, fetchMessages])

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Removed auto-polling to prevent constant refreshing
  // Messages will refresh manually when user interacts with the inbox
  // const interval polling was causing page refreshes every 10 seconds

  return {
    messages,
    isLoading,
    error,
    sendReply,
    refreshMessages,
    // Bidirectional sync methods
    markMessageAsRead,
    markMessageAsUnread,
    markConversationAsRead
  }
}