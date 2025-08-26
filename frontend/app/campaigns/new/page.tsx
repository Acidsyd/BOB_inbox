'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Target, 
  Mail, 
  Users, 
  Settings, 
  Calendar,
  Play,
  Upload,
  Download,
  AlertCircle,
  X,
  Send,
  CheckCircle,
  BarChart
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CSVParser, type LeadData, type ParseResult } from '@/lib/csvParser'
import { useWorkflowNavigation } from '@/lib/navigation/context'
import { useEmailAccountsSelection } from '@/hooks/useEmailAccountsSelection'
import RichTextEditor from '@/components/ui/rich-text-editor'
import EmailSequenceBuilder from '@/components/campaigns/EmailSequenceBuilder'
import CSVFieldMapper from '@/components/campaigns/CSVFieldMapper'
import EmailPreviewAndTest from '@/components/campaigns/EmailPreviewAndTest'
import TrackingConfigurationPanel from '@/components/campaigns/TrackingConfigurationPanel'
import LeadListSelector from '@/components/campaigns/LeadListSelector'
import { api } from '@/lib/api'
import { useTrackingConfiguration } from '@/hooks/useTrackingConfiguration'
import type { TrackingConfiguration } from '@/hooks/useTrackingConfiguration'

interface EmailSequence {
  id: number
  subject: string
  content: string
  delay: number // days after previous email
}

interface CampaignData {
  name: string
  description: string
  emailSubject: string
  emailContent: string
  followUpEnabled: boolean
  emailSequence: EmailSequence[]
  selectedLeads: string[]
  selectedLeadListId?: string
  selectedLeadListName?: string
  selectedLeadListCount?: number
  emailAccounts: string[]
  scheduleType: 'immediate' | 'scheduled'
  scheduledDate?: Date
  dailyLimit: number
  // Parametri timing avanzati
  emailsPerDay: number
  emailsPerHour: number
  emailsPerMinute: number
  sendingInterval: number  // minuti tra ogni invio
  activeDays: string[]     // giorni della settimana ['monday', 'tuesday', ...]
  sendingHours: {
    start: number         // ora di inizio (0-23)
    end: number          // ora di fine (0-23)
  }
  timezone: string        // timezone per la campagna
  csvData: any[]          // dati del CSV caricato
  csvHeaders: string[]    // intestazioni CSV
  csvRawData: any[][]     // dati grezzi CSV per mapping
  // Advanced Settings
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
  // Tracking Configuration
  trackingConfiguration: TrackingConfiguration | null
}

const steps = [
  {
    id: 1,
    name: 'Campaign Info',
    description: 'Basic campaign details',
    icon: Target
  },
  {
    id: 2,
    name: 'Email Sequence',
    description: 'Create your email content',
    icon: Mail
  },
  {
    id: 3,
    name: 'Lead List Selection',
    description: 'Choose your lead list',
    icon: Users
  },
  {
    id: 4,
    name: 'Email Accounts',
    description: 'Configure sending accounts',
    icon: Settings
  },
  {
    id: 5,
    name: 'Timing Settings',
    description: 'Configure sending frequency',
    icon: Calendar
  },
  {
    id: 6,
    name: 'Tracking Settings',
    description: 'Configure email tracking',
    icon: BarChart
  },
  {
    id: 7,
    name: 'Advanced Settings',
    description: 'Campaign optimization',
    icon: Settings
  },
  {
    id: 8,
    name: 'Review & Test',
    description: 'Final review and test email',
    icon: Play
  }
]

function CampaignBuilderContent() {
  const router = useRouter()
  const workflowNavigation = useWorkflowNavigation()
  const [currentStep, setCurrentStep] = useState(1)
  const [csvParseResult, setCsvParseResult] = useState<ParseResult | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [showFieldMapping, setShowFieldMapping] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testEmailSent, setTestEmailSent] = useState(false)
  const [testEmailError, setTestEmailError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { accounts: emailAccounts, loading: accountsLoading, error: accountsError, refresh: refreshAccounts } = useEmailAccountsSelection()
  const { 
    configuration: trackingConfig, 
    accountTrackingHealths, 
    refreshAccountHealth,
    testTrackingSetup 
  } = useTrackingConfiguration()
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    description: '',
    emailSubject: '',
    emailContent: '',
    followUpEnabled: false,
    emailSequence: [],
    selectedLeads: [],
    emailAccounts: [],
    scheduleType: 'immediate',
    dailyLimit: 50,
    // Parametri timing avanzati
    emailsPerDay: 50,
    emailsPerHour: 5,
    emailsPerMinute: 1,
    sendingInterval: 15,  // 15 minuti tra ogni invio
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    sendingHours: {
      start: 9,   // 9:00 AM
      end: 17     // 5:00 PM
    },
    timezone: 'UTC',
    csvData: [],
    csvHeaders: [],
    csvRawData: [],
    // Advanced Settings defaults
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
    includeUnsubscribe: true,
    // Tracking Configuration
    trackingConfiguration: null as TrackingConfiguration | null
  })

  const updateCampaignData = (data: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...data }))
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail || !campaignData.emailSubject || !campaignData.emailContent) {
      return
    }

    setIsLoading(true)
    setTestEmailError('')
    setTestEmailSent(false)

    try {
      // Use sample data from CSV for personalization
      const sampleData = campaignData.csvData[0] || {}
      
      // Create personalized content
      let personalizedSubject = campaignData.emailSubject
      let personalizedContent = campaignData.emailContent
      
      // Replace placeholders with sample data
      Object.entries(sampleData).forEach(([key, value]) => {
        const placeholder = `{${key}}`
        personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), String(value) || '[Sample Data]')
        personalizedContent = personalizedContent.replace(new RegExp(placeholder, 'g'), String(value) || '[Sample Data]')
      })

      // Make API call to send test email
      const response = await api.post('/campaigns/test-email', {
        to: testEmail,
        subject: personalizedSubject,
        content: personalizedContent,
        sampleData: sampleData
      })

      setTestEmailSent(true)
      setTimeout(() => setTestEmailSent(false), 5000) // Reset after 5 seconds

    } catch (error: any) {
      console.error('Error sending test email:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred'
      setTestEmailError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Parse CSV for field mapping
  const parseCSVForMapping = async (file: File): Promise<{headers: string[], rawData: any[][]} | null> => {
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file, 'UTF-8')
      })

      const lines = content.split('\n').filter(line => line.trim())
      if (lines.length === 0) return null

      // Parse CSV lines
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        let i = 0

        while (i < line.length) {
          const char = line[i]
          if (char === '"' && !inQuotes) {
            inQuotes = true
          } else if (char === '"' && inQuotes) {
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = false
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
          i++
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0])
      const rawData = lines.slice(1).map(line => parseCSVLine(line))

      return { headers, rawData }
    } catch (error) {
      return null
    }
  }

  const handleCSVUpload = async (file: File) => {
    setCsvUploading(true)
    setCsvParseResult(null)
    
    try {
      // Parse CSV for field mapping first
      const csvMapping = await parseCSVForMapping(file)
      if (!csvMapping) {
        throw new Error('Failed to parse CSV file')
      }

      // Store headers and raw data for mapping
      updateCampaignData({
        csvHeaders: csvMapping.headers,
        csvRawData: csvMapping.rawData,
        selectedLeads: [file.name]
      })

      // Show field mapping interface
      setShowFieldMapping(true)
      setCsvParseResult({
        success: true,
        data: [],
        errors: [],
        warnings: [`CSV file loaded with ${csvMapping.headers.length} columns and ${csvMapping.rawData.length} rows`],
        totalRows: csvMapping.rawData.length,
        validRows: 0
      })
    } catch (error) {
      setCsvParseResult({
        success: false,
        data: [],
        errors: [`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        totalRows: 0,
        validRows: 0
      })
    } finally {
      setCsvUploading(false)
    }
  }

  // Handle field mapping completion
  const handleMappingComplete = (mapping: Record<string, number>, mappedData: any[]) => {
    updateCampaignData({ csvData: mappedData })
    setShowFieldMapping(false)
    setCsvParseResult({
      success: true,
      data: mappedData,
      errors: [],
      warnings: [],
      totalRows: mappedData.length,
      validRows: mappedData.length
    })
  }

  // Handle field mapping cancel
  const handleMappingCancel = () => {
    setShowFieldMapping(false)
    setCsvParseResult(null)
    updateCampaignData({ 
      csvHeaders: [],
      csvRawData: [],
      csvData: [],
      selectedLeads: []
    })
  }

  const handleDownloadTemplate = () => {
    CSVParser.downloadTemplate()
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return campaignData.name.trim() !== ''
      case 2:
        // Check initial email and all sequence emails are complete
        const initialComplete = campaignData.emailSubject.trim() !== '' && campaignData.emailContent.trim() !== ''
        const sequenceComplete = campaignData.emailSequence.every(email => 
          email.subject.trim() !== '' && email.content.trim() !== ''
        )
        return initialComplete && sequenceComplete
      case 3:
        return !!campaignData.selectedLeadListId
      case 4:
        return campaignData.emailAccounts.length > 0
      case 5:
        return campaignData.emailsPerDay > 0 && campaignData.sendingInterval > 0
      case 6:
        return true // Tracking settings are optional
      case 7:
        return true
      default:
        return false
    }
  }

  const handleLaunch = async () => {
    try {
      console.log('Creating campaign:', campaignData)
      
      // Prepare campaign data for API - replace CSV data with lead list ID
      const apiCampaignData = {
        ...campaignData,
        leadListId: campaignData.selectedLeadListId,
        // Remove unnecessary fields for API
        csvData: undefined,
        csvHeaders: undefined,
        csvRawData: undefined,
        selectedLeadListId: undefined,
        selectedLeadListName: undefined,
        selectedLeadListCount: undefined
      }
      
      // Create campaign via API
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token-based auth
        },
        body: JSON.stringify(apiCampaignData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create campaign')
      }

      const result = await response.json()
      console.log('Campaign created:', result)

      // If immediate launch is selected, start the campaign
      if (campaignData.scheduleType === 'immediate') {
        const startResponse = await fetch(`/api/campaigns/${result.campaign.id}/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (startResponse.ok) {
          const startResult = await startResponse.json()
          console.log('Campaign started:', startResult)
        }
      }

      // Preserve workflow by preventing auth redirects during campaign creation  
      workflowNavigation.preserveWorkflow('/campaigns')
      
      // Redirect to campaigns page
      router.push('/campaigns')
      
    } catch (error) {
      console.error('Error launching campaign:', error)
      // TODO: Show error message to user
      alert('Failed to create campaign: ' + error.message)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/campaigns">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
          <p className="text-gray-600">Follow the steps to set up your outreach campaign</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-3 ${
                    isCompleted 
                      ? 'bg-green-600 text-white' 
                      : isActive 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Step {currentStep}: {steps[currentStep - 1].name}</CardTitle>
          <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={campaignData.name}
                  onChange={(e) => updateCampaignData({ name: e.target.value })}
                  placeholder="e.g., Q1 Outbound Campaign"
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
            </div>
          )}

          {currentStep === 2 && (
            <EmailSequenceBuilder 
              campaignData={campaignData}
              updateCampaignData={updateCampaignData}
            />
          )}

          {currentStep === 3 && (
            <LeadListSelector
              selectedListId={campaignData.selectedLeadListId}
              onListSelect={(listId, list) => {
                updateCampaignData({
                  selectedLeadListId: listId,
                  selectedLeadListName: list.name,
                  selectedLeadListCount: list.activeLeads
                })
              }}
              onClearSelection={() => {
                updateCampaignData({
                  selectedLeadListId: undefined,
                  selectedLeadListName: undefined,
                  selectedLeadListCount: undefined
                })
              }}
            />
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Email Accounts</h3>
                <p className="text-gray-500 mb-4">
                  Choose which email accounts to use for sending this campaign
                </p>
              </div>

              {/* Loading State */}
              {accountsLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading email accounts...</p>
                </div>
              )}

              {/* Error State */}
              {accountsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">Error loading accounts</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={refreshAccounts}
                    >
                      Retry
                    </Button>
                  </div>
                  <p className="text-sm text-red-700">{accountsError}</p>
                </div>
              )}

              {/* Email Accounts List */}
              {!accountsLoading && !accountsError && emailAccounts.length > 0 && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-3">
                    Select one or more accounts for sending. We recommend using multiple accounts for better deliverability.
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
                                {/* Provider Badge */}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  account.provider === 'gmail' ? 'bg-red-100 text-red-800' :
                                  account.provider === 'outlook' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                                </span>
                                
                                {/* Health Score */}
                                <div className="flex items-center">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    account.health_score >= 90 ? 'bg-green-500' :
                                    account.health_score >= 70 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}></span>
                                  <span className="text-gray-600">Health: {account.health_score}%</span>
                                </div>
                                
                                {/* Warmup Status */}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  account.warmup_status === 'active' ? 'bg-green-100 text-green-800' :
                                  account.warmup_status === 'warming' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {account.warmup_status === 'active' ? 'Ready' : 
                                   account.warmup_status === 'warming' ? 'Warming' : 
                                   account.warmup_status}
                                </span>
                                
                                {/* Daily Limit */}
                                <span className="text-gray-600">
                                  Limit: {account.daily_limit}/day
                                </span>
                              </div>
                            </div>
                            
                            {account.warmup_status !== 'active' && (
                              <div className="mt-2 text-sm text-orange-600">
                                This account is not ready for campaigns yet. 
                                {account.warmup_status === 'warming' ? ' Currently warming up.' : ' Needs setup.'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
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
                        <div className="text-blue-600 text-xs mt-2">
                          💡 Multiple accounts will rotate automatically for better deliverability
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Accounts State */}
              {!accountsLoading && !accountsError && emailAccounts.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Accounts Available</h3>
                  <p className="text-gray-500 mb-4">
                    You need to configure at least one email account before creating campaigns.
                  </p>
                  <Button
                    onClick={() => {
                      // Preserve the campaign creation workflow
                      workflowNavigation.preserveWorkflow('/campaigns/new')
                      router.push('/settings/email-accounts')
                    }}
                  >
                    Add Email Account
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
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
                  <p className="mt-2 text-sm text-gray-500">
                    All campaign timing will be based on this timezone.
                  </p>
                </div>
              </div>

              {/* Frequenza invio */}
              <div>
                <Label className="text-base font-semibold">Frequenza di Invio</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <Label htmlFor="emailsPerDay">Email per giorno</Label>
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
                    <Label htmlFor="emailsPerHour">Email per ora</Label>
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
                    <Label htmlFor="sendingInterval">Intervallo (minuti)</Label>
                    <Input
                      id="sendingInterval"
                      type="number"
                      value={campaignData.sendingInterval}
                      onChange={(e) => updateCampaignData({ sendingInterval: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                      min="1"
                      max="60"
                    />
                  </div>
                </div>
              </div>

              {/* Orari di invio */}
              <div>
                <Label className="text-base font-semibold">Orari di Invio</Label>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label htmlFor="startHour">Ora di inizio</Label>
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
                    <Label htmlFor="endHour">Ora di fine</Label>
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

              {/* Giorni della settimana */}
              <div>
                <Label className="text-base font-semibold">Giorni della Settimana</Label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-3">
                  {[
                    {value: 'monday', label: 'Lun'},
                    {value: 'tuesday', label: 'Mar'}, 
                    {value: 'wednesday', label: 'Mer'},
                    {value: 'thursday', label: 'Gio'},
                    {value: 'friday', label: 'Ven'},
                    {value: 'saturday', label: 'Sab'},
                    {value: 'sunday', label: 'Dom'}
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

              {/* Preview calcolo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Riepilogo Timing</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>Trigger N8N ogni: {campaignData.sendingInterval} minuti</div>
                  <div>Orario: {String(campaignData.sendingHours.start).padStart(2, '0')}:00 - {String(campaignData.sendingHours.end).padStart(2, '0')}:00</div>
                  <div>Giorni attivi: {campaignData.activeDays.length}</div>
                  <div>Email al giorno: {campaignData.emailsPerDay}</div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <TrackingConfigurationPanel
              campaignData={campaignData}
              onTrackingChange={(trackingConfig) => {
                updateCampaignData({ trackingConfiguration: { ...campaignData.trackingConfiguration, ...trackingConfig } })
              }}
              showAdvancedOptions={true}
            />
          )}

          {currentStep === 7 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Campaign Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure advanced options to optimize your campaign performance and deliverability.
                </p>
              </div>

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
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-6">
              {/* Email Preview and Test Component */}
              <EmailPreviewAndTest 
                campaignData={campaignData}
                emailAccounts={emailAccounts}
                onTestEmailSent={(success, message) => {
                  setTestEmailSent(success)
                  setTestEmailError(success ? '' : message)
                }}
              />

              {/* Launch Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Launch Options</CardTitle>
                  <CardDescription>Choose when to launch your campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="immediate"
                        name="schedule"
                        checked={campaignData.scheduleType === 'immediate'}
                        onChange={() => updateCampaignData({ scheduleType: 'immediate' })}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <Label htmlFor="immediate">Launch immediately</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="scheduled"
                        name="schedule"
                        checked={campaignData.scheduleType === 'scheduled'}
                        onChange={() => updateCampaignData({ scheduleType: 'scheduled' })}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <Label htmlFor="scheduled">Schedule for later</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Summary</CardTitle>
                  <CardDescription>Review your campaign settings before launching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Campaign Name:</span>
                        <span className="font-medium">{campaignData.name || 'Untitled Campaign'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email Sequence:</span>
                        <span className="font-medium">
                          {1 + campaignData.emailSequence.length} email(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Leads Info */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Audience</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lead List:</span>
                        <span className="font-medium">{campaignData.selectedLeadListName || 'Not selected'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Leads:</span>
                        <span className="font-medium">{campaignData.selectedLeadListCount || 0} contacts</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Accounts */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Email Accounts</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selected Accounts:</span>
                        <span className="font-medium">{campaignData.emailAccounts.length} account(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Timing Configuration */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Timing Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Emails per Day:</span>
                        <span className="font-medium">{campaignData.emailsPerDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Send Hours:</span>
                        <span className="font-medium">
                          {String(campaignData.sendingHours.start).padStart(2, '0')}:00 - {String(campaignData.sendingHours.end).padStart(2, '0')}:00
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Days:</span>
                        <span className="font-medium">{campaignData.activeDays.length} days/week</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>
        <div>
          {currentStep < steps.length ? (
            <Button 
              onClick={nextStep}
              disabled={!canProceed()}
              className="btn-primary"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleLaunch}
              disabled={!canProceed()}
              className="btn-primary"
            >
              <Play className="h-4 w-4 mr-2" />
              Launch Campaign
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NewCampaignPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CampaignBuilderContent />
      </AppLayout>
    </ProtectedRoute>
  )
}