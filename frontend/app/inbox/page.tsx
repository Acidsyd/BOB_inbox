'use client'

import { useState, useMemo, useEffect } from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppLayout from '../../components/layout/AppLayout'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Checkbox } from '../../components/ui/checkbox'
import { 
  Search, 
  Archive, 
  Mail, 
  Star,
  RefreshCw,
  Circle,
  CheckCircle,
  Filter,
  Eye,
  EyeOff,
  Tag
} from 'lucide-react'
import { useInbox } from '../../hooks/useInbox'
import useFolders from '../../hooks/useFolders'
import { useEmailSync } from '../../hooks/useEmailSync'
import { useLabels } from '../../hooks/useLabels'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select'
import { api } from '../../lib/api'
import { InboxSidebar } from '../../components/inbox/InboxSidebar'
import { InboxConversationItem } from '../../components/inbox/InboxConversationItem'
import { InboxMessageView } from '../../components/inbox/InboxMessageView'
import { ComposeEmailModal } from '../../components/inbox/ComposeEmailModal'

function InboxContent() {
  // State
  const [selectedFolder, setSelectedFolder] = useState('inbox')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([])
  const [folderConversations, setFolderConversations] = useState<any[]>([])
  const [loadingFolderConversations, setLoadingFolderConversations] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedLabelId, setSelectedLabelId] = useState<string>('')
  
  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isComposeMinimized, setIsComposeMinimized] = useState(false)
  
  // Hooks
  const { getConversationsForFolder, folders, refreshFolders } = useFolders()
  const { onSyncCompleted, triggerManualSync } = useEmailSync()
  const { labels } = useLabels()
  
  // Local folder state for real-time count updates
  const [localFolders, setLocalFolders] = useState([])
  
  // Sync local folders with fetched folders
  useEffect(() => {
    if (folders && folders.length > 0) {
      setLocalFolders([...folders])
    }
  }, [folders])
  
  // Function to update folder counts locally (without backend call)
  const updateFolderCount = (folderType: string, countChange: number) => {
    setLocalFolders(prev => prev.map(folder => 
      folder.type === folderType 
        ? { ...folder, count: Math.max(0, folder.count + countChange) }
        : folder
    ))
  }
  
  // Load more conversations
  const loadMoreConversations = async () => {
    if (!loadingMore && hasMore) {
      console.log('📄 Loading more conversations...')
      await loadFolderConversations(selectedFolder, true)
    }
  }
  
  // Handle scroll to bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    // Trigger load more when user is near the bottom (within 100px)
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loadingMore) {
      loadMoreConversations()
    }
  }
  
  // Original inbox hook for message view and actions
  const { 
    markAsRead,
    archiveConversation,
    bulkAction
  } = useInbox()

  // Load conversations for selected folder
  const loadFolderConversations = async (folderType: string, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        setLoadingFolderConversations(true)
        setCurrentOffset(0)
      } else {
        setLoadingMore(true)
      }
      
      const offset = isLoadMore ? currentOffset : 0
      console.log(`📂 Loading conversations for folder: ${folderType}, offset: ${offset}, unreadOnly: ${showUnreadOnly}`)
      
      const { conversations, hasMore: moreAvailable } = await getConversationsForFolder(folderType, {
        limit: showUnreadOnly ? 1000 : 50, // Load more when filtering for unread
        offset: offset,
        search: searchQuery || undefined,
        unreadOnly: showUnreadOnly,
        labelIds: selectedLabelId ? [selectedLabelId] : undefined
      })
      
      if (isLoadMore) {
        // Append to existing conversations, avoiding duplicates
        setFolderConversations(prev => {
          const existingIds = new Set(prev.map(c => c.id))
          const newConversations = conversations.filter(c => !existingIds.has(c.id))
          return [...prev, ...newConversations]
        })
        setCurrentOffset(prev => prev + 50)
      } else {
        // Replace conversations
        setFolderConversations(conversations)
        setCurrentOffset(50)
      }
      
      setHasMore(moreAvailable)
      console.log(`✅ Loaded ${conversations.length} conversations for ${folderType}, hasMore: ${moreAvailable}`)
      
    } catch (error) {
      console.error('❌ Failed to load folder conversations:', error)
      if (!isLoadMore) {
        setFolderConversations([])
      }
    } finally {
      if (!isLoadMore) {
        setLoadingFolderConversations(false)
      } else {
        setLoadingMore(false)
      }
    }
  }

  // Handle folder selection
  const handleFolderSelect = (folderType: string) => {
    console.log(`📁 Folder selected: ${folderType}`)
    setSelectedFolder(folderType)
    setSelectedConversation(null) // Clear selection
    setSelectedConversationIds([])
    setSelectedLabelId('') // Clear label filter when changing folders
    // Reset pagination state
    setCurrentOffset(0)
    setHasMore(true)
    loadFolderConversations(folderType)
  }

  // Initialize with inbox and refresh folder counts
  useEffect(() => {
    console.log('📥 Inbox page loaded - triggering auto-sync')

    // Trigger sync when entering inbox page
    triggerManualSync().catch(error => {
      console.warn('⚠️ Auto-sync on page load failed:', error.message)
    })

    loadFolderConversations('inbox')
    // Force refresh folder counts on first load to get accurate unread counts
    refreshFolders()
  }, [triggerManualSync])


  // Listen for sync completion and auto-refresh current folder
  useEffect(() => {
    const unsubscribe = onSyncCompleted((result) => {
      console.log('📨 Sync completed, auto-refreshing current folder:', selectedFolder, result)
      
      // Auto-refresh the current folder to show new emails
      if (selectedFolder) {
        loadFolderConversations(selectedFolder)
      }
    })

    return unsubscribe
  }, [selectedFolder, onSyncCompleted])

  // Handle conversation selection
  const handleConversationSelect = async (conversationId: string) => {
    setSelectedConversation(conversationId)
    
    // Mark as read when opened
    const conv = folderConversations.find(c => c.id === conversationId)
    if (conv && !conv.is_read) {
      // Update local state immediately for responsive UI
      setFolderConversations(prev => prev.map(c => 
        c.id === conversationId 
          ? { ...c, is_read: true, unread_count: 0 }
          : c
      ))
      
      // Then make the API call
      try {
        await markAsRead(conversationId, true)
        // Update folder count locally (decrease unread count by 1)
        updateFolderCount(selectedFolder, -1)
      } catch (error) {
        console.error('Failed to mark as read:', error)
        // Revert on error
        setFolderConversations(prev => prev.map(c => 
          c.id === conversationId 
            ? { ...c, is_read: false, unread_count: conv.unread_count }
            : c
        ))
      }
    }
  }

  // Handle conversation check
  const handleConversationCheck = (conversationId: string, checked: boolean) => {
    if (checked) {
      setSelectedConversationIds(prev => [...prev, conversationId])
    } else {
      setSelectedConversationIds(prev => prev.filter(id => id !== conversationId))
    }
  }

  // Handle select all (only for currently filtered conversations)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredConversations.map(c => c.id)
      setSelectedConversationIds(allIds)
    } else {
      setSelectedConversationIds([])
    }
  }

  // Bulk actions
  const handleBulkMarkRead = async (isRead: boolean) => {
    try {
      // Count how many unread conversations we're marking as read
      const unreadCount = selectedConversationIds.reduce((count, id) => {
        const conv = folderConversations.find(c => c.id === id)
        return count + (!conv?.is_read && isRead ? 1 : 0)
      }, 0)
      
      await bulkAction(selectedConversationIds, 'markRead', isRead)
      setSelectedConversationIds([])
      
      // Update folder count locally (decrease by number of unread items marked as read)
      if (isRead && unreadCount > 0) {
        updateFolderCount(selectedFolder, -unreadCount)
      }
      
      // Refresh folder conversations
      loadFolderConversations(selectedFolder)
    } catch (error) {
      console.error('Bulk mark read failed:', error)
    }
  }

  const handleBulkArchive = async () => {
    try {
      // Count how many unread conversations we're archiving
      const unreadCount = selectedConversationIds.reduce((count, id) => {
        const conv = folderConversations.find(c => c.id === id)
        return count + (!conv?.is_read ? 1 : 0)
      }, 0)
      
      await bulkAction(selectedConversationIds, 'archive', true)
      setSelectedConversationIds([])
      
      // Update folder count locally (decrease by number of unread items archived)
      if (unreadCount > 0) {
        updateFolderCount(selectedFolder, -unreadCount)
      }
      
      // Refresh folder conversations
      loadFolderConversations(selectedFolder)
    } catch (error) {
      console.error('Bulk archive failed:', error)
    }
  }

  const handleBulkClear = () => {
    setSelectedConversationIds([])
  }

  // Handle search 
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  // Toggle unread filter
  const handleUnreadFilter = () => {
    const newUnreadOnly = !showUnreadOnly
    setShowUnreadOnly(newUnreadOnly)
    // Reset pagination and reload conversations with new filter
    setCurrentOffset(0)
    setHasMore(true)
    setSelectedConversationIds([]) // Clear selections when changing filter
    // Note: loadFolderConversations will use the updated showUnreadOnly value
    setTimeout(() => {
      loadFolderConversations(selectedFolder)
    }, 0) // Use setTimeout to ensure state update is applied
  }

  // Handle compose modal
  const handleComposeOpen = () => {
    setIsComposeOpen(true)
    setIsComposeMinimized(false)
  }

  const handleComposeClose = () => {
    setIsComposeOpen(false)
    setIsComposeMinimized(false)
  }

  const handleComposeMinimize = () => {
    setIsComposeMinimized(true)
  }

  const handleComposeRestore = () => {
    setIsComposeMinimized(false)
  }

  const handleEmailSent = () => {
    // Refresh current folder to show sent email in sent folder
    if (selectedFolder === 'sent') {
      loadFolderConversations('sent')
    }
    // Refresh folder counts
    refreshFolders()
  }

  // Handle label filter change
  const handleLabelFilter = async (labelId: string) => {
    console.log(`🏷️ Label filter changed: ${labelId}`)
    const actualLabelId = labelId === 'all' ? '' : labelId
    console.log(`🐛 Setting selectedLabelId to: "${actualLabelId}"`)
    setSelectedLabelId(actualLabelId)
    // Reset pagination and reload conversations with new label filter
    setCurrentOffset(0)
    setHasMore(true)
    setSelectedConversationIds([]) // Clear selections when changing filter
    
    // Load conversations immediately with the new label ID
    // Don't rely on state update timing, pass the actualLabelId directly
    try {
      setLoadingFolderConversations(true)
      
      const { conversations, hasMore: moreAvailable } = await getConversationsForFolder(selectedFolder, {
        limit: showUnreadOnly ? 1000 : 50,
        offset: 0,
        search: searchQuery || undefined,
        unreadOnly: showUnreadOnly,
        labelIds: actualLabelId ? [actualLabelId] : undefined // Use actualLabelId directly
      })
      
      setFolderConversations(conversations || [])
      setHasMore(moreAvailable)
      setCurrentOffset(50)
      
      console.log(`✅ Loaded ${conversations?.length || 0} conversations with label filter: ${actualLabelId || 'none'}`)
    } catch (error) {
      console.error('❌ Failed to load conversations with label filter:', error)
    } finally {
      setLoadingFolderConversations(false)
    }
  }

  // Conversations are now filtered by backend, so just use folderConversations
  const filteredConversations = folderConversations

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Refresh conversations with search after a delay
      if (selectedFolder) {
        console.log(`🔍 Executing search query: "${searchQuery}"`)
        // Reset pagination when searching
        setCurrentOffset(0)
        setHasMore(true)
        loadFolderConversations(selectedFolder)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery]) // Only trigger when search query changes


  const selectedConv = folderConversations.find(c => c.id === selectedConversation)
  const hasSelections = selectedConversationIds.length > 0

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      
      {/* Sidebar */}
      <InboxSidebar 
        selectedFolder={selectedFolder}
        onFolderSelect={handleFolderSelect}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        folders={localFolders}
        onCompose={handleComposeOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-w-0">
        
        {/* Compact Conversation List */}
        <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col min-w-0">
          
          {/* Ultra Compact Header */}
          <div className="px-2 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-sm font-medium text-gray-900 capitalize">
                {selectedFolder.replace('_', ' ')}
              </h1>
              <div className="flex items-center space-x-1">
                <Button
                  variant={showUnreadOnly ? "default" : "ghost"}
                  size="sm"
                  onClick={handleUnreadFilter}
                  className="h-6 px-2 text-xs"
                  title={showUnreadOnly ? "Show all conversations" : "Show only unread conversations"}
                >
                  {showUnreadOnly ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadFolderConversations(selectedFolder)}
                  disabled={loadingFolderConversations}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingFolderConversations ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Label Filter */}
            <div className="mb-2">
              <Select value={selectedLabelId || 'all'} onValueChange={handleLabelFilter}>
                <SelectTrigger className="h-6 text-xs">
                  <SelectValue placeholder="Filter by label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All conversations</SelectItem>
                  {labels.map((label) => (
                    <SelectItem key={label.id} value={label.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: label.color }}
                        />
                        <span>{label.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Folder-level Search */}
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search className="h-3 w-3 text-gray-400" />
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={`Search in ${selectedFolder.replace('_', ' ').toLowerCase()}...`}
                className="pl-7 pr-3 py-1 h-6 text-xs border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

          </div>

          {/* Ultra Compact Bulk Actions */}
          {hasSelections && (
            <div className="flex items-center justify-between px-2 py-1 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-medium text-blue-700">
                  {selectedConversationIds.length} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBulkMarkRead(true)}
                  className="h-5 px-1 text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkArchive}
                  className="h-5 px-1 text-xs"
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Archive
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkClear}
                className="h-5 px-1 text-xs"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
            {loadingFolderConversations ? (
              <div className="p-6 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2 text-sm">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <Mail className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-gray-500 mt-2 text-sm">
                  {selectedLabelId && !showUnreadOnly && !searchQuery
                    ? `No conversations with selected label`
                    : showUnreadOnly
                      ? 'No unread conversations'
                      : selectedFolder === 'inbox'
                        ? 'No campaign replies in inbox'
                        : 'No conversations found'
                  }
                </p>
                {searchQuery && (
                  <p className="text-gray-400 text-xs mt-1">
                    Try adjusting your search terms
                  </p>
                )}
                {showUnreadOnly && !searchQuery && !selectedLabelId && (
                  <p className="text-gray-400 text-xs mt-1">
                    All conversations have been read
                  </p>
                )}
                {selectedLabelId && !searchQuery && !showUnreadOnly && (
                  <p className="text-gray-400 text-xs mt-1">
                    Try selecting a different label or clearing the filter
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Ultra Compact Select All */}
                <div className="px-2 py-1 border-b border-gray-100">
                  <div className="flex items-center space-x-1.5">
                    <Checkbox
                      checked={
                        selectedConversationIds.length === filteredConversations.length &&
                        filteredConversations.length > 0
                      }
                      indeterminate={
                        selectedConversationIds.length > 0 &&
                        selectedConversationIds.length < filteredConversations.length
                          ? true 
                          : undefined
                      }
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      className="h-3 w-3"
                    />
                    <span className="text-xs text-gray-600">
                      Select all ({filteredConversations.length})
                    </span>
                  </div>
                </div>

                {/* Conversations */}
                <div className="divide-y divide-gray-100">
                  {filteredConversations.map((conversation) => (
                    <InboxConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversation === conversation.id}
                      isChecked={selectedConversationIds.includes(conversation.id)}
                      onClick={() => handleConversationSelect(conversation.id)}
                      onCheckChange={(checked) => handleConversationCheck(conversation.id, checked)}
                    />
                  ))}
                </div>

                {/* Load More / Loading Indicator */}
                {loadingMore && (
                  <div className="p-4 text-center border-t border-gray-100">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-1 text-xs">Loading more conversations...</p>
                  </div>
                )}
                
                {!hasMore && filteredConversations.length > 0 && (
                  <div className="p-4 text-center border-t border-gray-100">
                    <p className="text-gray-500 text-xs">
                      You've reached the end • {folderConversations.length} conversations total
                      {showUnreadOnly ? ` (${filteredConversations.length} unread shown)` : ''}
                    </p>
                  </div>
                )}
                
                {hasMore && !loadingMore && filteredConversations.length > 0 && (
                  <div className="p-2 text-center border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadMoreConversations}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Load more conversations
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message View */}
        <div className="flex-1 bg-white min-w-0">
          {selectedConv ? (
            <InboxMessageView
              conversation={selectedConv}
              onMarkRead={async () => {
                const newReadStatus = !selectedConv.is_read
                // Update local state immediately
                setFolderConversations(prev => prev.map(c => 
                  c.id === selectedConv.id 
                    ? { ...c, is_read: newReadStatus, unread_count: newReadStatus ? 0 : 1 }
                    : c
                ))
                
                // Then make the API call
                try {
                  await markAsRead(selectedConv.id, newReadStatus)
                  // Update folder count locally (±1 based on read status change)
                  const countChange = newReadStatus ? -1 : 1 // -1 if marking as read, +1 if marking as unread
                  updateFolderCount(selectedFolder, countChange)
                } catch (error) {
                  console.error('Failed to mark as read:', error)
                  // Revert on error
                  setFolderConversations(prev => prev.map(c => 
                    c.id === selectedConv.id 
                      ? { ...c, is_read: !newReadStatus, unread_count: !newReadStatus ? 0 : 1 }
                      : c
                  ))
                }
              }}
              onArchive={async () => {
                // Count if conversation was unread before archiving
                const wasUnread = !selectedConv.is_read
                await archiveConversation(selectedConv.id, true)
                // Update folder count locally (decrease if it was unread)
                if (wasUnread) {
                  updateFolderCount(selectedFolder, -1)
                }
              }}
              onClose={() => setSelectedConversation(null)}
              onStartReply={() => {}}
              onLabelsUpdated={(conversationId, newLabels) => {
                // Update local conversation list with new labels
                setFolderConversations(prev => prev.map(c => 
                  c.id === conversationId 
                    ? { ...c, labels: newLabels }
                    : c
                ))
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base">Select a conversation to view messages</p>
                <p className="text-xs text-gray-400 mt-1">
                  {showUnreadOnly ? `${filteredConversations.length} unread` : `${filteredConversations.length}`} conversations in {selectedFolder.replace('_', ' ')}
                  {selectedLabelId && (
                    <span> • Filtered by label</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        isMinimized={isComposeMinimized}
        onClose={handleComposeClose}
        onMinimize={handleComposeMinimize}
        onRestore={handleComposeRestore}
        onSent={handleEmailSent}
      />
    </div>
  )
}

export default function InboxPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <InboxContent />
      </AppLayout>
    </ProtectedRoute>
  )
}