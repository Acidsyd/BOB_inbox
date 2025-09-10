import { format, formatDistanceToNow } from 'date-fns'
import { 
  Mail, 
  Circle, 
  CheckCircle, 
  Archive, 
  MoreVertical,
  Reply,
  Clock,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  subject: string
  last_activity_at?: string
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
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMarkRead: (id: string, isRead: boolean) => void
  onArchive: (id: string, archived: boolean) => void
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
  selectionMode?: boolean
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onMarkRead,
  onArchive,
  selectedIds = [],
  onToggleSelect,
  selectionMode = false
}: ConversationListProps) {
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Unknown'
    try {
      // All database timestamps are now stored correctly - use direct parsing
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return 'Invalid date'
      
      const now = new Date()
      const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < 24) {
        return format(d, 'h:mm a')
      } else if (diffInHours < 48) {
        return 'Yesterday'
      } else if (diffInHours < 168) { // Less than a week
        return format(d, 'EEEE')
      } else {
        return format(d, 'MMM d')
      }
    } catch (error) {
      console.error('Error formatting date:', error, dateStr)
      return 'Invalid date'
    }
  }

  const getParticipantDisplay = (participants: string[]) => {
    if (participants.length === 0) return 'Unknown'
    if (participants.length === 1) return participants[0]
    if (participants.length === 2) return participants.join(', ')
    return `${participants[0]}, ${participants[1]} +${participants.length - 2}`
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={cn(
            "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
            selectedId === conversation.id && "bg-blue-50 hover:bg-blue-50",
            !conversation.is_read && "bg-blue-50/30"
          )}
          onClick={() => onSelect(conversation.id)}
        >
          <div className="flex items-start space-x-3">
            {selectionMode ? (
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(conversation.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    onToggleSelect?.(conversation.id)
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            ) : (
              <div className="pt-1">
                {conversation.is_read ? (
                  <CheckCircle className="h-5 w-5 text-gray-400" />
                ) : (
                  <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />
                )}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={cn(
                      "text-sm truncate",
                      !conversation.is_read && "font-semibold"
                    )}>
                      {getParticipantDisplay(conversation.participants)}
                    </p>
                    {conversation.lead_name && (
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {conversation.lead_name}
                      </Badge>
                    )}
                  </div>
                  
                  <p className={cn(
                    "text-sm truncate",
                    !conversation.is_read ? "font-medium" : "text-gray-900"
                  )}>
                    {conversation.subject || 'No subject'}
                  </p>
                  
                  {conversation.last_message_preview && (
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.last_message_preview}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.last_activity_at || conversation.last_message_at)}
                    </span>
                    
                    {conversation.message_count > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {conversation.message_count} messages
                      </Badge>
                    )}
                    
                    {conversation.has_replies && (
                      <Badge variant="default" className="text-xs">
                        <Reply className="h-3 w-3 mr-1" />
                        Replied
                      </Badge>
                    )}
                    
                    {conversation.campaign_name && (
                      <Badge variant="outline" className="text-xs">
                        {conversation.campaign_name}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="ml-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onMarkRead(conversation.id, !conversation.is_read)}>
                        {conversation.is_read ? (
                          <>
                            <Circle className="h-4 w-4 mr-2" />
                            Mark as unread
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as read
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onArchive(conversation.id, !conversation.archived)}>
                        <Archive className="h-4 w-4 mr-2" />
                        {conversation.archived ? 'Unarchive' : 'Archive'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}