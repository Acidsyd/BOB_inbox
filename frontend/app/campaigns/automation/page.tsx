'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Upload,
  Mail, 
  Clock, 
  Calendar,
  Settings,
  Play,
  FileText,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CampaignAutomationData {
  // Basic campaign info
  name: string
  subject: string
  body_text: string
  
  // Frequency settings
  emails_per_day: number
  emails_per_hour: number
  emails_per_minute: number
  send_interval_minutes: number
  
  // Schedule settings
  send_days_of_week: number[]
  send_start_hour: number
  send_end_hour: number
  timezone: string
  
  // Email account settings
  email_account_ids: string[]
  account_rotation_type: 'round_robin' | 'random' | 'sequential'
  
  // Control settings
  respect_business_hours: boolean
  auto_pause_when_complete: boolean
  
  // CSV file
  leads_csv: File | null
}

const weekDays = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' }
]

function CampaignAutomationContent() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailAccounts, setEmailAccounts] = useState<any[]>([])
  const [campaignData, setCampaignData] = useState<CampaignAutomationData>({
    // Basic campaign info
    name: '',
    subject: '',
    body_text: '',
    
    // Frequency settings (default values)
    emails_per_day: 10,
    emails_per_hour: 5,
    emails_per_minute: 1,
    send_interval_minutes: 15,
    
    // Schedule settings (weekdays 9-17)
    send_days_of_week: [1, 2, 3, 4, 5],
    send_start_hour: 9,
    send_end_hour: 17,
    timezone: 'UTC',
    
    // Email account settings
    email_account_ids: [],
    account_rotation_type: 'round_robin',
    
    // Control settings
    respect_business_hours: true,
    auto_pause_when_complete: true,
    
    // CSV file
    leads_csv: null
  })

  const updateCampaignData = (data: Partial<CampaignAutomationData>) => {
    setCampaignData(prev => ({ ...prev, ...data }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      updateCampaignData({ leads_csv: file })
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleDayToggle = (dayId: number) => {
    const newDays = campaignData.send_days_of_week.includes(dayId)
      ? campaignData.send_days_of_week.filter(d => d !== dayId)
      : [...campaignData.send_days_of_week, dayId].sort()
    
    updateCampaignData({ send_days_of_week: newDays })
  }

  const handleEmailAccountToggle = (accountId: string) => {
    const newAccounts = campaignData.email_account_ids.includes(accountId)
      ? campaignData.email_account_ids.filter(id => id !== accountId)
      : [...campaignData.email_account_ids, accountId]
    
    updateCampaignData({ email_account_ids: newAccounts })
  }

  const validateForm = () => {
    if (!campaignData.name.trim()) return { valid: false, error: 'Campaign name is required' }
    if (!campaignData.subject.trim()) return { valid: false, error: 'Email subject is required' }
    if (!campaignData.body_text.trim()) return { valid: false, error: 'Email content is required' }
    if (!campaignData.leads_csv) return { valid: false, error: 'CSV file with leads is required' }
    if (campaignData.email_account_ids.length === 0) return { valid: false, error: 'At least one email account must be selected' }
    if (campaignData.send_days_of_week.length === 0) return { valid: false, error: 'At least one day of the week must be selected' }
    
    return { valid: true }
  }

  const handleSubmit = async () => {
    const validation = validateForm()
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('leads_csv', campaignData.leads_csv!)
      formData.append('campaign_config', JSON.stringify({
        name: campaignData.name,
        subject: campaignData.subject,
        body_text: campaignData.body_text,
        emails_per_day: campaignData.emails_per_day,
        emails_per_hour: campaignData.emails_per_hour,
        emails_per_minute: campaignData.emails_per_minute,
        send_interval_minutes: campaignData.send_interval_minutes,
        send_days_of_week: campaignData.send_days_of_week,
        send_start_hour: campaignData.send_start_hour,
        send_end_hour: campaignData.send_end_hour,
        timezone: campaignData.timezone,
        email_account_ids: campaignData.email_account_ids,
        account_rotation_type: campaignData.account_rotation_type,
        respect_business_hours: campaignData.respect_business_hours,
        auto_pause_when_complete: campaignData.auto_pause_when_complete
      }))

      const response = await fetch('/api/campaign-automation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert('Campaign created successfully!')
        router.push('/campaigns')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/campaigns">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Automated Campaign</h1>
          <p className="text-gray-600">Set up an automated email campaign with precise timing controls</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Basic Campaign Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Campaign Information
              </CardTitle>
              <CardDescription>Basic campaign details and email content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={campaignData.name}
                  onChange={(e) => updateCampaignData({ name: e.target.value })}
                  placeholder="e.g., Q1 Lead Generation Campaign"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  value={campaignData.subject}
                  onChange={(e) => updateCampaignData({ subject: e.target.value })}
                  placeholder="e.g., Quick question about your business"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="body_text">Email Content *</Label>
                <textarea
                  id="body_text"
                  value={campaignData.body_text}
                  onChange={(e) => updateCampaignData({ body_text: e.target.value })}
                  placeholder={`Hi {first_name},

I hope this email finds you well. I noticed your company {company} and wanted to reach out...

Best regards,
[Your name]`}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  rows={8}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Use {'{first_name}'}, {'{last_name}'}, {'{company}'} for personalization
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timing Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Sending Frequency
              </CardTitle>
              <CardDescription>Control how many emails are sent and when</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emails_per_day">Emails/Day</Label>
                  <Input
                    id="emails_per_day"
                    type="number"
                    value={campaignData.emails_per_day}
                    onChange={(e) => updateCampaignData({ emails_per_day: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="1000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="emails_per_hour">Emails/Hour</Label>
                  <Input
                    id="emails_per_hour"
                    type="number"
                    value={campaignData.emails_per_hour}
                    onChange={(e) => updateCampaignData({ emails_per_hour: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="100"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="emails_per_minute">Emails/Minute</Label>
                  <Input
                    id="emails_per_minute"
                    type="number"
                    value={campaignData.emails_per_minute}
                    onChange={(e) => updateCampaignData({ emails_per_minute: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="10"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="send_interval">Send Interval (minutes)</Label>
                <Input
                  id="send_interval"
                  type="number"
                  value={campaignData.send_interval_minutes}
                  onChange={(e) => updateCampaignData({ send_interval_minutes: parseInt(e.target.value) || 5 })}
                  min="5"
                  max="1440"
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Minimum time between email sends (5-1440 minutes)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Schedule & Accounts */}
        <div className="space-y-6">
          {/* Schedule Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Schedule Settings
              </CardTitle>
              <CardDescription>Define when emails should be sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Days of the Week</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleDayToggle(day.id)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        campaignData.send_days_of_week.includes(day.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_hour">Start Hour (24h)</Label>
                  <Input
                    id="start_hour"
                    type="number"
                    value={campaignData.send_start_hour}
                    onChange={(e) => updateCampaignData({ send_start_hour: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="23"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end_hour">End Hour (24h)</Label>
                  <Input
                    id="end_hour"
                    type="number"
                    value={campaignData.send_end_hour}
                    onChange={(e) => updateCampaignData({ send_end_hour: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="23"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={campaignData.timezone}
                  onChange={(e) => updateCampaignData({ timezone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="business_hours"
                    checked={campaignData.respect_business_hours}
                    onChange={(e) => updateCampaignData({ respect_business_hours: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Label htmlFor="business_hours">Respect business hours only</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="auto_pause"
                    checked={campaignData.auto_pause_when_complete}
                    onChange={(e) => updateCampaignData({ auto_pause_when_complete: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Label htmlFor="auto_pause">Auto-pause when complete</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CSV Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Lead Upload
              </CardTitle>
              <CardDescription>Upload CSV file with your leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                {campaignData.leads_csv ? (
                  <div>
                    <p className="text-sm font-medium text-green-600 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {campaignData.leads_csv.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(campaignData.leads_csv.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">Click to upload CSV file</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Required columns: email, first_name, last_name, company
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Email Accounts
              </CardTitle>
              <CardDescription>Select which email accounts to use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mock email accounts - in real app, fetch from API */}
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="account1"
                    checked={campaignData.email_account_ids.includes('demo-account-1')}
                    onChange={() => handleEmailAccountToggle('demo-account-1')}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Label htmlFor="account1" className="flex-1">
                    <div className="flex justify-between">
                      <span>difelice@qquadro.com</span>
                      <span className="text-green-600 text-sm">Health: 95%</span>
                    </div>
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="rotation_type">Account Rotation</Label>
                <select
                  id="rotation_type"
                  value={campaignData.account_rotation_type}
                  onChange={(e) => updateCampaignData({ account_rotation_type: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="round_robin">Round Robin</option>
                  <option value="random">Random</option>
                  <option value="sequential">Sequential</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary & Launch */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Campaign Summary</CardTitle>
          <CardDescription>Review your settings before launching</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {campaignData.emails_per_day}
              </div>
              <div className="text-sm text-gray-600">Emails per day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {campaignData.send_days_of_week.length}
              </div>
              <div className="text-sm text-gray-600">Days per week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {campaignData.email_account_ids.length}
              </div>
              <div className="text-sm text-gray-600">Email accounts</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !validateForm().valid}
              className="btn-primary"
              size="lg"
            >
              {isLoading ? (
                <>Creating...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Create Automated Campaign
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CampaignAutomationPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CampaignAutomationContent />
      </AppLayout>
    </ProtectedRoute>
  )
}