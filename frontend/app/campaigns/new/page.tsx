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
  X
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CSVParser, type LeadData, type ParseResult } from '@/lib/csvParser'
import { useEmailAccountsSelection } from '@/hooks/useEmailAccountsSelection'

interface CampaignData {
  name: string
  description: string
  type: 'outbound' | 'nurture' | 'follow_up'
  goal: string
  emailSubject: string
  emailContent: string
  followUpEnabled: boolean
  followUpDelay: number
  selectedLeads: string[]
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
  csvData: any[]          // dati del CSV caricato
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
    name: 'Select Leads',
    description: 'Choose your audience',
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
    name: 'Review & Launch',
    description: 'Final review and launch',
    icon: Play
  }
]

function CampaignBuilderContent() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [csvParseResult, setCsvParseResult] = useState<ParseResult | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const { accounts: emailAccounts, loading: accountsLoading, error: accountsError, refresh: refreshAccounts } = useEmailAccountsSelection()
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    description: '',
    type: 'outbound',
    goal: '',
    emailSubject: '',
    emailContent: '',
    followUpEnabled: false,
    followUpDelay: 3,
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
    csvData: []
  })

  const updateCampaignData = (data: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...data }))
  }

  const handleCSVUpload = async (file: File) => {
    setCsvUploading(true)
    setCsvParseResult(null)
    
    try {
      const result = await CSVParser.parseCSV(file)
      setCsvParseResult(result)
      
      if (result.success) {
        updateCampaignData({ 
          csvData: result.data,
          selectedLeads: [file.name]
        })
      }
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
        return campaignData.name.trim() !== '' && campaignData.goal.trim() !== ''
      case 2:
        return campaignData.emailSubject.trim() !== '' && campaignData.emailContent.trim() !== ''
      case 3:
        return campaignData.csvData.length > 0 || campaignData.selectedLeads.length > 0
      case 4:
        return campaignData.emailAccounts.length > 0
      case 5:
        return campaignData.emailsPerDay > 0 && campaignData.sendingInterval > 0
      case 6:
        return true
      default:
        return false
    }
  }

  const handleLaunch = async () => {
    try {
      console.log('Creating campaign:', campaignData)
      
      // Create campaign via API
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token-based auth
        },
        body: JSON.stringify(campaignData)
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
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={campaignData.description}
                  onChange={(e) => updateCampaignData({ description: e.target.value })}
                  placeholder="Describe your campaign objectives..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="type">Campaign Type</Label>
                <select
                  id="type"
                  value={campaignData.type}
                  onChange={(e) => updateCampaignData({ type: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="outbound">Cold Outreach</option>
                  <option value="nurture">Lead Nurturing</option>
                  <option value="follow_up">Follow-up Campaign</option>
                </select>
              </div>
              <div>
                <Label htmlFor="goal">Campaign Goal *</Label>
                <Input
                  id="goal"
                  value={campaignData.goal}
                  onChange={(e) => updateCampaignData({ goal: e.target.value })}
                  placeholder="e.g., Generate 50 qualified leads"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="subject">Email Subject Line *</Label>
                <Input
                  id="subject"
                  value={campaignData.emailSubject}
                  onChange={(e) => updateCampaignData({ emailSubject: e.target.value })}
                  placeholder="e.g., Quick question about your marketing stack"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="content">Email Content *</Label>
                <textarea
                  id="content"
                  value={campaignData.emailContent}
                  onChange={(e) => updateCampaignData({ emailContent: e.target.value })}
                  placeholder="Hi {first_name},&#10;&#10;I noticed your company is..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  rows={10}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Use {'{first_name}'}, {'{company}'}, and other variables to personalize your emails.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="followUp"
                  checked={campaignData.followUpEnabled}
                  onChange={(e) => updateCampaignData({ followUpEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <Label htmlFor="followUp">Enable automatic follow-up sequence</Label>
              </div>
              {campaignData.followUpEnabled && (
                <div>
                  <Label htmlFor="delay">Follow-up delay (days)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={campaignData.followUpDelay}
                    onChange={(e) => updateCampaignData({ followUpDelay: parseInt(e.target.value) })}
                    className="mt-1 w-24"
                    min="1"
                    max="30"
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Your Leads</h3>
                  <p className="text-gray-500 mb-6">
                    Upload a CSV file with your leads data. Maximum file size: 5MB
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleCSVUpload(file);
                          }
                        }}
                        className="hidden"
                        disabled={csvUploading}
                        id="csv-file-input"
                      />
                      <Button 
                        variant="outline" 
                        disabled={csvUploading}
                        className="flex items-center cursor-pointer"
                        onClick={() => {
                          const input = document.getElementById('csv-file-input') as HTMLInputElement;
                          input?.click();
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {csvUploading ? 'Processing...' : 'Choose CSV File'}
                      </Button>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      onClick={handleDownloadTemplate}
                      className="flex items-center text-sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <div className="font-medium mb-1">Required column: email</div>
                    <div>Optional columns: firstName, lastName, company, or any custom fields</div>
                  </div>
                </div>
              </div>

              {/* Processing Indicator */}
              {csvUploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-blue-800 font-medium">Processing CSV file...</span>
                  </div>
                </div>
              )}

              {/* Parse Results */}
              {csvParseResult && !csvUploading && (
                <div>
                  {csvParseResult.success ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Check className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">
                          {csvParseResult.validRows} leads imported successfully
                        </span>
                      </div>
                      
                      <div className="text-sm text-green-700 space-y-1">
                        <div>File: {campaignData.selectedLeads[0]}</div>
                        <div>Total rows processed: {csvParseResult.totalRows}</div>
                        <div>Valid leads: {csvParseResult.validRows}</div>
                      </div>

                      {csvParseResult.warnings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <div className="flex items-center mb-2">
                            <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                            <span className="text-sm font-medium text-orange-800">Warnings:</span>
                          </div>
                          <div className="text-sm text-orange-700 space-y-1">
                            {csvParseResult.warnings.slice(0, 5).map((warning, index) => (
                              <div key={index}>• {warning}</div>
                            ))}
                            {csvParseResult.warnings.length > 5 && (
                              <div className="text-orange-600">
                                ... and {csvParseResult.warnings.length - 5} more warnings
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Preview first few leads */}
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <div className="text-sm font-medium text-green-800 mb-2">Preview (first 3 leads):</div>
                        <div className="text-xs text-green-700 space-y-1">
                          {csvParseResult.data.slice(0, 3).map((lead, index) => (
                            <div key={index} className="flex items-center space-x-4">
                              <span className="font-medium">{lead.email}</span>
                              {lead.firstName && <span>{lead.firstName}</span>}
                              {lead.lastName && <span>{lead.lastName}</span>}
                              {lead.company && <span>({lead.company})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <X className="h-5 w-5 text-red-600 mr-2" />
                          <span className="text-red-800 font-medium">Failed to process CSV</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCsvParseResult(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="text-sm text-red-700 space-y-1">
                        {csvParseResult.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                  <Link href="/settings/email-accounts">
                    <Button>
                      Add Email Account
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
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
            <div className="space-y-6">
              <div>
                <Label>Launch Options</Label>
                <div className="mt-2 space-y-3">
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
              </div>

              {/* Campaign Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">Campaign Summary</h3>
                
                {/* Basic Info */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Campaign Name:</span>
                      <span className="font-medium">{campaignData.name || 'Untitled Campaign'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{campaignData.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email Subject:</span>
                      <span className="font-medium truncate max-w-xs">{campaignData.emailSubject || 'Not set'}</span>
                    </div>
                  </div>
                </div>

                {/* Leads Info */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-2">Audience</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Leads:</span>
                      <span className="font-medium">{campaignData.csvData.length} contacts</span>
                    </div>
                    {campaignData.selectedLeads.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Source File:</span>
                        <span className="font-medium text-xs truncate max-w-xs">{campaignData.selectedLeads[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Accounts */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-2">Email Accounts</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selected Accounts:</span>
                      <span className="font-medium">{campaignData.emailAccounts.length} account(s)</span>
                    </div>
                    {campaignData.emailAccounts.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Combined Daily Limit:</span>
                        <span className="font-medium">
                          {emailAccounts
                            .filter(acc => campaignData.emailAccounts.includes(acc.id))
                            .reduce((sum, acc) => sum + acc.daily_limit, 0)} emails/day
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timing Configuration */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-2">Timing Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Emails per Day:</span>
                      <span className="font-medium">{campaignData.emailsPerDay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Emails per Hour:</span>
                      <span className="font-medium">{campaignData.emailsPerHour}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Send Interval:</span>
                      <span className="font-medium">Every {campaignData.sendingInterval} minutes</span>
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

                {/* N8N Integration Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">🔄 Automation Settings</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>✅ N8N workflow will trigger every {campaignData.sendingInterval} minutes</div>
                    <div>✅ Emails will be personalized with lead data</div>
                    <div>✅ Account rotation will be automatic for better deliverability</div>
                    <div>✅ Real-time status tracking in Supabase</div>
                  </div>
                </div>
              </div>
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