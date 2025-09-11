'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Clock,
  Copy,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Dynamic import for RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(
  () => import('@/components/ui/simple-rich-text-editor').then(mod => mod.SimpleRichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] border border-gray-300 rounded-md p-4 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading editor...</p>
        </div>
      </div>
    )
  }
)

interface EmailSequence {
  id: number
  subject: string
  content: string
  delay: number
  useSameSubject?: boolean
  replyToSameThread?: boolean
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

// Common email variables for personalization
const emailVariables = [
  { key: 'first_name', label: 'First Name', value: 'John' },
  { key: 'last_name', label: 'Last Name', value: 'Doe' },
  { key: 'full_name', label: 'Full Name', value: 'John Doe' },
  { key: 'email', label: 'Email', value: 'john@example.com' },
  { key: 'company', label: 'Company', value: 'Acme Corp' },
  { key: 'job_title', label: 'Job Title', value: 'Marketing Manager' },
  { key: 'phone', label: 'Phone', value: '+1 (555) 123-4567' },
  { key: 'website', label: 'Website', value: 'example.com' },
  { key: 'linkedin_url', label: 'LinkedIn URL', value: 'linkedin.com/in/johndoe' },
  { key: 'address', label: 'Address', value: '123 Main St' },
  { key: 'city', label: 'City', value: 'San Francisco' },
  { key: 'state', label: 'State', value: 'CA' },
  { key: 'country', label: 'Country', value: 'USA' },
  { key: 'custom_field_1', label: 'Custom Field 1', value: 'Custom Value 1' },
  { key: 'custom_field_2', label: 'Custom Field 2', value: 'Custom Value 2' },
  { key: 'custom_field_3', label: 'Custom Field 3', value: 'Custom Value 3' },
]

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
      {/* Initial Email */}
      <div>
        <Label htmlFor="emailSubject">Email Subject Line *</Label>
        <Input
          id="emailSubject"
          value={campaignData.emailSubject}
          onChange={(e) => updateCampaignData({ emailSubject: e.target.value })}
          placeholder="e.g., {Hi|Hello|Hey} {first_name}, quick question about {company}"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          💡 Tip: Use spintax {'{option1|option2}'} for variations. Variables: {'{first_name}'}, {'{company}'}, {'{job_title}'}, etc.
        </p>
      </div>

      <div>
        <Label htmlFor="emailContent">Email Content *</Label>
        <div className="mt-1">
          <RichTextEditor
            content={campaignData.emailContent}
            onChange={(html, text) => {
              updateCampaignData({ emailContent: html })
            }}
            placeholder="Hi {first_name},

I hope this email finds you well..."
            minHeight="300px"
            variables={emailVariables}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          💡 You can use template variables like {'{first_name}'}, {'{company}'}, {'{job_title}'}, etc. to personalize your emails.
        </p>
      </div>

      {/* Follow-up Emails */}
      {campaignData.emailSequence.map((email, index) => (
        <div key={email.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <h3 className="font-medium text-gray-900">Follow-up Email #{index + 1}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyEmail(email.id)}
                className="text-xs"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeSequenceEmail(email.id)}
                className="text-red-600 hover:text-red-700 text-xs"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Delay (days after previous email)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={email.delay}
                onChange={(e) => updateSequenceEmail(email.id, 'delay', parseInt(e.target.value) || 1)}
                className="mt-1 w-32"
              />
            </div>

            <div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox
                id={`reply-same-thread-${email.id}`}
                checked={email.replyToSameThread || false}
                onCheckedChange={(checked) => updateSequenceEmail(email.id, 'replyToSameThread', checked)}
              />
              <Label htmlFor={`reply-same-thread-${email.id}`} className="text-sm font-medium">
                Reply to same conversation (continues email thread)
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              ✅ Checked: Continues the same email thread with "Re:" prefix
              <br />
              ❌ Unchecked: Creates a new conversation (subject line required)
            </p>

            {!email.replyToSameThread && (
              <div>
                <Label>Subject Line *</Label>
                <Input
                  value={email.subject}
                  onChange={(e) => updateSequenceEmail(email.id, 'subject', e.target.value)}
                  placeholder="Follow-up: {first_name}, did you see my previous email?"
                  className="mt-1"
                  required
                />
              </div>
            )}

            {email.replyToSameThread && (
              <div>
                <Label>Subject Preview (Auto-generated)</Label>
                <div className="mt-1 p-3 bg-gray-100 border rounded-md text-sm text-gray-700">
                  Re: {campaignData.emailSubject || '[Initial Email Subject]'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Subject will automatically use "Re:" prefix with the initial email subject
                </p>
              </div>
            )}

            <div>
              <Label>Email Content *</Label>
              <div className="mt-1">
                <RichTextEditor
                  content={email.content}
                  onChange={(html, text) => {
                    updateSequenceEmail(email.id, 'content', html)
                  }}
                  placeholder="Hi {first_name},

I wanted to follow up on my previous email..."
                  minHeight="250px"
                  variables={emailVariables}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add Email Button */}
      <div className="flex justify-center mt-6">
        <Button
          variant="outline"
          onClick={addSequenceEmail}
          disabled={campaignData.emailSequence.length >= 10}
          className="flex items-center space-x-3 h-14 px-6 border-dashed border-2 hover:border-purple-300 hover:bg-purple-50"
        >
          <Plus className="h-6 w-6 text-purple-600" />
          <div className="text-left">
            <div className="font-medium">Add Follow-up Email</div>
            <div className="text-xs text-gray-500">
              {campaignData.emailSequence.length}/10 emails in sequence
            </div>
          </div>
        </Button>
      </div>

      {/* Sequence Summary - Only show if emails exist */}
      {campaignData.emailSequence.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">Sequence Summary</h3>
                <p className="text-sm text-gray-600">
                  {campaignData.emailSequence.length + 1} emails over {Math.max(...campaignData.emailSequence.map(e => e.delay)) || 0} days
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {campaignData.emailSequence.filter(e => {
                // Email is complete if it has content and either:
                // 1. Has a subject (for new conversations)
                // 2. Is replying to same thread (subject not required)
                return e.content && (e.subject || e.replyToSameThread)
              }).length + (campaignData.emailSubject && campaignData.emailContent ? 1 : 0)} of {campaignData.emailSequence.length + 1} complete
            </div>
          </div>
        </div>
      )}

      {/* Validation */}
      {((!campaignData.emailSubject || !campaignData.emailContent) || 
        campaignData.emailSequence.some(email => {
          // Check if email content is missing
          if (!email.content) return true
          // Check if subject is required (when not replying to same thread) and missing
          if (!email.replyToSameThread && !email.subject) return true
          return false
        })) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-orange-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Incomplete emails</span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Please complete all required fields. Subject line is required for emails that don't reply to the same conversation.
          </p>
        </div>
      )}
    </div>
  )
}