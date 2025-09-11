import { useState } from 'react'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { 
  CheckSquare, 
  Square, 
  Archive, 
  CheckCircle, 
  Circle,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { Badge } from './ui/badge'

interface BulkActionsProps {
  selectedIds: string[]
  totalCount: number
  onSelectAll: (selected: boolean) => void
  onClearSelection: () => void
  onBulkAction: (action: string, value?: any) => Promise<void>
  isLoading?: boolean
}

export function BulkActions({ 
  selectedIds, 
  totalCount, 
  onSelectAll, 
  onClearSelection, 
  onBulkAction,
  isLoading = false 
}: BulkActionsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedIds.length === 0) return
    
    setActionLoading(action)
    try {
      await onBulkAction(action, value)
      onClearSelection()
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const allSelected = selectedIds.length === totalCount && totalCount > 0
  const someSelected = selectedIds.length > 0 && selectedIds.length < totalCount
  const noneSelected = selectedIds.length === 0

  if (noneSelected) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectAll(true)}
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-500">Select conversations</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border-b">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSelectAll(!allSelected)}
        className="h-8 w-8 p-0"
        disabled={isLoading}
      >
        {allSelected ? (
          <CheckSquare className="h-4 w-4 text-blue-600" />
        ) : someSelected ? (
          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
            <div className="h-2 w-2 bg-white rounded-sm" />
          </div>
        ) : (
          <Square className="h-4 w-4" />
        )}
      </Button>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {selectedIds.length} selected
        </Badge>
        
        <div className="flex items-center gap-1">
          {/* Mark as Read/Unread */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction('markRead', true)}
            disabled={actionLoading !== null}
            className="h-8"
          >
            {actionLoading === 'markRead' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">Mark Read</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction('markRead', false)}
            disabled={actionLoading !== null}
            className="h-8"
          >
            {actionLoading === 'markRead' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">Mark Unread</span>
          </Button>

          {/* Archive */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction('archive', true)}
            disabled={actionLoading !== null}
            className="h-8"
          >
            {actionLoading === 'archive' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">Archive</span>
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkAction('delete')}
            disabled={actionLoading !== null}
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {actionLoading === 'delete' ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">Delete</span>
          </Button>
        </div>

        <div className="h-4 w-px bg-gray-300 mx-2" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={actionLoading !== null}
          className="h-8 text-gray-500"
        >
          Clear Selection
        </Button>
      </div>
    </div>
  )
}