'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { X, Send } from 'lucide-react'
import { api } from '../lib/api'

interface Conversation {
  id: string
  subject?: string
  participants?: string[]
  lead_name?: string
}

interface ReplyModalProps {
  conversation: Conversation | null
  onClose: () => void
  onSent: () => void
}

export function ReplyModal({ conversation, onClose, onSent }: ReplyModalProps) {
  const [replyContent, setReplyContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  if (!conversation) return null

  const handleSendReply = async () => {
    if (!replyContent.trim() || isSending) return
    
    console.log('🔵 ReplyModal: Starting reply process for conversation:', conversation.id)
    setIsSending(true)
    
    try {
      console.log('🔵 ReplyModal: Fetching email accounts...')
      const emailAccountsResponse = await api.get('/email-accounts')
      console.log('🔵 ReplyModal: Email accounts response:', emailAccountsResponse.data)
      
      const { accounts } = emailAccountsResponse.data
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No email accounts found. Please add an email account first.')
      }
      
      const oauthAccount = accounts?.find(acc => acc.provider?.includes('oauth2'))
      console.log('🔵 ReplyModal: OAuth account found:', oauthAccount)
      
      const fromAccountId = oauthAccount?.id || accounts?.[0]?.id
      console.log('🔵 ReplyModal: Using account ID:', fromAccountId)
      
      if (!fromAccountId) {
        throw new Error('No valid email account ID found.')
      }
      
      const requestData = {
        content: replyContent,
        fromAccountId: fromAccountId
      }
      console.log('🔵 ReplyModal: Sending reply request:', requestData)
      
      const response = await api.post(`/inbox/conversations/${conversation.id}/reply`, requestData)
      console.log('🔵 ReplyModal: Reply response:', response.data)
      
      console.log('✅ ReplyModal: Reply sent successfully!')
      setReplyContent('')
      onSent()
      onClose()
      
    } catch (error: any) {
      console.error('❌ ReplyModal: Error sending reply:', error)
      console.error('❌ ReplyModal: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to send reply'
      alert(`Failed to send reply: ${errorMessage}`)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Reply to {conversation.lead_name || conversation.participants?.[0] || 'Unknown'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Subject */}
        <div className="px-6 py-2 border-b bg-gray-50">
          <p className="text-sm text-gray-600">
            Subject: <span className="font-medium">{conversation.subject || 'No subject'}</span>
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <Textarea
            placeholder="Type your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={12}
            className="w-full resize-none"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendReply}
            disabled={!replyContent.trim() || isSending}
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isSending ? 'Sending...' : 'Send Reply'}
          </Button>
        </div>
      </div>
    </div>
  )
}