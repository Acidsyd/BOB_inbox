'use client'

import ProtectedRoute from '../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../components/layout/AppLayout'
import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Save, Settings, AlertCircle, Calendar, Users, Play, Check, Mail } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { api } from '../../../../lib/api'
import EmailSequenceBuilder from '../../../../components/campaigns/EmailSequenceBuilder'
import { useEmailAccountsSelection } from '../../../../hooks/useEmailAccountsSelection'
import LeadListSelector from '../../../../components/campaigns/LeadListSelector'
import dynamic from 'next/dynamic'

const InlineRichTextEditor = dynamic(() => import('../../../../components/ui/rich-text-editor').then(mod => ({ default: mod.RichTextEditor })), {
  ssr: false,
  loading: () => <div className="border rounded-lg h-40 bg-gray-50 animate-pulse" />
})

interface Campaign {
  id: string
  name: string
  status: string
  config: {
    description?: string
    emailSubject: string
    emailContent: string
    followUpEnabled: boolean
    emailSequence: any[]
    leadListId: string
    leadListName?: string
    leadListCount?: number
    emailAccounts: string[]
    scheduleType: 'immediate' | 'scheduled'
    scheduledDate?: Date
    dailyLimit: number
    emailsPerDay: number
    emailsPerHour: number
    emailsPerMinute: number
    sendingInterval: number
    activeDays: string[]
    sendingHours: { start: number; end: number }
    timezone: string
    enableJitter: boolean
    jitterMinutes: number
    stopOnReply: boolean
    stopOnClick: boolean
    stopOnOpen: boolean
    sendPlainText: boolean
    trackOpens: boolean
    trackClicks: boolean
    companyLevelPause: boolean
    domainLevelPause: boolean
    aiEmailMatching: boolean
    aiLeadCategorization: boolean
    bounceProtection: boolean
    domainRateLimit: boolean
    includeUnsubscribe: boolean
  }
}

function EditCampaignPageContent({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [error, setError] = useState('')
  const [currentTab, setCurrentTab] = useState('basic')
  const { accounts: emailAccounts, loading: accountsLoading, error: accountsError } = useEmailAccountsSelection()

  // Form data matching campaign config structure
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    emailSubject: '',
    emailContent: '',
    followUpEnabled: false,
    emailSequence: [],
    selectedLeads: [],
    emailAccounts: [],
    scheduleType: 'immediate' as 'immediate' | 'scheduled',
    scheduledDate: undefined,
    dailyLimit: 50,
    emailsPerDay: 50,
    emailsPerHour: 10,
    emailsPerMinute: 1,
    sendingInterval: 15,
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    sendingHours: { start: 9, end: 17 },
    csvData: [],
    leadListId: '',
    leadListName: '',
    leadListCount: 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    enableJitter: true,
    jitterMinutes: 3,
    stopOnReply: true,
    stopOnClick: false,
    stopOnOpen: false,
    sendPlainText: false,
    trackOpens: true,
    trackClicks: true,
    companyLevelPause: true,
    domainLevelPause: false,
    aiEmailMatching: true,
    aiLeadCategorization: false,
    bounceProtection: true,
    domainRateLimit: false,
    includeUnsubscribe: true
  })

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: Settings },
    { id: 'sequence', name: 'Email Sequence', icon: Settings },
    { id: 'leads', name: 'Lead List', icon: Users },
    { id: 'accounts', name: 'Email Accounts', icon: Settings },
    { id: 'timing', name: 'Timing Settings', icon: Calendar },
    { id: 'advanced', name: 'Advanced Settings', icon: Settings },
    { id: 'test', name: 'Send Test', icon: Mail }
  ]

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/campaigns/${id}`)

      if (response.data.success) {
        const fetchedCampaign = response.data.campaign
        setCampaign(fetchedCampaign)

        // The API spreads config fields to top level, so check both locations
        const getConfigValue = (key, defaultValue) => {
          return fetchedCampaign[key] ?? fetchedCampaign.config?.[key] ?? defaultValue;
        };

        // Populate form data with campaign config
        setCampaignData({
          name: fetchedCampaign.name || '',
          description: getConfigValue('description', ''),
          emailSubject: getConfigValue('emailSubject', ''),
          emailContent: getConfigValue('emailContent', ''),
          followUpEnabled: getConfigValue('followUpEnabled', false),
          emailSequence: getConfigValue('emailSequence', []),
          selectedLeads: getConfigValue('selectedLeads', []),
          emailAccounts: getConfigValue('emailAccounts', []),
          scheduleType: getConfigValue('scheduleType', 'immediate'),
          scheduledDate: getConfigValue('scheduledDate'),
          dailyLimit: getConfigValue('dailyLimit', 50),
          emailsPerDay: getConfigValue('emailsPerDay', 50),
          emailsPerHour: getConfigValue('emailsPerHour', 10),
          emailsPerMinute: getConfigValue('emailsPerMinute', 1),
          sendingInterval: getConfigValue('sendingInterval', 15),
          activeDays: getConfigValue('activeDays', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
          sendingHours: getConfigValue('sendingHours', { start: 9, end: 17 }),
          csvData: getConfigValue('csvData', []),
          leadListId: getConfigValue('leadListId', ''),
          leadListName: getConfigValue('leadListName', ''),
          leadListCount: getConfigValue('leadListCount', 0),
          timezone: getConfigValue('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone),
          enableJitter: getConfigValue('enableJitter', true),
          jitterMinutes: getConfigValue('jitterMinutes', 3),
          stopOnReply: getConfigValue('stopOnReply', true),
          stopOnClick: getConfigValue('stopOnClick', false),
          stopOnOpen: getConfigValue('stopOnOpen', false),
          sendPlainText: getConfigValue('sendPlainText', false),
          trackOpens: getConfigValue('trackOpens', true),
          trackClicks: getConfigValue('trackClicks', true),
          companyLevelPause: getConfigValue('companyLevelPause', true),
          domainLevelPause: getConfigValue('domainLevelPause', false),
          aiEmailMatching: getConfigValue('aiEmailMatching', true),
          aiLeadCategorization: getConfigValue('aiLeadCategorization', false),
          bounceProtection: getConfigValue('bounceProtection', true),
          domainRateLimit: getConfigValue('domainRateLimit', false),
          includeUnsubscribe: getConfigValue('includeUnsubscribe', true)
        })

        console.log('🔍 Debug - Fetched campaign:', fetchedCampaign);
        console.log('🔍 Debug - Raw config object:', fetchedCampaign.config);
        console.log('🔍 Debug - All top-level keys:', Object.keys(fetchedCampaign));
        console.log('🔍 Debug - Email sequence from API:', getConfigValue('emailSequence', []));
        console.log('🔍 Debug - Email accounts from API:', getConfigValue('emailAccounts', []));
        console.log('🔍 Debug - Email subject from API:', getConfigValue('emailSubject', ''));
        console.log('🔍 Debug - Email content from API:', getConfigValue('emailContent', ''));

        // Check if this specific campaign has empty data
        if (getConfigValue('emailSequence', []).length === 0) {
          console.log('⚠️ This campaign has NO email sequence data in the database');
        }
        if (getConfigValue('emailAccounts', []).length === 0) {
          console.log('⚠️ This campaign has NO email accounts data in the database');
        }
        if (!getConfigValue('emailSubject', '')) {
          console.log('⚠️ This campaign has NO email subject in the database');
        }
      } else {
        setError('Campaign not found')
      }
    } catch (error: any) {
      console.error('Error fetching campaign:', error)
      setError(error.response?.data?.error || 'Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const updateCampaignData = (data: any) => {
    setCampaignData(prev => ({ ...prev, ...data }))
  }

  // Test Email state
  const [testRecipient, setTestRecipient] = useState('')
  const [testSenderAccountId, setTestSenderAccountId] = useState('')
  const [testSubject, setTestSubject] = useState('')
  const [testContent, setTestContent] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testSent, setTestSent] = useState<null | { messageId?: string; response?: string }>(null)
  const [testError, setTestError] = useState('')
  const [testSample, setTestSample] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    company: '',
    job_title: '',
    website: ''
  })

  // Initialize test defaults when data loads
  useEffect(() => {
    if (campaign) {
      setTestSubject(prev => prev || campaignData.emailSubject || '')
      setTestContent(prev => prev || campaignData.emailContent || '')
    }
  }, [campaign, campaignData.emailSubject, campaignData.emailContent])

  useEffect(() => {
    if (!testSenderAccountId && emailAccounts && emailAccounts.length > 0) {
      const preferred = campaignData.emailAccounts?.[0]
      const exists = preferred && emailAccounts.find(a => a.id === preferred)
      setTestSenderAccountId(exists ? preferred : emailAccounts[0].id)
    }
  }, [emailAccounts, campaignData.emailAccounts, testSenderAccountId])

  const emailVariables = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company' },
    { key: 'job_title', label: 'Job Title' },
    { key: 'website', label: 'Website' },
  ]

  const handleSendTestEmail = async () => {
    setTestError('')
    setTestSent(null)

    if (!testRecipient || !testSenderAccountId || !testSubject || !testContent) {
      setTestError('Please fill recipient, sender account, subject and content')
      return
    }

    try {
      setTestSending(true)
      const payload = {
        recipientEmail: testRecipient,
        senderAccountId: testSenderAccountId,
        subject: testSubject,
        content: testContent,
        sampleData: {
          first_name: testSample.first_name,
          last_name: testSample.last_name,
          full_name: testSample.full_name,
          company: testSample.company,
          job_title: testSample.job_title,
          website: testSample.website
        },
        campaignName: campaign?.name,
        emailIndex: 0
      }

      const res = await api.post('/campaigns/test-email', payload)
      if (res.data?.success) {
        setTestSent({ messageId: res.data?.data?.messageId, response: res.data?.data?.response })
      } else {
        setTestError(res.data?.error || 'Failed to send test email')
      }
    } catch (err: any) {
      setTestError(err.response?.data?.error || err.message || 'Failed to send test email')
    } finally {
      setTestSending(false)
    }
  }

  const handleSaveCampaign = async () => {
    try {
      setIsSaving(true)

      const updateData = {
        name: campaignData.name,
        config: {
          description: campaignData.description,
          emailSubject: campaignData.emailSubject,
          emailContent: campaignData.emailContent,
          followUpEnabled: campaignData.followUpEnabled,
          emailSequence: campaignData.emailSequence,
          selectedLeads: campaignData.selectedLeads,
          emailAccounts: campaignData.emailAccounts,
          scheduleType: campaignData.scheduleType,
          scheduledDate: campaignData.scheduledDate,
          dailyLimit: campaignData.dailyLimit,
          emailsPerDay: campaignData.emailsPerDay,
          emailsPerHour: campaignData.emailsPerHour,
          emailsPerMinute: campaignData.emailsPerMinute,
          sendingInterval: campaignData.sendingInterval,
          activeDays: campaignData.activeDays,
          sendingHours: campaignData.sendingHours,
          csvData: campaignData.csvData,
          leadListId: campaignData.leadListId,
          leadListName: campaignData.leadListName,
          leadListCount: campaignData.leadListCount,
          timezone: campaignData.timezone,
          enableJitter: campaignData.enableJitter,
          jitterMinutes: campaignData.jitterMinutes,
          stopOnReply: campaignData.stopOnReply,
          stopOnClick: campaignData.stopOnClick,
          stopOnOpen: campaignData.stopOnOpen,
          sendPlainText: campaignData.sendPlainText,
          trackOpens: campaignData.trackOpens,
          trackClicks: campaignData.trackClicks,
          companyLevelPause: campaignData.companyLevelPause,
          domainLevelPause: campaignData.domainLevelPause,
          aiEmailMatching: campaignData.aiEmailMatching,
          aiLeadCategorization: campaignData.aiLeadCategorization,
          bounceProtection: campaignData.bounceProtection,
          domainRateLimit: campaignData.domainRateLimit,
          includeUnsubscribe: campaignData.includeUnsubscribe
        }
      }

      const response = await api.put(`/campaigns/${id}`, updateData)

      if (response.data.success) {
        // Campaign restart functionality - restart if campaign was running
        if (campaign?.status === 'running') {
          setIsRestarting(true)
          try {
            await api.post(`/campaigns/${id}/restart`)
            console.log('Campaign restarted successfully with new configuration')
          } catch (restartError) {
            console.error('Failed to restart campaign:', restartError)
            // Continue anyway - config was saved
          } finally {
            setIsRestarting(false)
          }
        }

        router.push(`/campaigns/${id}`)
      } else {
        setError(response.data.error || 'Failed to update campaign')
      }
    } catch (error: any) {
      console.error('Error updating campaign:', error)
      setError(error.response?.data?.error || 'Failed to update campaign')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/campaigns')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Campaign Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">The campaign you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/campaigns')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => router.push(`/campaigns/${id}`)}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaign
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
              <p className="text-gray-600 mt-1">{campaign.name}</p>
              {campaign && (
                <div className="text-xs text-green-600 mt-1">
                  ✅ Data loaded | Emails: {campaignData.emailSequence?.length || 0} | Accounts: {campaignData.emailAccounts?.length || 0}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      currentTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${
                      currentTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Basic Info Tab */}
          {currentTab === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Campaign Information</CardTitle>
                <CardDescription>Configure the basic details of your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="campaignName">Campaign Name *</Label>
                  <Input
                    id="campaignName"
                    value={campaignData.name}
                    onChange={(e) => updateCampaignData({ name: e.target.value })}
                    placeholder="Enter campaign name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <textarea
                    id="description"
                    value={campaignData.description}
                    onChange={(e) => updateCampaignData({ description: e.target.value })}
                    placeholder="Describe your campaign objectives..."
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Test Tab */}
          {currentTab === 'test' && (
            <Card>
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
                <CardDescription>Preview personalization and send a test email before launching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sender & Recipient */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Sender Account</Label>
                    <select
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      value={testSenderAccountId}
                      onChange={(e) => setTestSenderAccountId(e.target.value)}
                    >
                      {(emailAccounts || []).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Recipient Email</Label>
                    <Input
                      placeholder="you@example.com"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <Label>Subject</Label>
                  <Input
                    placeholder="Subject"
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                  />
                </div>

                {/* Content Editor */}
                <div>
                  <Label>Content</Label>
                  <div className="mt-2 border rounded-lg">
                    <InlineRichTextEditor
                      content={testContent}
                      onChange={(html: string) => setTestContent(html)}
                      placeholder={"Hi {first_name},\n\nI hope this email finds you well..."}
                      variables={emailVariables as { key: string; label: string; value?: string }[]}
                      minHeight={'220px'}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports spintax {'{Hello|Hi}'} and variables like {'{first_name}'}, {'{company}'}. Sample data below is used for preview substitution.
                  </p>
                </div>

                {/* Sample Data */}
                <div>
                  <Label className="text-base font-semibold">Sample Lead Data</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div>
                      <Label>First Name</Label>
                      <Input value={testSample.first_name} onChange={(e) => setTestSample(s => ({ ...s, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input value={testSample.last_name} onChange={(e) => setTestSample(s => ({ ...s, last_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Full Name</Label>
                      <Input value={testSample.full_name} onChange={(e) => setTestSample(s => ({ ...s, full_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input value={testSample.company} onChange={(e) => setTestSample(s => ({ ...s, company: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Job Title</Label>
                      <Input value={testSample.job_title} onChange={(e) => setTestSample(s => ({ ...s, job_title: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input value={testSample.website} onChange={(e) => setTestSample(s => ({ ...s, website: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button onClick={handleSendTestEmail} disabled={testSending || !testRecipient || !testSenderAccountId}>
                    {testSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Send Test Email
                      </>
                    )}
                  </Button>
                  {testSent && (
                    <div className="text-green-600 text-sm flex items-center">
                      <Check className="w-4 h-4 mr-1" /> Sent! Message ID: {testSent.messageId || 'N/A'}
                    </div>
                  )}
                  {testError && (
                    <div className="text-red-600 text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" /> {testError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Email Sequence Tab */}
          {currentTab === 'sequence' && (
            <Card>
              <CardHeader>
                <CardTitle>Email Sequence</CardTitle>
                <CardDescription>Configure your email content and follow-up sequence</CardDescription>
              </CardHeader>
              <CardContent>
                <EmailSequenceBuilder
                  campaignData={campaignData}
                  updateCampaignData={updateCampaignData}
                />
              </CardContent>
            </Card>
          )}

          {/* Lead List Tab */}
          {currentTab === 'leads' && (
            <Card>
              <CardHeader>
                <CardTitle>Lead List Selection</CardTitle>
                <CardDescription>Choose which lead list to use for this campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <LeadListSelector
                  selectedListId={campaignData.leadListId}
                  onListSelect={(listId, list, filteredCount) => {
                    updateCampaignData({
                      leadListId: listId,
                      leadListName: list.name,
                      leadListCount: filteredCount !== undefined ? filteredCount : list.activeLeads
                    })
                  }}
                  onClearSelection={() => {
                    updateCampaignData({
                      leadListId: '',
                      leadListName: '',
                      leadListCount: 0
                    })
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Email Accounts Tab */}
          {currentTab === 'accounts' && (
            <Card>
              <CardHeader>
                <CardTitle>Email Accounts</CardTitle>
                <CardDescription>Select which email accounts to use for sending</CardDescription>
              </CardHeader>
              <CardContent>
                {accountsLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading email accounts...</p>
                  </div>
                )}

                {accountsError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">Error loading accounts: {accountsError}</span>
                    </div>
                  </div>
                )}

                {!accountsLoading && !accountsError && emailAccounts.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 mb-3">
                      Select one or more accounts for sending. Multiple accounts will rotate automatically.
                    </div>

                    <div className="space-y-3">
                      {emailAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={`account-${account.id}`}
                              checked={campaignData.emailAccounts.includes(account.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  updateCampaignData({
                                    emailAccounts: [...campaignData.emailAccounts, account.id]
                                  });
                                } else {
                                  updateCampaignData({
                                    emailAccounts: campaignData.emailAccounts.filter(id => id !== account.id)
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              disabled={account.warmup_status !== 'active'}
                            />

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor={`account-${account.id}`} className="font-medium">
                                    {account.display_name || account.email}
                                  </Label>
                                  {account.display_name && (
                                    <div className="text-sm text-gray-500">{account.email}</div>
                                  )}
                                </div>

                                <div className="flex items-center space-x-4 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    account.provider === 'gmail' ? 'bg-red-100 text-red-800' :
                                    account.provider === 'outlook' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                                  </span>

                                  <div className="flex items-center">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                      account.health_score >= 90 ? 'bg-green-500' :
                                      account.health_score >= 70 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}></span>
                                    <span className="text-gray-600">Health: {account.health_score}%</span>
                                  </div>

                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    account.warmup_status === 'active' ? 'bg-green-100 text-green-800' :
                                    account.warmup_status === 'warming' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {account.warmup_status === 'active' ? 'Ready' :
                                     account.warmup_status === 'warming' ? 'Warming' :
                                     account.warmup_status}
                                  </span>

                                  <span className="text-gray-600">
                                    Limit: {account.daily_limit}/day
                                  </span>
                                </div>
                              </div>

                              {account.warmup_status !== 'active' && (
                                <div className="mt-2 text-sm text-orange-600">
                                  This account is not ready for campaigns yet.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {campaignData.emailAccounts.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Selection Summary</h4>
                        <div className="text-sm text-blue-800 space-y-1">
                          <div>{campaignData.emailAccounts.length} account(s) selected</div>
                          <div>
                            Combined daily limit: {
                              emailAccounts
                                .filter(acc => campaignData.emailAccounts.includes(acc.id))
                                .reduce((sum, acc) => sum + acc.daily_limit, 0)
                            } emails/day
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!accountsLoading && !accountsError && emailAccounts.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Accounts Available</h3>
                    <p className="text-gray-500 mb-4">
                      You need to configure at least one email account before editing campaigns.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timing Settings Tab */}
          {currentTab === 'timing' && (
            <Card>
              <CardHeader>
                <CardTitle>Timing Settings</CardTitle>
                <CardDescription>Configure when and how frequently emails are sent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timezone Selection */}
                <div>
                  <Label className="text-base font-semibold">Timezone</Label>
                  <div className="mt-3">
                    <select
                      value={campaignData.timezone || 'UTC'}
                      onChange={(e) => updateCampaignData({ timezone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                      <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                      <option value="Europe/Rome">Rome (CET/CEST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Mumbai">Mumbai (IST)</option>
                      <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                    </select>
                  </div>
                </div>

                {/* Sending Frequency */}
                <div>
                  <Label className="text-base font-semibold">Sending Frequency</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div>
                      <Label htmlFor="emailsPerDay">Emails per day</Label>
                      <Input
                        id="emailsPerDay"
                        type="number"
                        value={campaignData.emailsPerDay}
                        onChange={(e) => updateCampaignData({ emailsPerDay: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                        min="1"
                        max="500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailsPerHour">Emails per hour</Label>
                      <Input
                        id="emailsPerHour"
                        type="number"
                        value={campaignData.emailsPerHour}
                        onChange={(e) => updateCampaignData({ emailsPerHour: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                        min="1"
                        max="50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sendingInterval">Interval (minutes)</Label>
                      <Input
                        id="sendingInterval"
                        type="number"
                        value={campaignData.sendingInterval}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 5;
                          updateCampaignData({ sendingInterval: Math.max(5, value) });
                        }}
                        className="mt-1"
                        min="5"
                        max="60"
                        placeholder="Minimum 5 minutes"
                      />
                      {campaignData.sendingInterval < 5 && (
                        <p className="text-sm text-red-500 mt-1">
                          Minimum interval is 5 minutes for optimal deliverability
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Human-like Timing */}
                <div>
                  <Label className="text-base font-semibold">Natural Timing</Label>
                  <div className="space-y-4 mt-3">
                    <div className="flex items-center space-x-2">
                      <input
                        id="enableJitter"
                        type="checkbox"
                        checked={campaignData.enableJitter}
                        onChange={(e) => updateCampaignData({ enableJitter: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="enableJitter" className="text-sm">
                        Add random variation to appear more natural
                      </Label>
                    </div>

                    {campaignData.enableJitter && (
                      <div>
                        <Label htmlFor="jitterMinutes">Maximum variation (minutes)</Label>
                        <Input
                          id="jitterMinutes"
                          type="number"
                          value={campaignData.jitterMinutes}
                          onChange={(e) => updateCampaignData({ jitterMinutes: Math.min(3, Math.max(1, parseInt(e.target.value) || 3)) })}
                          className="mt-1 max-w-20"
                          min="1"
                          max="3"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          E.g: 15min interval → 9:02, 9:14, 9:32, 9:47 instead of 9:00, 9:15, 9:30, 9:45
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sending Hours */}
                <div>
                  <Label className="text-base font-semibold">Sending Hours</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label htmlFor="startHour">Start hour</Label>
                      <select
                        id="startHour"
                        value={campaignData.sendingHours.start}
                        onChange={(e) => updateCampaignData({
                          sendingHours: { ...campaignData.sendingHours, start: parseInt(e.target.value) }
                        })}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="endHour">End hour</Label>
                      <select
                        id="endHour"
                        value={campaignData.sendingHours.end}
                        onChange={(e) => updateCampaignData({
                          sendingHours: { ...campaignData.sendingHours, end: parseInt(e.target.value) }
                        })}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      >
                        {Array.from({length: 24}, (_, i) => (
                          <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Active Days */}
                <div>
                  <Label className="text-base font-semibold">Active Days</Label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-3">
                    {[
                      {value: 'monday', label: 'Mon'},
                      {value: 'tuesday', label: 'Tue'},
                      {value: 'wednesday', label: 'Wed'},
                      {value: 'thursday', label: 'Thu'},
                      {value: 'friday', label: 'Fri'},
                      {value: 'saturday', label: 'Sat'},
                      {value: 'sunday', label: 'Sun'}
                    ].map(day => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={day.value}
                          checked={campaignData.activeDays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateCampaignData({
                                activeDays: [...campaignData.activeDays, day.value]
                              });
                            } else {
                              updateCampaignData({
                                activeDays: campaignData.activeDays.filter(d => d !== day.value)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <Label htmlFor={day.value} className="text-sm">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Settings Tab */}
          {currentTab === 'advanced' && (
            <div className="space-y-6">
              {/* Stop Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Stop Conditions</span>
                  </CardTitle>
                  <CardDescription>
                    Automatically pause sending to leads when they engage with your emails
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="stopOnReply"
                      checked={campaignData.stopOnReply}
                      onChange={(e) => updateCampaignData({ stopOnReply: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="stopOnReply" className="flex-1">
                      <div className="font-medium">Stop when lead replies</div>
                      <div className="text-sm text-gray-500">Prevent sending follow-ups to engaged prospects</div>
                      <div className="text-xs text-green-600 mt-1">✅ Working - Automatically stops follow-up emails when leads reply</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="stopOnClick"
                      checked={campaignData.stopOnClick}
                      onChange={(e) => updateCampaignData({ stopOnClick: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="stopOnClick" className="flex-1">
                      <div className="font-medium">Stop when lead clicks links</div>
                      <div className="text-sm text-gray-500">Pause sequence when leads show interest</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - Feature not implemented</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="stopOnOpen"
                      checked={campaignData.stopOnOpen}
                      onChange={(e) => updateCampaignData({ stopOnOpen: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="stopOnOpen" className="flex-1">
                      <div className="font-medium">Stop when lead opens email</div>
                      <div className="text-sm text-gray-500">Less aggressive - stops on first open</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - Feature not implemented</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Email Delivery Optimization */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Delivery Optimization</CardTitle>
                  <CardDescription>
                    Improve deliverability and inbox placement rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="sendPlainText"
                      checked={campaignData.sendPlainText}
                      onChange={(e) => updateCampaignData({ sendPlainText: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="sendPlainText" className="flex-1">
                      <div className="font-medium">Send emails in plain text</div>
                      <div className="text-sm text-gray-500">Better deliverability but no HTML formatting</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - Feature not implemented</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="aiEmailMatching"
                      checked={campaignData.aiEmailMatching}
                      onChange={(e) => updateCampaignData({ aiEmailMatching: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="aiEmailMatching" className="flex-1">
                      <div className="font-medium">AI Email Provider Matching</div>
                      <div className="text-sm text-gray-500">Gmail to Gmail, Outlook to Outlook for better delivery</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - AI feature not implemented</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="bounceProtection"
                      checked={campaignData.bounceProtection}
                      onChange={(e) => updateCampaignData({ bounceProtection: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="bounceProtection" className="flex-1">
                      <div className="font-medium">High Bounce Rate Protection</div>
                      <div className="text-sm text-gray-500">Auto-pause campaign if bounce rate exceeds 5%</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Tracking & Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Tracking & Analytics</CardTitle>
                  <CardDescription>
                    Configure what to track for campaign analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="trackOpens"
                      checked={campaignData.trackOpens}
                      onChange={(e) => updateCampaignData({ trackOpens: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="trackOpens" className="flex-1">
                      <div className="font-medium">Track email opens</div>
                      <div className="text-sm text-gray-500">See when leads open your emails</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - Tracking not implemented</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="trackClicks"
                      checked={campaignData.trackClicks}
                      onChange={(e) => updateCampaignData({ trackClicks: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="trackClicks" className="flex-1">
                      <div className="font-medium">Track link clicks</div>
                      <div className="text-sm text-gray-500">Monitor which links leads click</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - Tracking not implemented</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="aiLeadCategorization"
                      checked={campaignData.aiLeadCategorization}
                      onChange={(e) => updateCampaignData({ aiLeadCategorization: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="aiLeadCategorization" className="flex-1">
                      <div className="font-medium">AI Lead Response Categorization</div>
                      <div className="text-sm text-gray-500">Automatically categorize replies as interested/not interested</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - AI feature not implemented</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Company-Level Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Company-Level Controls</CardTitle>
                  <CardDescription>
                    Advanced controls for better lead management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="companyLevelPause"
                      checked={campaignData.companyLevelPause}
                      onChange={(e) => updateCampaignData({ companyLevelPause: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="companyLevelPause" className="flex-1">
                      <div className="font-medium">Company-Level Auto-Pause</div>
                      <div className="text-sm text-gray-500">Stop messaging everyone at a company when someone replies</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - Feature not implemented</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="domainRateLimit"
                      checked={campaignData.domainRateLimit}
                      onChange={(e) => updateCampaignData({ domainRateLimit: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="domainRateLimit" className="flex-1">
                      <div className="font-medium">Domain-Level Rate Limiting</div>
                      <div className="text-sm text-gray-500">Control sending speed per domain for better delivery</div>
                      <div className="text-xs text-orange-600 mt-1">⚠️ Not working - Feature not implemented</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="includeUnsubscribe"
                      checked={campaignData.includeUnsubscribe}
                      onChange={(e) => updateCampaignData({ includeUnsubscribe: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <Label htmlFor="includeUnsubscribe" className="flex-1">
                      <div className="font-medium">Include Unsubscribe Link</div>
                      <div className="text-sm text-gray-500">Add unsubscribe option to comply with regulations</div>
                      <div className="text-xs text-green-600 mt-1">✅ Working - Secure token-based unsubscribe links</div>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              onClick={() => router.push(`/campaigns/${id}`)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCampaign}
              disabled={isSaving || isRestarting || !campaignData.name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving || isRestarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isRestarting ? 'Restarting Campaign...' : 'Saving Campaign...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save & {campaign?.status === 'running' ? 'Restart' : 'Update'} Campaign
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditCampaignPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <EditCampaignPageContent params={params} />
      </AppLayout>
    </ProtectedRoute>
  )
}
