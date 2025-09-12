'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { 
  X, 
  Minus, 
  Maximize2, 
  Send, 
  Save,
  Mail,
  Paperclip,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useEmailAccounts } from '../../hooks/useEmailAccounts'
import { api } from '../../lib/api'
import { uploadAttachment } from '../../lib/attachment-upload'

// Dynamic import for RichTextEditor to prevent SSR issues
const RichTextEditor = dynamic(() => import('../ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })), { 
  ssr: false,
  loading: () => <div className="border rounded-lg h-64 bg-gray-50 animate-pulse" />
})

interface EmailDraft {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  htmlContent: string
  textContent: string
  fromAccountId: string
  attachments: Array<{
    name: string
    url: string
    size: number
    type: string
  }>
  lastSaved?: string
}

interface ComposeEmailModalProps {
  isOpen: boolean
  isMinimized: boolean
  onClose: () => void
  onMinimize: () => void
  onRestore: () => void
  onSent?: () => void
}

const DRAFT_STORAGE_KEY = 'emailComposeDraft'
const AUTOSAVE_INTERVAL = 30000 // 30 seconds

export function ComposeEmailModal({
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onRestore,
  onSent
}: ComposeEmailModalProps) {
  // Email accounts
  const { accounts, isLoading: accountsLoading } = useEmailAccounts()
  const activeAccounts = accounts.filter(account => account.status === 'active')

  // Form state
  const [formData, setFormData] = useState<EmailDraft>({
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    htmlContent: '',
    textContent: '',
    fromAccountId: '',
    attachments: []
  })

  // UI state
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)

  // Input refs for email fields
  const toInputRef = useRef<HTMLInputElement>(null)
  const ccInputRef = useRef<HTMLInputElement>(null)
  const bccInputRef = useRef<HTMLInputElement>(null)

  // Auto-save timer ref
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Set default from account when accounts load
  useEffect(() => {
    if (activeAccounts.length > 0 && !formData.fromAccountId) {
      setFormData(prev => ({
        ...prev,
        fromAccountId: activeAccounts[0].id
      }))
    }
  }, [activeAccounts, formData.fromAccountId])

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (savedDraft && isOpen) {
      try {
        const draft: EmailDraft = JSON.parse(savedDraft)
        setFormData(draft)
        setIsDirty(true)
        console.log('📧 Loaded draft from localStorage')
      } catch (error) {
        console.error('Failed to load draft:', error)
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      }
    }
  }, [isOpen])

  // Auto-save draft
  const saveDraft = useCallback(() => {
    if (!isDirty) return
    
    try {
      const draftToSave = {
        ...formData,
        lastSaved: new Date().toISOString()
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave))
      console.log('💾 Auto-saved draft')
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }, [formData, isDirty])

  // Set up auto-save timer
  useEffect(() => {
    if (isDirty && isOpen && !isMinimized) {
      autosaveTimerRef.current = setInterval(saveDraft, AUTOSAVE_INTERVAL)
      return () => {
        if (autosaveTimerRef.current) {
          clearInterval(autosaveTimerRef.current)
        }
      }
    }
  }, [isDirty, isOpen, isMinimized, saveDraft])

  // Save draft on minimize
  useEffect(() => {
    if (isMinimized && isDirty) {
      saveDraft()
    }
  }, [isMinimized, isDirty, saveDraft])

  // Clear draft on successful send
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setIsDirty(false)
    setFormData({
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      htmlContent: '',
      textContent: '',
      fromAccountId: activeAccounts.length > 0 ? activeAccounts[0].id : '',
      attachments: []
    })
  }, [activeAccounts])

  // Email validation
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateEmails = (emails: string[]): string[] => {
    return emails.filter(email => email.trim() && validateEmail(email.trim()))
  }

  // Handle email input (Enter, comma, or space separated)
  const handleEmailInput = (
    field: 'to' | 'cc' | 'bcc',
    value: string,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    // Process if there's a separator or if it's a valid email and user pressed Enter
    if (value.includes(',') || value.includes('\n') || value.includes(' ') || value.trim().length > 0) {
      const emails = value
        .split(/[,\n\s]+/)
        .map(email => email.trim())
        .filter(email => email.length > 0)
      
      const validEmails = validateEmails(emails)
      if (validEmails.length > 0) {
        const currentEmails = formData[field]
        const newEmails = [...currentEmails, ...validEmails]
        
        setFormData(prev => ({
          ...prev,
          [field]: [...new Set(newEmails)] // Remove duplicates
        }))
        
        if (inputRef.current) {
          inputRef.current.value = ''
        }
        setIsDirty(true)
      }
    }
  }

  // Handle Enter key press for email fields
  const handleEmailKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'to' | 'cc' | 'bcc',
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = e.currentTarget.value.trim()
      if (value && validateEmail(value)) {
        handleEmailInput(field, value, inputRef)
      }
    }
  }

  // Remove email from field
  const removeEmail = (field: 'to' | 'cc' | 'bcc', email: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(e => e !== email)
    }))
    setIsDirty(true)
  }

  // Handle attachment upload
  const handleAttachmentUpload = async (file: File) => {
    try {
      console.log('📎 Uploading attachment:', file.name)
      const attachment = await uploadAttachment(file)
      
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }))
      setIsDirty(true)
      
      return attachment
    } catch (error) {
      console.error('Failed to upload attachment:', error)
      throw error
    }
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
    setIsDirty(true)
  }

  // Handle rich text editor changes
  const handleContentChange = (html: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      htmlContent: html,
      textContent: text
    }))
    setIsDirty(true)
  }

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // First, capture any pending email in the input field and add it
    const toInput = toInputRef.current?.value?.trim()
    let hasValidToEmail = formData.to.length > 0
    
    if (toInput && validateEmail(toInput)) {
      // Add the pending email to the current list
      const currentEmails = formData.to
      const newEmails = [...currentEmails, toInput]
      setFormData(prev => ({
        ...prev,
        to: [...new Set(newEmails)] // Remove duplicates
      }))
      toInputRef.current!.value = ''
      hasValidToEmail = true
    }

    // Validate recipients (including any just added)
    if (!hasValidToEmail) {
      newErrors.to = 'At least one recipient is required'
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required'
    }

    if (!formData.htmlContent.trim()) {
      newErrors.content = 'Email content is required'
    }

    if (!formData.fromAccountId) {
      newErrors.from = 'Please select a sender account'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Send email
  const handleSend = async () => {
    if (!validateForm()) {
      return
    }

    setIsSending(true)
    setSendStatus('idle')
    setErrors({})

    try {
      const emailData = {
        fromAccountId: formData.fromAccountId,
        to: formData.to,
        cc: formData.cc.length > 0 ? formData.cc : undefined,
        bcc: formData.bcc.length > 0 ? formData.bcc : undefined,
        subject: formData.subject,
        html: formData.htmlContent,
        text: formData.textContent,
        attachments: formData.attachments.length > 0 ? formData.attachments : undefined
      }

      await api.post('/inbox/send', emailData)
      
      setSendStatus('success')
      clearDraft()
      onSent?.()
      
      // Reset form state immediately after success to allow new emails
      setTimeout(() => {
        setSendStatus('idle')
        setIsSending(false)
        // Clear form data for fresh start
        setFormData({
          to: [],
          cc: [],
          bcc: [],
          subject: '',
          htmlContent: '',
          textContent: '',
          fromAccountId: '',
          attachments: []
        })
        setErrors({})
      }, 2000)

    } catch (error: any) {
      console.error('Failed to send email:', error)
      setSendStatus('error')
      setErrors({
        send: error.response?.data?.error || 'Failed to send email'
      })
    } finally {
      setIsSending(false)
    }
  }

  // Save draft manually
  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    saveDraft()
    
    // Visual feedback
    setTimeout(() => {
      setIsSavingDraft(false)
    }, 1000)
  }

  // Handle close with confirmation if draft exists
  const handleClose = () => {
    if (isDirty) {
      saveDraft()
    }
    onClose()
  }

  // Minimized floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-60">
        <Button
          onClick={onRestore}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
            isDirty ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
          )}
          title={isDirty ? "Resume draft (unsaved changes)" : "Resume email composition"}
        >
          <Mail className="w-6 h-6 text-white" />
          {isDirty && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </Button>
      </div>
    )
  }

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Compose Email</h2>
            {isDirty && (
              <Badge variant="outline" className="text-xs">
                {isSavingDraft ? 'Saving...' : 'Draft'}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMinimize}
              className="p-2"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-2"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Email Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            
            {/* From Field */}
            <div className="space-y-2">
              <Label>From</Label>
              <Select
                value={formData.fromAccountId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, fromAccountId: value }))
                  setIsDirty(true)
                }}
              >
                <SelectTrigger className={cn(errors.from && "border-red-500")}>
                  <SelectValue placeholder="Select sender account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center space-x-2">
                        <span>{account.email}</span>
                        <Badge variant="secondary" className="text-xs">
                          {account.provider.toUpperCase()}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.from && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.from}
                </p>
              )}
            </div>

            {/* To Field */}
            <div className="space-y-2">
              <Label>To</Label>
              <div className="space-y-2">
                {formData.to.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.to.map((email) => (
                      <Badge 
                        key={email} 
                        variant="secondary" 
                        className="flex items-center gap-1"
                      >
                        {email}
                        <button
                          onClick={() => removeEmail('to', email)}
                          className="hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Input
                  ref={toInputRef}
                  placeholder="Enter recipient emails (press Enter to add)"
                  className={cn(errors.to && "border-red-500")}
                  onKeyDown={(e) => handleEmailKeyDown(e, 'to', toInputRef)}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      handleEmailInput('to', e.target.value, toInputRef)
                    }
                  }}
                />
                {errors.to && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.to}
                  </p>
                )}
              </div>
              <div className="flex space-x-4 text-sm">
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Add CC
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Add BCC
                  </button>
                )}
              </div>
            </div>

            {/* CC Field */}
            {showCc && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>CC</Label>
                  <button
                    onClick={() => {
                      setShowCc(false)
                      setFormData(prev => ({ ...prev, cc: [] }))
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.cc.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.cc.map((email) => (
                        <Badge 
                          key={email} 
                          variant="secondary" 
                          className="flex items-center gap-1"
                        >
                          {email}
                          <button
                            onClick={() => removeEmail('cc', email)}
                            className="hover:bg-gray-300 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Input
                    ref={ccInputRef}
                    placeholder="Enter CC emails (press Enter to add)"
                    onKeyDown={(e) => handleEmailKeyDown(e, 'cc', ccInputRef)}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleEmailInput('cc', e.target.value, ccInputRef)
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* BCC Field */}
            {showBcc && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>BCC</Label>
                  <button
                    onClick={() => {
                      setShowBcc(false)
                      setFormData(prev => ({ ...prev, bcc: [] }))
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.bcc.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.bcc.map((email) => (
                        <Badge 
                          key={email} 
                          variant="secondary" 
                          className="flex items-center gap-1"
                        >
                          {email}
                          <button
                            onClick={() => removeEmail('bcc', email)}
                            className="hover:bg-gray-300 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Input
                    ref={bccInputRef}
                    placeholder="Enter BCC emails (press Enter to add)"
                    onKeyDown={(e) => handleEmailKeyDown(e, 'bcc', bccInputRef)}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleEmailInput('bcc', e.target.value, bccInputRef)
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Subject Field */}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, subject: e.target.value }))
                  setIsDirty(true)
                }}
                placeholder="Email subject"
                className={cn(errors.subject && "border-red-500")}
              />
              {errors.subject && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.subject}
                </p>
              )}
            </div>

            {/* Attachments */}
            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="space-y-2">
                  {formData.attachments.map((attachment, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                    >
                      <div className="flex items-center space-x-2">
                        <Paperclip className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">{attachment.name}</p>
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rich Text Editor */}
            <div className="space-y-2">
              <Label>Message</Label>
              <div className={cn("min-h-64", errors.content && "border border-red-500 rounded-lg")}>
                <RichTextEditor
                  content={formData.htmlContent}
                  onChange={handleContentChange}
                  placeholder="Type your email message here..."
                  onAttachmentUpload={handleAttachmentUpload}
                  className="min-h-64"
                />
              </div>
              {errors.content && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.content}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {sendStatus === 'success' && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Email sent successfully!
                </div>
              )}
              {errors.send && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.send}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || !isDirty}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </Button>
              
              <Button
                onClick={handleSend}
                disabled={isSending || sendStatus === 'success'}
                className="min-w-24"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}