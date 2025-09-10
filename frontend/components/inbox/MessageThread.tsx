import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  X, 
  Archive, 
  Reply, 
  Forward, 
  MoreVertical,
  CheckCircle,
  Circle,
  Send,
  Paperclip,
  User,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useInboxMessages } from '@/hooks/useInboxMessages'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { stripTrackingElements } from '@/lib/strip-tracking-pixels'

interface Message {
  id: string
  message_id_header?: string
  from_email?: string
  to_email?: string
  subject?: string
  content_html?: string
  content_plain?: string
  sent_at?: string
  received_at?: string
  direction: 'sent' | 'received'
  is_reply?: boolean
  lead_name?: string
  campaign_name?: string
}

interface MessageThreadProps {
  conversation: any
  onClose: () => void
  onArchive: () => void
  onMarkRead: () => void
}

export function MessageThread({ conversation, onClose, onArchive, onMarkRead }: MessageThreadProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  
  const { messages, isLoading, error, refreshMessages } = useInboxMessages(conversation.id)

  useEffect(() => {
    // Expand the last message by default
    if (messages && messages.length > 0) {
      setExpandedMessages(new Set([messages[messages.length - 1].id]))
    }
  }, [messages])

  const toggleMessage = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  const handleSendReply = async () => {
    if (!replyContent.trim()) return
    
    try {
      // Get the first email account as sender (prefer OAuth2 accounts)
      const emailAccountsResponse = await api.get('/email-accounts');
      const { accounts } = emailAccountsResponse.data;
      
      // Prefer OAuth2 accounts over SMTP for better reliability
      const oauthAccount = accounts?.find(acc => acc.provider?.includes('oauth2'));
      const fromAccountId = oauthAccount?.id || accounts?.[0]?.id;
      
      if (!fromAccountId) {
        alert('No email account found. Please add an email account first.');
        return;
      }
      
      const response = await api.post(`/inbox/conversations/${conversation.id}/reply`, {
        content: replyContent,
        fromAccountId: fromAccountId
      });
      
      const responseData = response.data;
      
      setReplyContent('')
      setIsReplying(false)
      await refreshMessages() // Refresh to show the sent message
    } catch (error) {
      console.error('❌ Error sending reply:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send reply'
      alert(`Failed to send reply: ${errorMessage}`)
    }
  }

  const renderMessageContent = (message: Message) => {
    if (message.content_html) {
      // Sanitize HTML: remove scripts AND tracking pixels to prevent self-tracking
      const sanitizedHtml = message.content_html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      
      const cleanedHtml = stripTrackingElements(sanitizedHtml) // Remove tracking pixels/links
      
      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: cleanedHtml }} 
        />
      )
    }
    return (
      <div className="whitespace-pre-wrap text-sm">
        {message.content_plain || 'No content'}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">{conversation.subject || 'No subject'}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {conversation.participants?.join(', ')}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {messages?.length || 0} messages
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {(() => {
                  const date = conversation.last_activity_at || conversation.last_message_at
                  if (!date) return 'Unknown'
                  const d = new Date(date)
                  if (isNaN(d.getTime())) return 'Invalid date'
                  try {
                    return format(d, 'MMM d, yyyy')
                  } catch (error) {
                    return 'Invalid date'
                  }
                })()}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {conversation.lead_name && (
                <Badge variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {conversation.lead_name}
                </Badge>
              )}
              {conversation.campaign_name && (
                <Badge variant="secondary">
                  {conversation.campaign_name}
                </Badge>
              )}
              {conversation.has_replies && (
                <Badge variant="default">
                  <Reply className="h-3 w-3 mr-1" />
                  Has Replies
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkRead}
            >
              {conversation.is_read ? (
                <Circle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onArchive}
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading messages...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">Error loading messages</div>
        ) : messages?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No messages in this conversation</div>
        ) : (
          messages?.map((message, index) => (
            <div key={message.id} className="bg-white rounded-lg border">
              {/* Message Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleMessage(message.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                      message.direction === 'sent' ? "bg-blue-500" : "bg-gray-500"
                    )}>
                      {message.direction === 'sent' ? 'M' : (message.from_name || message.from_email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {message.direction === 'sent' ? 'Me' : (message.from_name || message.from_email || 'Unknown sender')}
                        </span>
                        {message.direction === 'sent' && (
                          <Badge variant="outline" className="text-xs">Sent</Badge>
                        )}
                        {message.is_reply && (
                          <Badge variant="default" className="text-xs">
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        to {message.to_email || 'Unknown recipient'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const date = message.sent_at || message.received_at
                          if (!date) return 'Unknown'
                          const d = new Date(date)
                          if (isNaN(d.getTime())) return 'Invalid date'
                          try {
                            return format(d, 'MMM d, yyyy h:mm a')
                          } catch (error) {
                            return 'Invalid date'
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {expandedMessages.has(message.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {!expandedMessages.has(message.id) && (
                  <div className="mt-2 text-sm text-gray-600 truncate">
                    {message.content_plain?.substring(0, 100)}...
                  </div>
                )}
              </div>

              {/* Message Content */}
              {expandedMessages.has(message.id) && (
                <>
                  <Separator />
                  <div className="p-4">
                    {renderMessageContent(message)}
                    
                    {/* Message Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsReplying(true)}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Forward className="h-4 w-4 mr-2" />
                        Forward
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reply Box */}
      {isReplying && (
        <div className="border-t p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Reply to {conversation.participants?.[0]}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Type your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <div className="flex justify-between">
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsReplying(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyContent.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}