'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Send, 
  Eye, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Loader,
  Sparkles,
  User,
  Building
} from 'lucide-react'
import { api } from '@/lib/api'

interface EmailSequence {
  id: number
  subject: string
  content: string
  delay: number
  useSameSubject?: boolean
}

interface CampaignData {
  name: string
  description: string
  emailSubject: string
  emailContent: string
  followUpEnabled: boolean
  emailSequence: EmailSequence[]
  selectedLeads: string[]
  emailAccounts: string[]
  scheduleType: 'immediate' | 'scheduled'
  scheduledDate?: Date
  dailyLimit: number
  emailsPerDay: number
  emailsPerHour: number
  emailsPerMinute: number
  sendingInterval: number
  activeDays: string[]
  sendingHours: {
    start: number
    end: number
  }
  csvData: any[]
}

interface EmailAccount {
  id: string
  email: string
  name?: string
  status: 'active' | 'inactive' | 'error'
  signature?: string
}

interface EmailPreviewAndTestProps {
  campaignData: CampaignData
  emailAccounts: EmailAccount[]
  onTestEmailSent?: (success: boolean, message: string) => void
}

// Sample data for spintax and variable processing preview
const sampleLead = {
  first_name: 'John',
  last_name: 'Smith', 
  full_name: 'John Smith',
  company: 'Acme Corp',
  job_title: 'Marketing Director',
  email: 'john.smith@acmecorp.com',
  website: 'acmecorp.com'
}

// Simple spintax processor for preview (client-side)
function processSpintaxPreview(text: string): string {
  if (!text) return text
  
  return text.replace(/\{([^}]+)\}/g, (match, content) => {
    if (content.includes('|')) {
      const options = content.split('|')
      return options[Math.floor(Math.random() * options.length)]
    }
    return match
  })
}

// Replace variables for preview
function replaceVariablesPreview(text: string, variables: Record<string, string>): string {
  if (!text) return text
  
  let processed = text
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'gi')
    processed = processed.replace(regex, value)
  })
  
  return processed
}

// Process complete email template
function processEmailPreview(text: string, variables: Record<string, string>): string {
  let processed = replaceVariablesPreview(text, variables)
  processed = processSpintaxPreview(processed)
  return processed
}

export default function EmailPreviewAndTest({ 
  campaignData, 
  emailAccounts = [], 
  onTestEmailSent 
}: EmailPreviewAndTestProps) {
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0)
  const [selectedSenderAccount, setSelectedSenderAccount] = useState('')
  const [testRecipient, setTestRecipient] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [previewVariation, setPreviewVariation] = useState(0)

  // Create all emails array (initial + sequence)
  const allEmails = [
    {
      id: 0,
      subject: campaignData.emailSubject,
      content: campaignData.emailContent,
      delay: 0,
      isInitial: true
    },
    ...campaignData.emailSequence
  ]

  const currentEmail = allEmails[selectedEmailIndex]

  // Set default sender account
  useEffect(() => {
    if (emailAccounts.length > 0 && !selectedSenderAccount) {
      setSelectedSenderAccount(emailAccounts[0].id)
    }
  }, [emailAccounts, selectedSenderAccount])

  // Generate preview variations
  const generateNewVariation = () => {
    setPreviewVariation(prev => prev + 1)
  }

  // Process email content for preview
  const processedSubject = currentEmail ? processEmailPreview(currentEmail.subject, sampleLead) : ''
  const processedContent = currentEmail ? processEmailPreview(currentEmail.content, sampleLead) : ''
  
  // Get sender account details
  const senderAccount = emailAccounts.find(acc => acc.id === selectedSenderAccount)
  const emailSignature = senderAccount?.signature || ''

  // Final email content with signature
  const finalEmailContent = processedContent + (emailSignature ? `\n\n${emailSignature}` : '')

  const handleSendTestEmail = async () => {
    if (!selectedSenderAccount || !testRecipient || !currentEmail) {
      setTestResult({ success: false, message: 'Please select sender account and enter recipient email' })
      return
    }

    setIsLoading(true)
    setTestResult(null)

    try {
      const response = await api.post('/campaigns/test-email', {
        senderAccountId: selectedSenderAccount,
        recipientEmail: testRecipient,
        subject: processedSubject,
        content: finalEmailContent,
        campaignName: campaignData.name,
        emailIndex: selectedEmailIndex,
        sampleData: sampleLead
      })

      const result = { success: true, message: 'Test email sent successfully!' }
      setTestResult(result)
      onTestEmailSent?.(true, result.message)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to send test email'
      console.error('Test email error:', error.response?.data)
      const result = { success: false, message: errorMessage }
      setTestResult(result)
      onTestEmailSent?.(false, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>No Email Selected</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please create at least one email in your sequence to preview and test.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Select Email to Preview & Test</span>
          </CardTitle>
          <CardDescription>
            Choose which email from your sequence to preview and test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allEmails.map((email, index) => {
              const isInitial = 'isInitial' in email && email.isInitial
              const isSelected = index === selectedEmailIndex
              
              return (
                <Card 
                  key={email.id} 
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedEmailIndex(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`p-2 rounded-full ${
                        isInitial ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">
                          {isInitial ? 'Initial Email' : `Follow-up ${index}`}
                        </h4>
                        {!isInitial && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>Day {email.delay}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {email.subject || 'No subject'}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Email Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <CardTitle>Email Preview</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateNewVariation}
              className="flex items-center space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>New Variation</span>
            </Button>
          </div>
          <CardDescription>
            Preview how your email will look with spintax variations and variables replaced
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Sample Data Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Sample Lead Data</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Name:</span> {sampleLead.first_name} {sampleLead.last_name}
              </div>
              <div>
                <span className="text-blue-700 font-medium">Company:</span> {sampleLead.company}
              </div>
              <div>
                <span className="text-blue-700 font-medium">Title:</span> {sampleLead.job_title}
              </div>
              <div>
                <span className="text-blue-700 font-medium">Email:</span> {sampleLead.email}
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="border rounded-lg p-6 bg-white">
            {/* Email Headers */}
            <div className="border-b pb-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium text-gray-600 w-16">From:</span>
                  <span>{senderAccount?.name || senderAccount?.email || 'Select sender account'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-600 w-16">To:</span>
                  <span>{sampleLead.email}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-600 w-16">Subject:</span>
                  <span className="font-medium">{processedSubject || 'No subject'}</span>
                </div>
              </div>
            </div>

            {/* Email Content */}
            <div className="space-y-4">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: finalEmailContent.replace(/\n/g, '<br>') 
                }}
              />
            </div>

            {/* Signature Section */}
            {emailSignature && (
              <div className="mt-6 pt-4 border-t">
                <div className="text-sm text-gray-500 mb-2">Email Signature:</div>
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: emailSignature.replace(/\n/g, '<br>') 
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Send Test Email</span>
          </CardTitle>
          <CardDescription>
            Send a test email to verify everything works correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sender Selection */}
          <div>
            <Label htmlFor="sender-account">Send From *</Label>
            <Select value={selectedSenderAccount} onValueChange={setSelectedSenderAccount}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sender account" />
              </SelectTrigger>
              <SelectContent>
                {emailAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        account.status === 'active' ? 'bg-green-500' : 
                        account.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span>{account.name || account.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient */}
          <div>
            <Label htmlFor="test-recipient">Send To *</Label>
            <Input
              id="test-recipient"
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="your-email@example.com"
              className="mt-1"
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg flex items-center space-x-2 ${
              testResult.success 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          {/* Send Button */}
          <Button 
            onClick={handleSendTestEmail}
            disabled={isLoading || !selectedSenderAccount || !testRecipient}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            The test email will be processed with spintax variations and include your email signature
          </p>
        </CardContent>
      </Card>
    </div>
  )
}