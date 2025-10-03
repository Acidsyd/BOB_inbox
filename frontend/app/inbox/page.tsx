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
import { useTimezone } from '../../contexts/TimezoneContext'
import { useToast } from '../../components/ui/toast'
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
  const [isLiveSearching, setIsLiveSearching] = useState(false)
  const [searchPageToken, setSearchPageToken] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSearchHistory, setShowSearchHistory] = useState(false)
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null)
  const [searchScope, setSearchScope] = useState<'all' | 'inbox' | 'sent'>('all')
  const [searchDateRange, setSearchDateRange] = useState<'all' | '24h' | 'week' | 'month' | 'custom'>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isComposeMinimized, setIsComposeMinimized] = useState(false)
  
  // Hooks
  const { getConversationsForFolder, folders, refreshFolders } = useFolders()
  const { onSyncCompleted, triggerManualSync } = useEmailSync()
  const { labels } = useLabels()
  const { timezone } = useTimezone()
  const { addToast } = useToast()
  
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
        labelIds: selectedLabelId ? [selectedLabelId] : undefined,
        timezone: timezone
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
    setSearchPageToken(null) // Clear search pagination token when switching folders
    // Reset pagination state
    setCurrentOffset(0)
    setHasMore(true)
    loadFolderConversations(folderType)
  }

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('gmail_search_history')
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory))
      } catch (error) {
        console.error('Failed to parse search history:', error)
      }
    }
  }, [])

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to focus search folder
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handleFolderSelect('search')
        // Focus the search input after folder selection
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Search emails"]') as HTMLInputElement
          searchInput?.focus()
        }, 100)
      }

      // Escape to clear search and return to inbox
      if (e.key === 'Escape' && selectedFolder === 'search') {
        e.preventDefault()
        handleSearchChange('')
        handleFolderSelect('inbox')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFolder])

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
      // Skip if in search mode - search results are handled separately
      if (selectedFolder && selectedFolder !== 'search' && !isLiveSearching) {
        loadFolderConversations(selectedFolder)
      }
    })

    return unsubscribe
  }, [selectedFolder, onSyncCompleted, isLiveSearching])

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

  // Save search to history
  const saveSearchToHistory = (query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    // Add to history (max 10 items, remove duplicates)
    const newHistory = [trimmedQuery, ...searchHistory.filter(q => q !== trimmedQuery)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('gmail_search_history', JSON.stringify(newHistory))
  }

  // Handle live search - directly search Gmail without local database
  const handleLiveSearch = async (loadMore: boolean = false) => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return
    }

    try {
      setIsLiveSearching(true)

      // Build enhanced query with filters
      let enhancedQuery = searchQuery.trim()

      // Add scope filter
      if (searchScope === 'inbox') {
        enhancedQuery += ' in:inbox'
      } else if (searchScope === 'sent') {
        enhancedQuery += ' in:sent'
      }

      // Add date range filter
      if (searchDateRange === '24h') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '/')
        enhancedQuery += ` after:${dateStr}`
      } else if (searchDateRange === 'week') {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const dateStr = lastWeek.toISOString().split('T')[0].replace(/-/g, '/')
        enhancedQuery += ` after:${dateStr}`
      } else if (searchDateRange === 'month') {
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const dateStr = lastMonth.toISOString().split('T')[0].replace(/-/g, '/')
        enhancedQuery += ` after:${dateStr}`
      }

      console.log(`🔍 Executing live Gmail search for: "${enhancedQuery}"${loadMore ? ' (loading more)' : ''}`)

      // Reset pagination token when starting a new search (not loading more)
      if (!loadMore) {
        setSearchPageToken(null)
        setSearchStartTime(Date.now()) // Track search start time
        saveSearchToHistory(searchQuery) // Save to history
      }

      // Build API URL with optional pageToken for pagination
      let apiUrl = `/inbox/search/live?q=${encodeURIComponent(enhancedQuery)}&limit=50`
      if (loadMore && searchPageToken) {
        apiUrl += `&pageToken=${encodeURIComponent(searchPageToken)}`
      }

      const response = await api.get(apiUrl)

      console.log(`✅ Live search complete: ${response.data.results?.length || 0} results`)

      // Display the live search results as individual messages (not conversations)
      if (response.data.results && response.data.results.length > 0) {
        // Keep messages as-is without converting to conversation format
        const liveMessages = response.data.results.map((msg: any) => ({
          id: msg.provider_message_id,
          subject: msg.subject,
          from_email: msg.from_email,
          to_email: msg.to_email,
          is_read: msg.is_read,
          direction: msg.direction,
          sent_at: msg.sent_at,
          received_at: msg.received_at,
          preview: msg.content_plain?.substring(0, 100) || '',
          message_count: 1, // Single message, not a conversation
          unread_count: msg.is_read ? 0 : 1,
          participants: [msg.from_email, msg.to_email].filter(Boolean),
          latest_message_at: msg.sent_at || msg.received_at,
          searchedAccount: msg.searchedAccount,
          isLiveSearchResult: true // Mark as live search result
        }))

        // If loading more, append to existing results; otherwise replace
        if (loadMore) {
          setFolderConversations(prev => [...prev, ...liveMessages])
        } else {
          setFolderConversations(liveMessages)
        }

        // Store nextPageToken for pagination
        setSearchPageToken(response.data.nextPageToken || null)

        if (!loadMore) {
          const searchDuration = searchStartTime ? ((Date.now() - searchStartTime) / 1000).toFixed(2) : null
          addToast({
            title: 'Search completed',
            description: `Found ${response.data.results.length} results directly from Gmail${response.data.totalMatches > response.data.results.length ? ` (${response.data.totalMatches} total matches)` : ''}${searchDuration ? ` in ${searchDuration}s` : ''}`,
            type: 'success'
          })
        }
      } else {
        if (!loadMore) {
          addToast({
            title: 'No results found',
            description: 'No results found in Gmail for this search',
            type: 'info'
          })
        }
      }

    } catch (error: any) {
      console.error('❌ Live search failed:', error)
      addToast({
        title: 'Search failed',
        description: error.response?.data?.error || error.message,
        type: 'error'
      })
    } finally {
      setIsLiveSearching(false)
    }
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

            {/* Folder-level Search - Only show in non-search folders */}
            {selectedFolder !== 'search' && (
              <div className="mb-2 space-y-1">
                <div className="relative">
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
            )}

            {/* Dedicated Gmail Search UI - Only show in search folder */}
            {selectedFolder === 'search' && (
              <div className="mb-2 space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-900 mb-1">Gmail Live Search</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Search directly in Gmail across all your accounts
                </p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <Search className="h-3 w-3 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setShowSearchHistory(true)}
                    onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                    placeholder="Search emails (e.g., from:user@example.com)"
                    className="pl-7 pr-3 py-1 h-7 text-xs border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleLiveSearch()
                      }
                    }}
                  />
                  {/* Search History Dropdown */}
                  {showSearchHistory && searchHistory.length > 0 && !searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <div className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 border-b border-gray-200">
                        Recent searches
                      </div>
                      {searchHistory.map((query, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            handleSearchChange(query)
                            setShowSearchHistory(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center space-x-2"
                        >
                          <Search className="h-3 w-3 text-gray-400" />
                          <span>{query}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleLiveSearch}
                  disabled={!searchQuery || searchQuery.trim().length === 0 || isLiveSearching}
                  className="w-full h-7 text-xs bg-gray-700 hover:bg-gray-800"
                >
                  {isLiveSearching ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Searching Gmail...
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3 mr-1" />
                      Search Gmail (Enter)
                    </>
                  )}
                </Button>

                {/* Folder Scope Filter */}
                <div className="mt-2">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Search in:</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSearchScope('all')}
                      className={`px-2 py-1 text-xs rounded ${
                        searchScope === 'all'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Mail
                    </button>
                    <button
                      onClick={() => setSearchScope('inbox')}
                      className={`px-2 py-1 text-xs rounded ${
                        searchScope === 'inbox'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Inbox
                    </button>
                    <button
                      onClick={() => setSearchScope('sent')}
                      className={`px-2 py-1 text-xs rounded ${
                        searchScope === 'sent'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Sent
                    </button>
                  </div>
                </div>

                {/* Date Range Filter */}
                <div className="mt-2">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Time range:</label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setSearchDateRange('all')}
                      className={`px-2 py-1 text-xs rounded ${
                        searchDateRange === 'all'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setSearchDateRange('24h')}
                      className={`px-2 py-1 text-xs rounded ${
                        searchDateRange === '24h'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Last 24h
                    </button>
                    <button
                      onClick={() => setSearchDateRange('week')}
                      className={`px-2 py-1 text-xs rounded ${
                        searchDateRange === 'week'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Last Week
                    </button>
                    <button
                      onClick={() => setSearchDateRange('month')}
                      className={`px-2 py-1 text-xs rounded ${
                        searchDateRange === 'month'
                          ? 'bg-gray-700 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Last Month
                    </button>
                  </div>
                </div>

                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <button
                    onClick={() => handleSearchChange(searchQuery + (searchQuery ? ' ' : '') + 'has:attachment')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                  >
                    Has attachment
                  </button>
                  <button
                    onClick={() => handleSearchChange(searchQuery + (searchQuery ? ' ' : '') + 'is:unread')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => handleSearchChange(searchQuery + (searchQuery ? ' ' : '') + 'is:important')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                  >
                    Important
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  <p className="font-medium mb-0.5">Search operators:</p>
                  <ul className="space-y-0.5 text-gray-600">
                    <li>• from:sender@example.com</li>
                    <li>• to:recipient@example.com</li>
                    <li>• subject:"exact phrase"</li>
                    <li>• has:attachment</li>
                  </ul>
                </div>
              </div>
            )}

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

                {/* Search folder pagination - Show Load More if there's a nextPageToken */}
                {selectedFolder === 'search' && searchPageToken && !isLiveSearching && filteredConversations.length > 0 && (
                  <div className="p-2 text-center border-t border-gray-100">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleLiveSearch(true)}
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Load More Results
                    </Button>
                  </div>
                )}

                {!hasMore && filteredConversations.length > 0 && selectedFolder !== 'search' && (
                  <div className="p-4 text-center border-t border-gray-100">
                    <p className="text-gray-500 text-xs">
                      You've reached the end • {folderConversations.length} conversations total
                      {showUnreadOnly ? ` (${filteredConversations.length} unread shown)` : ''}
                    </p>
                  </div>
                )}

                {hasMore && !loadingMore && filteredConversations.length > 0 && selectedFolder !== 'search' && (
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