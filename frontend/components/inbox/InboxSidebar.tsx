'use client'

import React, { useState } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import useFolders, { type Folder } from '../hooks/useFolders'
import useEmailSync from '../hooks/useEmailSync'
import AutoSyncControl from './AutoSyncControl'
import { 
  Inbox, 
  Send, 
  MessageCircle, 
  RefreshCw,
  Loader2,
  Menu,
  Plus,
  Edit
} from 'lucide-react'

interface InboxSidebarProps {
  selectedFolder: string
  onFolderSelect: (folderType: string) => void
  className?: string
  collapsed?: boolean
  onToggleCollapsed?: () => void
  folders?: any[] // Optional prop to override folders from hook
  onCompose?: () => void // New prop for compose button
}

const folderIcons = {
  inbox: Inbox,
  sent: Send,
  untracked_replies: MessageCircle
}

export function InboxSidebar({ 
  selectedFolder, 
  onFolderSelect, 
  className,
  collapsed = false,
  onToggleCollapsed,
  folders: propFolders,
  onCompose
}: InboxSidebarProps) {
  const { folders: hookFolders, loading, refreshFolders } = useFolders()
  const folders = propFolders || hookFolders
  const { triggerManualSync, syncing } = useEmailSync()
  const [refreshing, setRefreshing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{
    stage: 'connecting' | 'syncing' | 'processing' | 'complete'
    accountsTotal?: number
    accountsProcessed?: number
    messagesProcessed?: number
  } | null>(null)
  
  // Test console logging
  console.log('🟢 InboxSidebar RENDERED - Component is active')

  const handleFolderClick = (folderType: string) => {
    console.log(`📂 Selecting folder: ${folderType}`)
    onFolderSelect(folderType)
  }

  const handleManualSync = async () => {
    console.log('🔄 SYNC BUTTON CLICKED - handleManualSync called')
    try {
      console.log('🔄 Manual sync triggered from sidebar')
      setRefreshing(true)
      setSyncProgress({ stage: 'connecting' })
      
      // Trigger sync for all accounts
      console.log('🔄 About to call triggerManualSync...')
      setSyncProgress({ stage: 'syncing' })
      
      const result = await triggerManualSync()
      
      console.log('✅ Sync completed:', result)
      
      // Update progress with results
      if (result.results && result.results.length > 0) {
        const totalMessages = result.results.reduce((sum, r) => sum + (r.totalProcessed || 0), 0)
        setSyncProgress({ 
          stage: 'processing',
          accountsTotal: result.results.length,
          accountsProcessed: result.results.length,
          messagesProcessed: totalMessages
        })
      }
      
      // Show completion state briefly
      setSyncProgress({ stage: 'complete' })
      setTimeout(() => setSyncProgress(null), 2000)
      
      // Refresh folder counts after sync
      await refreshFolders()
      
    } catch (error) {
      console.error('❌ Sync failed:', error)
      setSyncProgress(null)
      // Error handling is done in the hook
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('w-64 bg-white border-r border-gray-200 p-4', className)}>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-200',
      collapsed ? 'w-12' : 'w-48',
      className
    )}>
      {/* Compact Header */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        {!collapsed && <h2 className="font-medium text-gray-900 text-sm">Inbox</h2>}
        <button
          onClick={onToggleCollapsed}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Compose Button */}
      {onCompose && (
        <div className="p-2 border-b border-gray-100">
          <Button
            onClick={onCompose}
            className={cn(
              "w-full justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white",
              collapsed ? "px-2" : "px-3"
            )}
            size="sm"
            title={collapsed ? "Compose new email" : undefined}
          >
            <Edit className="w-4 h-4" />
            {!collapsed && <span>Compose</span>}
          </Button>
        </div>
      )}

      {/* Compact Folder List */}
      <div className="p-1">
        <nav className="space-y-0.5">
          {folders.map((folder) => {
            const IconComponent = folderIcons[folder.type] || Inbox
            const isSelected = selectedFolder === folder.type
            
            return (
              <button
                key={folder.type}
                onClick={() => handleFolderClick(folder.type)}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-sm transition-colors',
                  'hover:bg-gray-50',
                  isSelected && 'bg-blue-50 text-blue-700 border border-blue-200',
                  collapsed && 'justify-center px-1'
                )}
                title={collapsed ? folder.name : undefined}
              >
                <div className={cn(
                  'flex items-center space-x-2',
                  collapsed && 'justify-center w-full'
                )}>
                  <IconComponent 
                    size={14} 
                    className={cn(
                      'text-gray-500',
                      isSelected && 'text-blue-600'
                    )} 
                  />
                  {!collapsed && (
                    <span className={cn(
                      'font-medium text-gray-700',
                      isSelected && 'text-blue-700'
                    )}>
                      {folder.name}
                    </span>
                  )}
                </div>
                
                {/* Compact Count Badge - Hide for sent folder since sent messages don't have unread status */}
                {!collapsed && folder.count > 0 && folder.type !== 'sent' && (
                  <Badge 
                    variant={isSelected ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs px-1 py-0 h-4 min-w-[16px] text-center',
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {folder.count > 99 ? '99+' : folder.count}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sync Button - Moved under folders */}
        <div className="mt-2 px-1">
          <Button
            onClick={(e) => {
              console.log('🔴 BUTTON CLICKED - RAW EVENT', e);
              handleManualSync();
            }}
            disabled={syncing || refreshing}
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-center h-7 text-xs",
              collapsed && "px-1"
            )}
            title={collapsed ? "Sync emails" : undefined}
          >
            {(syncing || refreshing) ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {!collapsed && (
                  <span className="ml-1">
                    {syncProgress?.stage === 'connecting' && 'Connecting...'}
                    {syncProgress?.stage === 'syncing' && 'Syncing...'}
                    {syncProgress?.stage === 'processing' && syncProgress.messagesProcessed !== undefined && 
                      `${syncProgress.messagesProcessed} msgs`}
                    {syncProgress?.stage === 'complete' && '✓ Complete'}
                    {!syncProgress && 'Syncing...'}
                  </span>
                )}
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                {!collapsed && <span className="ml-1">Sync</span>}
              </>
            )}
          </Button>
        </div>

        {/* Auto Sync Control - Only show when not collapsed */}
        {!collapsed && (
          <div className="mt-2 px-1">
            <AutoSyncControl className="w-full" />
          </div>
        )}
      </div>
    </div>
  )
}

export default InboxSidebar