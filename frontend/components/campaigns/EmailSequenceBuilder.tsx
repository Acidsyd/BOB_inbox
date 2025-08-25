'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Clock,
  Copy,
  AlertCircle
} from 'lucide-react'

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

interface EmailSequenceBuilderProps {
  campaignData: CampaignData
  updateCampaignData: (data: Partial<CampaignData>) => void
}

export default function EmailSequenceBuilder({ campaignData, updateCampaignData }: EmailSequenceBuilderProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<number>>(new Set([0]))
  const [activeEditor, setActiveEditor] = useState<string>('')

  // Add new sequence email
  const addSequenceEmail = () => {
    if (campaignData.emailSequence.length >= 10) {
      alert('Maximum 10 emails allowed in sequence')
      return
    }

    const newEmail: EmailSequence = {
      id: Date.now(),
      subject: '',
      content: '',
      delay: campaignData.emailSequence.length === 0 ? 0 : 3
    }
    
    updateCampaignData({ 
      emailSequence: [...campaignData.emailSequence, newEmail],
      followUpEnabled: true
    })
    
    // Expand the new email
    setExpandedEmails(prev => new Set([...prev, newEmail.id]))
  }

  // Remove sequence email
  const removeSequenceEmail = (emailId: number) => {
    const updatedSequence = campaignData.emailSequence.filter(email => email.id !== emailId)
    updateCampaignData({ 
      emailSequence: updatedSequence,
      followUpEnabled: updatedSequence.length > 0
    })
    
    // Remove from expanded emails
    setExpandedEmails(prev => {
      const newSet = new Set(prev)
      newSet.delete(emailId)
      return newSet
    })
  }

  // Update sequence email
  const updateSequenceEmail = (emailId: number, field: keyof EmailSequence, value: string | number | boolean) => {
    const updatedSequence = campaignData.emailSequence.map(email =>
      email.id === emailId ? { ...email, [field]: value } : email
    )
    updateCampaignData({ emailSequence: updatedSequence })
  }

  // Copy email content
  const copyEmail = (sourceEmailId: number) => {
    const sourceEmail = campaignData.emailSequence.find(e => e.id === sourceEmailId)
    if (!sourceEmail) return

    const newEmail: EmailSequence = {
      id: Date.now(),
      subject: sourceEmail.subject,
      content: sourceEmail.content,
      delay: 3
    }
    
    updateCampaignData({ 
      emailSequence: [...campaignData.emailSequence, newEmail],
      followUpEnabled: true
    })
    
    setExpandedEmails(prev => new Set([...prev, newEmail.id]))
  }

  // Toggle expanded state
  const toggleExpanded = (emailId: number) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  // All emails (initial + sequence)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Sequence Builder</h3>
        <p className="text-sm text-gray-600">
          Create a sequence of emails to send to your leads. The first email is sent immediately, 
          follow-ups are sent after the specified delays.
        </p>
      </div>

      {/* Email Sequence */}
      <div className="space-y-4">
        {allEmails.map((email, index) => {
          const isExpanded = expandedEmails.has(email.id)
          const isInitial = 'isInitial' in email && email.isInitial
          
          return (
            <Card key={email.id} className={`transition-all ${isExpanded ? 'shadow-md' : 'shadow-sm'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleExpanded(email.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-full ${
                        isInitial ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <Mail className={`h-4 w-4 ${
                          isInitial ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                      </div>
                      
                      <div>
                        <CardTitle className="text-base">
                          {isInitial ? 'Initial Email' : `Follow-up ${index}`}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-2">
                          {!isInitial && (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Send {email.delay} days after {index === 1 ? 'initial email' : `follow-up ${index - 1}`}</span>
                            </>
                          )}
                          {isInitial && <span>Sent immediately when campaign starts</span>}
                        </CardDescription>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!isInitial && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyEmail(email.id)}
                          title="Copy this email"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSequenceEmail(email.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete this email"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  {/* Delay Setting (for follow-ups only) */}
                  {!isInitial && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <Label htmlFor={`delay-${email.id}`}>Send after (days)</Label>
                        <Input
                          id={`delay-${email.id}`}
                          type="number"
                          value={email.delay}
                          onChange={(e) => updateSequenceEmail(email.id, 'delay', parseInt(e.target.value) || 1)}
                          className="mt-1"
                          min="1"
                          max="365"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="text-sm text-blue-700">
                          <div className="font-medium">Scheduled for:</div>
                          <div>
                            Day {index === 0 ? 1 : (
                              allEmails.slice(0, index + 1).reduce((sum, e) => sum + e.delay, 1)
                            )} of campaign
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subject Line */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor={`subject-${email.id}`}>
                        Email Subject Line *
                      </Label>
                      {!isInitial && index > 0 && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`same-subject-${email.id}`}
                            checked={email.useSameSubject || false}
                            onChange={(e) => {
                              updateSequenceEmail(email.id, 'useSameSubject', e.target.checked)
                              if (e.target.checked) {
                                // Get the previous email's subject
                                const prevEmail = allEmails[index - 1]
                                updateSequenceEmail(email.id, 'subject', `Re: ${prevEmail.subject}`)
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <Label 
                            htmlFor={`same-subject-${email.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            Use "Re:" with previous subject
                          </Label>
                        </div>
                      )}
                    </div>
                    <Input
                      id={`subject-${email.id}`}
                      value={email.subject}
                      onChange={(e) => {
                        if (isInitial) {
                          updateCampaignData({ emailSubject: e.target.value })
                        } else {
                          updateSequenceEmail(email.id, 'subject', e.target.value)
                          if (email.useSameSubject) {
                            updateSequenceEmail(email.id, 'useSameSubject', false)
                          }
                        }
                      }}
                      placeholder={isInitial ? 
                        "e.g., {Hi|Hello|Hey} {first_name}, quick question about {company}" : 
                        "e.g., Re: {previous subject} or Following up on my {previous|last} email"}
                      className="mt-1"
                      disabled={!isInitial && email.useSameSubject}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Tip: Use spintax {'{option1|option2}'} for variations. Variables: {'{first_name}'}, {'{company}'}, etc.
                    </p>
                  </div>

                  {/* Email Content */}
                  <div>
                    <Label htmlFor={`content-${email.id}`}>
                      Email Content *
                    </Label>
                    <div className="mt-1">
                      <RichTextEditor
                        value={email.content}
                        onChange={(value) => {
                          if (isInitial) {
                            updateCampaignData({ emailContent: value })
                          } else {
                            updateSequenceEmail(email.id, 'content', value)
                          }
                        }}
                        placeholder={isInitial ? 
                          "Hi {first_name},\n\nI hope this email finds you well..." :
                          "Hi {first_name},\n\nI wanted to follow up on my previous email..."
                        }
                        height="250px"
                        showSnippets={true}
                      />
                    </div>
                    {isInitial && (
                      <p className="mt-2 text-sm text-gray-500">
                        💡 Use dynamic content like {'{first_name}'}, {'{company}'}, and spintax {'{option1|option2}'} to personalize your emails.
                      </p>
                    )}
                  </div>

                  {/* Email Preview */}
                  {email.subject && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium text-gray-700 mb-1">Preview:</div>
                      <div className="text-xs text-gray-600 mb-2">
                        <strong>Subject:</strong> {email.subject}
                      </div>
                      <div 
                        className="text-xs text-gray-600 max-h-20 overflow-y-auto"
                        dangerouslySetInnerHTML={{ 
                          __html: email.content.substring(0, 200) + (email.content.length > 200 ? '...' : '')
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Add Email Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={addSequenceEmail}
          disabled={campaignData.emailSequence.length >= 10}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Follow-up Email</span>
          <span className="text-xs text-gray-500">
            ({campaignData.emailSequence.length}/10)
          </span>
        </Button>
      </div>

      {/* Sequence Summary */}
      {campaignData.emailSequence.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-800 text-sm">Sequence Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-700 space-y-2">
              <div>📧 Total emails: {allEmails.length} (1 initial + {campaignData.emailSequence.length} follow-ups)</div>
              <div>⏱️ Campaign duration: {Math.max(...allEmails.map(e => e.delay)) || 0} days</div>
              <div>🎯 Each lead will receive all emails unless they reply, unsubscribe, or opt out</div>
              
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="font-medium mb-1">Timeline:</div>
                <div className="space-y-1">
                  {allEmails.map((email, index) => (
                    <div key={email.id} className="flex items-center space-x-2 text-xs">
                      <span className="font-medium">Day {
                        index === 0 ? 1 : allEmails.slice(0, index + 1).reduce((sum, e) => sum + e.delay, 1)
                      }:</span>
                      <span>{email.subject || 'Untitled Email'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation */}
      {allEmails.some(email => !email.subject || !email.content) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-orange-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Incomplete emails</span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Please complete all email subjects and content before proceeding to the next step.
          </p>
        </div>
      )}
    </div>
  )
}