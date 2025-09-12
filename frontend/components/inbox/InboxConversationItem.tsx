import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { 
  Circle, 
  Star, 
  Archive, 
  Reply, 
  User, 
  Building,
  MoreVertical 
} from 'lucide-react'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils'
import { ConversationLabelsCompact } from './ConversationLabels'
import { Label } from '../../hooks/useLabels'
import { useTimezone } from '../../contexts/TimezoneContext'

interface Conversation {
  id: string
  subject?: string
  participants?: string[]
  last_activity_at?: string
  message_count?: number
  unread_count?: number
  is_read?: boolean
  campaign_name?: string
  lead_name?: string
  has_replies?: boolean
  last_message_preview?: string
  conversation_type?: 'campaign' | 'organic'
  archived?: boolean
  labels?: Label[]
}

interface InboxConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  isChecked?: boolean
  onClick: () => void
  onCheckChange?: (checked: boolean) => void
}

export function InboxConversationItem({ conversation, isSelected, isChecked, onClick, onCheckChange }: InboxConversationItemProps) {
  // Simple debug log
  if (conversation.subject?.includes('ciao')) {
    console.log('CIAO CONVERSATION:', conversation.campaign_name || 'NO CAMPAIGN NAME');
  }
  
  // Timezone-aware date formatting
  const { formatConversationDate } = useTimezone()
  
  // Use timezone-aware formatting from context
  const formatDate = (dateStr?: string) => {
    return formatConversationDate(dateStr)
  }

  const getParticipantDisplay = () => {
    // If we have a proper lead_name, use it
    if (conversation.lead_name && conversation.lead_name.trim() && !conversation.lead_name.includes('@')) {
      return conversation.lead_name
    }
    
    if (conversation.participants && conversation.participants.length > 0) {
      const participant = conversation.participants[0]
      
      // Extract name from email if format is "Name <email@domain.com>"
      const nameMatch = participant.match(/^(.+?)\s*</)
      if (nameMatch) {
        return nameMatch[1].trim()
      }
      
      // Known mappings for specific users/clients
      const nameMap: { [key: string]: string } = {
        'gianpiero.difelice@gmail.com': 'Gianpiero Di Felice',
        'difelice@qquadro.com': 'Gianpiero Di Felice', 
        'gianpierodfg@ophirstd.com': 'Gianpiero Di Felice',
        'gianpiero@vnext-it.com': 'Gianpiero Di Felice',
        'g.impact@fieraimpact.it': 'Gianpiero Impact',
        'gpr.impact@fieraimpact.com': 'Gianpiero Impact',
        'santucci.rodolfo@vnext-it.com': 'Rodolfo Santucci',
        'alessia@ophirstd.com': 'Alessia Scattolon',
        'a.scattolon@ophirstd.com': 'Alessia Scattolon',
        's.alessia@ophirstd.com': 'Stefania Alessia'
      }
      
      // Check if we have a specific mapping
      if (nameMap[participant.toLowerCase()]) {
        return nameMap[participant.toLowerCase()]
      }
      
      // Extract and format name from email
      const emailPart = participant.split('@')[0]
      
      // Handle common patterns
      if (emailPart.includes('.')) {
        // "gianpiero.difelice" -> "Gianpiero Di Felice"
        return emailPart
          .split('.')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ')
      }
      
      // Single word: "gianpiero" -> "Gianpiero"
      return emailPart.charAt(0).toUpperCase() + emailPart.slice(1).toLowerCase()
    }
    
    return 'Unknown'
  }

  const getInitials = () => {
    const participant = getParticipantDisplay()
    return participant
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the row onClick
  }

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    onCheckChange?.(checked === true)
  }

  const handleRowClick = (e: React.MouseEvent) => {
    // Only trigger onClick if not clicking on checkbox
    if ((e.target as HTMLElement).closest('[data-checkbox]')) {
      return
    }
    onClick()
  }

  return (
    <div
      className={cn(
        "px-3 py-2 cursor-pointer transition-all duration-200 border-b border-gray-100 relative",
        isSelected 
          ? "bg-blue-100 border-blue-200 shadow-md ring-1 ring-blue-200" 
          : "hover:bg-gray-100/50",
        !conversation.is_read && !isSelected && "bg-blue-50/30"
      )}
      onClick={handleRowClick}
    >
      {/* Enhanced Selection Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
      )}
      <div className="flex items-center gap-2">
        {/* Checkbox */}
        {onCheckChange && (
          <div className="flex-shrink-0" data-checkbox onClick={handleCheckboxClick}>
            <Checkbox
              checked={isChecked}
              onCheckedChange={handleCheckboxChange}
              className="h-4 w-4"
            />
          </div>
        )}
        
        {/* Enhanced Compact Avatar */}
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0 transition-all duration-200",
          isSelected && "ring-2 ring-blue-400 ring-offset-1 ring-offset-blue-100 scale-110",
          conversation.conversation_type === 'campaign' 
            ? isSelected 
              ? "bg-blue-600" 
              : "bg-blue-500"
            : isSelected
              ? "bg-gray-700"
              : "bg-gray-500"
        )}>
          {getInitials()}
        </div>

        {/* Compact Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <h3 className={cn(
                "font-medium text-sm truncate transition-colors duration-200",
                isSelected 
                  ? "text-blue-900 font-semibold" 
                  : !conversation.is_read ? "text-gray-900" : "text-gray-700"
              )}>
                {getParticipantDisplay()}
              </h3>
              {!conversation.is_read && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
              )}
            </div>
            <span className="text-xs text-gray-500 shrink-0 ml-2">
              {formatDate(conversation.last_activity_at)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-0.5">
            <p className={cn(
              "text-xs truncate flex-1 mr-2 transition-colors duration-200",
              isSelected 
                ? "text-blue-800" 
                : !conversation.is_read ? "text-gray-800" : "text-gray-600"
            )}>
              <span className={cn(
                "font-medium mr-1",
                isSelected && "font-semibold text-blue-900"
              )}>
                {conversation.subject || 'No subject'}
              </span>
              {conversation.last_message_preview && (
                <span className={cn(
                  isSelected ? "text-blue-700" : "text-gray-500"
                )}>
                  - {conversation.last_message_preview}
                </span>
              )}
            </p>

            {/* Compact Badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {conversation.campaign_name && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 max-w-[120px] bg-blue-100 text-blue-800 border-blue-200" title={conversation.campaign_name}>
                  <Building className="h-3 w-3 mr-0.5 flex-shrink-0" />
                  <span className="truncate">{conversation.campaign_name}</span>
                </Badge>
              )}
              {conversation.has_replies && (
                <Badge variant="default" className="text-xs px-1 py-0 h-4">
                  <Reply className="h-2 w-2" />
                </Badge>
              )}
              {conversation.message_count > 1 && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                  {conversation.message_count}
                </Badge>
              )}
            </div>
          </div>

          {/* Labels row */}
          {conversation.labels && conversation.labels.length > 0 && (
            <div className="mt-1">
              <ConversationLabelsCompact 
                labels={conversation.labels} 
                className="justify-start"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}