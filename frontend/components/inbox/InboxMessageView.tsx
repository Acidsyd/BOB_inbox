import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Textarea } from '../ui/textarea'
import dynamic from 'next/dynamic'
import { stripTrackingElements } from '../../lib/strip-tracking-pixels'

const RichTextEditor = dynamic(() => import('../ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })), {
  ssr: false,
  loading: () => <div className="border rounded-lg p-4 min-h-[120px] bg-gray-50 animate-pulse">Loading editor...</div>
})
import { VariablePicker, VariableOption } from '../ui/variable-picker'
import { 
  X, 
  Archive, 
  Reply, 
  Send,
  User,
  Calendar,
  Building,
  ChevronDown,
  ChevronUp,
  Mail,
  MailOpen,
  Type
} from 'lucide-react'
// Removed direct date-fns import - using timezone-aware formatting instead
import { useInboxMessages } from '../../hooks/useInboxMessages'
import { useTimezone } from '../../contexts/TimezoneContext'
import { Label } from '../../hooks/useLabels'
import { LabelPicker } from './LabelPicker'
import { ConversationLabelsFull } from './ConversationLabels'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'
import { uploadImage } from '../../lib/image-upload'
import { uploadAttachment } from '../../lib/attachment-upload'
import { formatHtmlForEmail, replaceVariables, extractPlainText } from '../../lib/email-formatter'

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
  is_read?: boolean
  from_name?: string
  provider_message_id?: string
  sync_status?: string
  campaign_name?: string
}

interface Conversation {
  id: string
  subject?: string
  participants?: string[]
  last_activity_at?: string
  last_activity_at_display?: string // Timezone-converted display timestamp
  campaign_name?: string
  lead_name?: string
  has_replies?: boolean
  is_read?: boolean
  archived?: boolean
  labels?: Label[]
}

interface InboxMessageViewProps {
  conversation: Conversation
  onArchive: () => void
  onMarkRead: () => void
  onClose: () => void
  onStartReply: () => void
  onLabelsUpdated?: (conversationId: string, labels: Label[]) => void
}

export function InboxMessageView({ 
  conversation, 
  onArchive, 
  onMarkRead, 
  onClose,
  onStartReply,
  onLabelsUpdated
}: InboxMessageViewProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [replyHtml, setReplyHtml] = useState('')
  const [useRichText, setUseRichText] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [conversationLabels, setConversationLabels] = useState<Label[]>(conversation.labels || [])
  
  // Timezone-aware date formatting
  const { formatMessageDate, timezone } = useTimezone()
  
  // Reset labels when conversation changes
  useEffect(() => {
    setConversationLabels(conversation.labels || [])
  }, [conversation.id, conversation.labels])
  
  // Handle label updates - update local state and notify parent
  const handleLabelsChange = (newLabels: Label[]) => {
    setConversationLabels(newLabels)
    // Notify parent component to update the conversation list
    onLabelsUpdated?.(conversation.id, newLabels)
  }
  const [attachments, setAttachments] = useState<Array<{url: string, name: string, size: number, type: string}>>([])
  
  const { 
    messages, 
    isLoading, 
    error, 
    refreshMessages,
    markMessageAsRead,
    markMessageAsUnread,
    markConversationAsRead
  } = useInboxMessages(conversation.id, timezone)

  // Keyboard shortcuts for reply box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReplying && e.key === 'Escape') {
        handleCancelReply()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isReplying])

  // Auto-expand the latest message
  useEffect(() => {
    if (messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      setExpandedMessages(new Set([latestMessage.id]))
    }
  }, [messages])

  // Reset reply state when conversation changes
  useEffect(() => {
    setIsReplying(false)
    setReplyContent('')
    setReplyHtml('')
    setUseRichText(true) // Default to rich text mode
    setAttachments([])
  }, [conversation.id])

  // 5-second auto-read functionality - completely isolated from state changes
  const autoReadTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentConversationId = useRef<string | null>(null)
  const hasBeenProcessed = useRef<boolean>(false)
  
  useEffect(() => {
    // If this is a new conversation or the conversation changed
    if (conversation && currentConversationId.current !== conversation.id) {
      // Clear any existing timer
      if (autoReadTimerRef.current) {
        clearTimeout(autoReadTimerRef.current)
        autoReadTimerRef.current = null
      }
      
      // Update tracking
      currentConversationId.current = conversation.id
      hasBeenProcessed.current = false
      
      // Only set timer if conversation is unread and not already processed
      if (!conversation.is_read && !hasBeenProcessed.current) {
        console.log('📖 Starting 5-second auto-read timer for conversation:', conversation.id)
        
        autoReadTimerRef.current = setTimeout(() => {
          // Double-check the conversation ID hasn't changed before marking as read
          if (currentConversationId.current === conversation.id && !hasBeenProcessed.current) {
            console.log('📖 Auto-marking conversation as read after 5 seconds')
            hasBeenProcessed.current = true
            onMarkRead?.()
          }
        }, 5000)
      }
    }
    
    // If conversation becomes read, mark as processed to prevent future timers
    if (conversation && conversation.is_read) {
      hasBeenProcessed.current = true
    }

    return () => {
      if (autoReadTimerRef.current) {
        clearTimeout(autoReadTimerRef.current)
        autoReadTimerRef.current = null
      }
    }
  }, [conversation?.id, conversation?.is_read]) // Only depend on ID and read status

  const toggleMessage = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  const handleStartReply = () => {
    setIsReplying(true)
    
    // Get the latest message to quote in reply
    const latestMessage = messages?.length ? messages[messages.length - 1] : null
    let quotedContent = ''
    let quotedHtml = ''
    
    if (latestMessage) {
      const senderName = getSenderName(latestMessage)
      const messageDate = formatDate(latestMessage)
      const quotedText = latestMessage.content_plain || extractPlainText(latestMessage.content_html || '')
      
      // Plain text quote format
      quotedContent = `\n\nOn ${messageDate}, ${senderName} wrote:\n> ${quotedText.replace(/\n/g, '\n> ')}`
      
      // HTML quote format  
      quotedHtml = `
        <br><br>
        <blockquote style="border-left: 4px solid #ccc; margin: 16px 0; padding-left: 16px; color: #666;">
          <div style="font-size: 14px; color: #888; margin-bottom: 8px;">
            On ${messageDate}, ${senderName} wrote:
          </div>
          <div style="color: #666;">
            ${latestMessage.content_html || `<p>${quotedText.replace(/\n/g, '<br>')}</p>`}
          </div>
        </blockquote>
      `
    }
    
    setReplyContent(quotedContent)
    setReplyHtml(quotedHtml)
    setUseRichText(true) // Default to rich text mode
    setAttachments([])
  }

  const handleCancelReply = () => {
    setIsReplying(false)
    setReplyContent('')
    setReplyHtml('')
    setUseRichText(true) // Reset to rich text mode as default
    setAttachments([])
  }

  const handleRichTextChange = (html: string, text: string) => {
    setReplyHtml(html)
    setReplyContent(text)
  }

  const handleAttachmentUpload = async (file: File) => {
    try {
      const attachment = await uploadAttachment(file)
      setAttachments(prev => [...prev, attachment])
      return attachment
    } catch (error) {
      console.error('Failed to upload attachment:', error)
      throw error
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSendReply = async () => {
    if (!replyContent.trim() || isSending) return
    
    setIsSending(true)
    
    try {
      const emailAccountsResponse = await api.get('/email-accounts')
      const { accounts } = emailAccountsResponse.data
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No email accounts found. Please add an email account first.')
      }
      
      // Find the account that received the original message to reply from
      const lastReceivedMessage = messages?.find(m => m.direction === 'received')
      let fromAccountId = ''
      
      if (lastReceivedMessage?.to_email && accounts) {
        // Find account by the email that received the message
        const receivingAccount = accounts.find(acc => 
          acc.email.toLowerCase() === lastReceivedMessage.to_email.toLowerCase()
        )
        fromAccountId = receivingAccount?.id || ''
        console.log('📬 Auto-selected reply account:', receivingAccount?.email, 'ID:', fromAccountId)
      }
      
      // Fallback to first OAuth2 account if no match found
      if (!fromAccountId && accounts) {
        const oauthAccount = accounts.find(acc => acc.provider?.includes('oauth2'))
        fromAccountId = oauthAccount?.id || accounts[0]?.id || ''
        console.log('📬 Fallback to first OAuth2 account:', oauthAccount?.email, 'ID:', fromAccountId)
      }
      
      if (!fromAccountId) {
        throw new Error('No valid email account ID found.')
      }
      
      // Get lead data for variable substitution
      const leadData = {
        first_name: conversation.lead_name?.split(' ')[0] || '',
        last_name: conversation.lead_name?.split(' ').slice(1).join(' ') || '',
        full_name: conversation.lead_name || '',
        email: conversation.participants?.[0] || '',
        campaign_name: conversation.campaign_name || ''
      }

      // Process content with variables
      let processedHtml = useRichText && replyHtml 
        ? formatHtmlForEmail(replaceVariables(replyHtml, leadData))
        : formatHtmlForEmail(`<p>${replaceVariables(replyContent, leadData).replace(/\n/g, '<br>')}</p>`)
      
      // Add attachments to HTML if any exist
      if (attachments.length > 0) {
        const attachmentHtml = attachments.map(attachment => {
          const fileIcon = attachment.type.includes('pdf') ? '📄' : 
                          attachment.type.includes('image') ? '🖼️' : 
                          attachment.type.includes('word') ? '📝' : '📎'
          return `
            <div style="display: inline-block; margin: 8px 4px; vertical-align: middle;">
              <div style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 14px; max-width: 300px; text-decoration: none; font-family: Arial, sans-serif;">
                <span style="font-size: 16px;">${fileIcon}</span>
                <div>
                  <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${attachment.name}</div>
                  <div style="font-size: 12px; color: #3b82f6;">${formatFileSize(attachment.size)}</div>
                </div>
              </div>
            </div>
          `
        }).join('')
        
        processedHtml += `<div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb;"><div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Attachments:</div>${attachmentHtml}</div>`
      }
      
      const processedText = replaceVariables(replyContent, leadData)

      const requestData = {
        content: processedText,
        html: processedHtml,
        fromAccountId: fromAccountId,
        attachments: attachments
      }
      
      await api.post(`/inbox/conversations/${conversation.id}/reply`, requestData)
      
      setReplyContent('')
      setReplyHtml('')
      setAttachments([])
      setIsReplying(false)
      await refreshMessages()
      
    } catch (error: any) {
      console.error('❌ Error sending reply:', error)
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to send reply'
      alert(`Failed to send reply: ${errorMessage}`)
    } finally {
      setIsSending(false)
    }
  }

  const handleMarkMessageRead = async (messageId: string, currentReadState: boolean) => {
    try {
      if (currentReadState) {
        await markMessageAsUnread(messageId)
      } else {
        await markMessageAsRead(messageId)
      }
    } catch (error: any) {
      console.error('❌ Error toggling message read state:', error)
      const action = currentReadState ? 'unread' : 'read'
      alert(`Failed to mark message as ${action}: ${error.message}`)
    }
  }

  const handleMarkConversationRead = async () => {
    try {
      await markConversationAsRead()
      onMarkRead() // Update parent component state
    } catch (error: any) {
      console.error('❌ Error marking conversation as read:', error)
      alert(`Failed to mark conversation as read: ${error.message}`)
    }
  }


  // Use timezone-aware formatting - prefer display fields from backend conversion
  const formatDate = (message: Message) => {
    // Use backend-converted display timestamp if available, otherwise fallback to timezone context
    const displayTime = message.sent_at_display || message.received_at_display
    if (displayTime) {
      return displayTime
    }
    // Fallback to original context-based formatting
    return formatMessageDate(message.sent_at || message.received_at)
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
      <div className="whitespace-pre-wrap text-sm text-gray-700">
        {message.content_plain || 'No content'}
      </div>
    )
  }

  const getSenderName = (message: Message) => {
    // For sent messages, try to get the actual sender name first
    if (message.direction === 'sent') {
      if (message.from_name && message.from_name !== 'Me') {
        return message.from_name
      }
      
      if (message.from_email) {
        const nameMatch = message.from_email.match(/^(.+?)\s*</)
        if (nameMatch) return nameMatch[1].trim()
        
        // Get name from email address
        const emailPart = message.from_email.split('@')[0]
        return emailPart.charAt(0).toUpperCase() + emailPart.slice(1).replace(/[._-]/g, ' ')
      }
      
      return 'You' // Fallback for sent messages
    }
    
    // For received messages
    if (message.from_name) return message.from_name
    
    if (message.from_email) {
      const nameMatch = message.from_email.match(/^(.+?)\s*</)
      if (nameMatch) return nameMatch[1].trim()
      
      const emailPart = message.from_email.split('@')[0]
      return emailPart.charAt(0).toUpperCase() + emailPart.slice(1).replace(/[._-]/g, ' ')
    }
    
    return 'Unknown sender'
  }

  const getSenderInitials = (message: Message) => {
    const name = getSenderName(message)
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // Helper function to create proper client names from email addresses
  const getClientDisplayName = (conversation: Conversation) => {
    // If we have a proper lead_name, use it
    if (conversation.lead_name && conversation.lead_name.trim() && !conversation.lead_name.includes('@')) {
      return conversation.lead_name
    }

    // Get the participant email
    const participantEmail = conversation.participants?.[0]
    if (!participantEmail) return 'Unknown Client'

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
    if (nameMap[participantEmail.toLowerCase()]) {
      return nameMap[participantEmail.toLowerCase()]
    }
    
    // Extract and format name from email
    const emailPrefix = participantEmail.split('@')[0]
    
    // Handle common patterns
    if (emailPrefix.includes('.')) {
      // "gianpiero.difelice" -> "Gianpiero Di Felice"
      return emailPrefix
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')
    }
    
    // Single word: "gianpiero" -> "Gianpiero"
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase()
  }

  return (
    <div className="h-full flex flex-col relative bg-white">
      {/* Client-Focused Header */}
      <div className="border-b px-4 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Client Name - Big */}
            <h1 className="text-2xl font-bold text-gray-900 truncate mb-2">
              {getClientDisplayName(conversation)}
            </h1>
            
            {/* Campaign Name */}
            {conversation.campaign_name && (
              <div className="mb-3">
                <Badge variant="default" className="text-sm px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200">
                  <Building className="h-4 w-4 mr-1" />
                  {conversation.campaign_name}
                </Badge>
              </div>
            )}

            {/* Labels */}
            {conversationLabels && conversationLabels.length > 0 && (
              <div className="mb-3">
                <ConversationLabelsFull
                  labels={conversationLabels}
                  className="flex-wrap"
                />
              </div>
            )}
            
            {/* Email Details */}
            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 min-w-[40px]">To:</span>
                <span className="truncate text-gray-900">{conversation.participants?.[0] || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 min-w-[40px]">From:</span>
                <span className="truncate text-gray-900">
                  {messages?.find(m => m.direction === 'sent')?.from_email || 
                   messages?.find(m => m.direction === 'received')?.to_email || 
                   'Unknown sender'}
                </span>
              </div>
            </div>
            
            {/* Subject and Date */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span className="font-medium">Subject:</span>
                <span className="truncate flex-1">{conversation.subject || 'No subject'}</span>
                <span>•</span>
                <span>
                  {conversation.last_activity_at_display || formatMessageDate(conversation.last_activity_at)} ({timezone})
                </span>
              </div>
            </div>
          </div>
          
          {/* Compact Actions */}
          <div className="flex items-center gap-1 ml-4">
            <LabelPicker
              conversationId={conversation.id}
              currentLabels={conversationLabels}
              onLabelsChange={handleLabelsChange}
            />
            <Button variant="ghost" size="sm" onClick={onArchive} className="h-7 px-2">
              <Archive className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={cn(
        "overflow-y-auto px-4 py-2",
        isReplying ? "flex-1" : "flex-1"
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-500">
              <p className="text-sm">Error loading messages</p>
            </div>
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-sm">No messages in this conversation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl">
            {messages?.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "border rounded-md shadow-sm transition-all duration-200",
                  expandedMessages.has(message.id) && "ring-2 ring-blue-500 shadow-md",
                  message.direction === 'sent' 
                    ? expandedMessages.has(message.id)
                      ? "bg-gray-50 border-gray-200" 
                      : "bg-gray-50/50 border-gray-100"
                    : expandedMessages.has(message.id)
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-200"
                )}
              >
                {/* Compact Message Header with Enhanced Selection Indicator */}
                <div 
                  className={cn(
                    "p-3 cursor-pointer transition-all duration-200 relative",
                    expandedMessages.has(message.id) && "bg-gradient-to-r from-gray-100 to-transparent",
                    message.direction === 'sent' 
                      ? "hover:bg-gray-100" 
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => toggleMessage(message.id)}
                >
                  {/* Selection indicator bar */}
                  {expandedMessages.has(message.id) && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                  )}
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0 mt-0.5 transition-all duration-200",
                      expandedMessages.has(message.id) && "ring-2 ring-white ring-offset-2 ring-offset-blue-100 scale-110",
                      message.direction === 'sent' 
                        ? expandedMessages.has(message.id) 
                          ? "bg-blue-600" 
                          : "bg-blue-500"
                        : expandedMessages.has(message.id)
                          ? "bg-gray-700"
                          : "bg-gray-500"
                    )}>
                      {getSenderInitials(message)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={cn(
                            "font-medium text-sm truncate",
                            message.direction === 'sent' 
                              ? "text-blue-700" 
                              : "text-gray-900"
                          )}>
                            {message.direction === 'sent' 
                              ? (message.from_email || getSenderName(message))
                              : getSenderName(message)
                            }
                          </span>
                          {message.direction === 'sent' && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-1 py-0">
                              You
                            </Badge>
                          )}
                          {message.campaign_name && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 bg-purple-100 text-purple-800 border-purple-200">
                              <Building className="h-2.5 w-2.5 mr-0.5 flex-shrink-0" />
                              {message.campaign_name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            {formatDate(message)}
                          </span>
                          {expandedMessages.has(message.id) ? (
                            <ChevronUp className="h-4 w-4 text-blue-500 transition-all duration-200" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-all duration-200" />
                          )}
                        </div>
                      </div>
                      
                      {!expandedMessages.has(message.id) && (
                        <div className="text-xs text-gray-500 truncate">
                          {message.content_plain?.substring(0, 80)}...
                        </div>
                      )}
                      
                      {expandedMessages.has(message.id) && (
                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700 min-w-[35px]">From:</span>
                            <span className="truncate">{message.from_email || 'Unknown sender'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700 min-w-[35px]">To:</span>
                            <span className="break-all">{message.to_email || 'Unknown recipient'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Message Content */}
                {expandedMessages.has(message.id) && (
                  <>
                    <Separator />
                    <div className="p-3">
                      <div className="text-sm">
                        {renderMessageContent(message)}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartReply}
                          className="h-7 px-3 text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {/* Rich Text Reply Box */}
            {isReplying && (
              <div 
                className="bg-white border border-gray-300 rounded-md shadow-sm mt-2"
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 text-sm">
                        Reply to {conversation.lead_name || conversation.participants?.[0]}
                      </h3>
                      <Button
                        variant={useRichText ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          console.log('Toggling rich text from', useRichText, 'to', !useRichText)
                          setUseRichText(!useRichText)
                        }}
                        className="h-8 px-3 text-sm font-medium"
                        title={useRichText ? 'Switch to plain text' : 'Switch to rich text'}
                      >
                        <Type className="h-4 w-4 mr-1" />
                        {useRichText ? 'Plain Text' : 'Rich Editor'}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelReply}
                      disabled={isSending}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {useRichText ? (
                    <div className="mb-3">
                      <RichTextEditor
                        content={replyHtml}
                        onChange={handleRichTextChange}
                        placeholder="Type your reply..."
                        minHeight="120px"
                        disabled={isSending}
                        onImageUpload={uploadImage}
                        onAttachmentUpload={handleAttachmentUpload}
                        variables={[
                          { key: 'first_name', label: 'First Name', category: 'contact' },
                          { key: 'last_name', label: 'Last Name', category: 'contact' },
                          { key: 'full_name', label: 'Full Name', category: 'contact' },
                          { key: 'email', label: 'Email', category: 'contact' },
                          { key: 'company_name', label: 'Company Name', category: 'company' },
                          { key: 'campaign_name', label: 'Campaign Name', category: 'campaign' }
                        ]}
                      />
                    </div>
                  ) : (
                    <div className="mb-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <VariablePicker
                          onSelect={(variable) => {
                            const cursor = (document.getElementById('reply-textarea') as HTMLTextAreaElement)?.selectionStart || replyContent.length
                            const newContent = replyContent.slice(0, cursor) + `{${variable}}` + replyContent.slice(cursor)
                            setReplyContent(newContent)
                          }}
                          buttonText="Variables"
                          className="h-7 text-xs"
                          variables={[
                            { key: 'first_name', label: 'First Name', category: 'contact' },
                            { key: 'last_name', label: 'Last Name', category: 'contact' },
                            { key: 'full_name', label: 'Full Name', category: 'contact' },
                            { key: 'email', label: 'Email', category: 'contact' },
                            { key: 'company_name', label: 'Company Name', category: 'company' },
                            { key: 'campaign_name', label: 'Campaign Name', category: 'campaign' }
                          ]}
                        />
                      </div>
                      <Textarea
                        id="reply-textarea"
                        placeholder="Type your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        className="resize-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                        disabled={isSending}
                        autoFocus
                      />
                    </div>
                  )}
                  
                  {/* Attachments Display */}
                  {attachments.length > 0 && (
                    <div className="mt-3 p-2 bg-gray-50 rounded border">
                      <div className="text-xs font-medium text-gray-700 mb-2">Attachments ({attachments.length})</div>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((attachment, index) => (
                          <div 
                            key={index}
                            className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 text-xs"
                          >
                            <span>📎</span>
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium max-w-[120px]" title={attachment.name}>
                                {attachment.name}
                              </div>
                              <div className="text-blue-600">
                                {formatFileSize(attachment.size)}
                              </div>
                            </div>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700 ml-1"
                              type="button"
                              title="Remove attachment"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Press Escape to cancel • Variables: {`{first_name}, {company_name}, etc.`}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancelReply}
                        disabled={isSending}
                        size="sm"
                        className="h-7 px-3 text-xs border-gray-300 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyContent.trim() || isSending}
                        size="sm"
                        className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSending ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}