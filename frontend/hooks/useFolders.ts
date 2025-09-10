import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface Folder {
  organization_id: string
  type: 'inbox' | 'sent' | 'untracked_replies'
  name: string
  icon: string
  sort_order: number
  count: number
}

export interface FolderStats {
  organizationId: string
  totalConversations: number
  folders: {
    inbox: number
    sent: number
    untracked_replies: number
  }
  lastUpdated: string
}

export interface Conversation {
  id: string
  subject: string
  participants: string[]
  conversation_type: 'campaign' | 'organic'
  status: string
  message_count: number
  unread_count: number
  last_activity_at: string
  last_message_preview: string
  is_archived: boolean
  created_at: string
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch folders with counts
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📁 Fetching folders...')
      const response = await api.get('/inbox/folders')
      
      console.log('✅ Folders fetched:', response.data.folders?.length || 0)
      setFolders(response.data.folders || [])
      
    } catch (err: any) {
      console.error('❌ Error fetching folders:', err)
      setError(err.response?.data?.error || 'Failed to fetch folders')
    } finally {
      setLoading(false)
    }
  }, [])

  // Get conversations for a specific folder
  const getConversationsForFolder = useCallback(async (
    folderType: string, 
    options: {
      limit?: number
      offset?: number
      search?: string
      unreadOnly?: boolean
      labelIds?: string[]
    } = {}
  ): Promise<{ conversations: Conversation[], hasMore: boolean }> => {
    try {
      console.log(`📂 Fetching conversations for folder: ${folderType}`)
      
      const params = new URLSearchParams()
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())
      if (options.search) params.append('search', options.search)
      if (options.unreadOnly) params.append('unreadOnly', 'true')
      if (options.labelIds && options.labelIds.length > 0) {
        // Add each labelId as a separate parameter for backend processing
        options.labelIds.forEach(labelId => params.append('labelIds', labelId))
      }
      params.append('_t', Date.now().toString()) // Cache buster for timestamp fixes
      
      const response = await api.get(`/inbox/folders/${folderType}/conversations?${params}`)
      
      console.log(`✅ Retrieved ${response.data.conversations?.length || 0} conversations for ${folderType}`)
      
      return {
        conversations: response.data.conversations || [],
        hasMore: response.data.pagination?.hasMore || false
      }
      
    } catch (err: any) {
      console.error(`❌ Error fetching conversations for ${folderType}:`, err)
      throw new Error(err.response?.data?.error || `Failed to fetch conversations for ${folderType}`)
    }
  }, [])

  // Get folder statistics
  const getFolderStats = useCallback(async (): Promise<FolderStats | null> => {
    try {
      console.log('📊 Fetching folder statistics...')
      const response = await api.get('/inbox/folders/stats')
      
      console.log('✅ Folder statistics retrieved')
      return response.data
      
    } catch (err: any) {
      console.error('❌ Error fetching folder statistics:', err)
      return null
    }
  }, [])

  // Refresh folder counts (manual trigger)
  const refreshFolders = useCallback(async () => {
    console.log('🔄 Refreshing folders...')
    await fetchFolders()
  }, [fetchFolders])

  // Get count for specific folder type
  const getFolderCount = useCallback((folderType: string): number => {
    const folder = folders.find(f => f.type === folderType)
    return folder?.count || 0
  }, [folders])

  // Initialize on mount
  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  return {
    // State
    folders,
    loading,
    error,
    
    // Actions
    fetchFolders,
    refreshFolders,
    getConversationsForFolder,
    getFolderStats,
    getFolderCount
  }
}

export default useFolders