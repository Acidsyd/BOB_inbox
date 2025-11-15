'use client'

import ProtectedRoute from '../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { useToast } from '../../../../components/ui/toast'
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  CheckCircle,
  Loader2,
  Mail,
  Zap,
  Eye,
  EyeOff,
  TestTube,
  ChevronRight,
  Send
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkflowNavigation } from '../../../../lib/navigation/context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'

type SetupStep = 'provider-selection' | 'gmail-oauth2-setup' | 'microsoft-oauth2-setup' | 'sendgrid-setup' | 'mailgun-setup'
type Provider = 'gmail-oauth2' | 'microsoft-oauth2' | 'sendgrid' | 'mailgun'

interface RelayProviderConfig {
  provider_type: 'sendgrid' | 'mailgun'
  provider_name: string
  api_key: string
  from_email: string
  from_name: string
  daily_limit: number
  // Mailgun-specific
  domain?: string
  region?: 'us' | 'eu'
}

function AddEmailAccountContent() {
  const { addToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workflowNavigation = useWorkflowNavigation()

  // State management
  const [currentStep, setCurrentStep] = useState<SetupStep>('provider-selection')
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionTestPassed, setConnectionTestPassed] = useState(false)

  // Relay Provider Configuration
  const [relayConfig, setRelayConfig] = useState<RelayProviderConfig>({
    provider_type: 'sendgrid',
    provider_name: '',
    api_key: '',
    from_email: '',  // Still needed for SendGrid
    from_name: '',   // Still needed for SendGrid
    daily_limit: 100,
    domain: '',
    region: 'us'
  })

  // Load existing Mailgun provider and redirect to Step 2 if exists (unless editing)
  useEffect(() => {
    const loadMailgunProvider = async () => {
      if (currentStep !== 'mailgun-setup') return

      // Check if user wants to edit the configuration
      const isEditMode = searchParams.get('edit') === 'true'

      try {
        const token = localStorage.getItem('token')
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

        const response = await fetch(`${apiUrl}/api/relay-providers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          const mailgunProvider = data.providers?.find((p: any) => p.provider_type === 'mailgun')

          if (mailgunProvider) {
            if (isEditMode) {
              // Edit mode - load configuration into form
              setRelayConfig({
                provider_type: 'mailgun',
                provider_name: mailgunProvider.provider_name || '',
                api_key: mailgunProvider.api_key || '',
                from_email: mailgunProvider.from_email || '',
                from_name: mailgunProvider.from_name || '',
                daily_limit: mailgunProvider.daily_limit || 100,
                domain: mailgunProvider.domain || '',
                region: (mailgunProvider.region || 'us') as 'us' | 'eu'
              })
              setConnectionTestPassed(true)
            } else {
              // Not edit mode - redirect directly to Step 2 (link-accounts page)
              router.push(`/settings/email-accounts/mailgun/${mailgunProvider.id}/link-accounts`)
            }
          }
        }
      } catch (error) {
        console.error('Error loading Mailgun provider:', error)
      }
    }

    loadMailgunProvider()
  }, [currentStep, router, searchParams])

  // Check for OAuth2 callback results
  useEffect(() => {
    const oauth2Success = searchParams.get('oauth2_success')
    const oauth2Error = searchParams.get('oauth2_error')
    const provider = searchParams.get('provider')
    const email = searchParams.get('email')

    if (oauth2Success === 'true') {
      const providerName = provider === 'microsoft' ? 'Microsoft Graph API' : 'Gmail API'
      addToast({
        title: 'OAuth2 Setup Complete!',
        description: `Successfully connected ${email} via ${providerName}`,
        type: 'success'
      })

      setTimeout(() => {
        if (workflowNavigation.returnPath) {
          router.push(workflowNavigation.returnPath)
          workflowNavigation.clearNavigationState()
        } else {
          router.push('/settings/email-accounts')
        }
      }, 2000)
    }

    if (oauth2Error) {
      addToast({
        title: 'OAuth2 Setup Failed',
        description: decodeURIComponent(oauth2Error),
        type: 'error'
      })
    }
  }, [searchParams, addToast, router])

  // Gmail OAuth2 Setup Handler
  const handleGmailOAuth2Setup = async () => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      const response = await fetch('/api/oauth2/auth/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          navigationContext: {
            returnPath: workflowNavigation.returnPath,
            workflowName: 'email-account-setup'
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initialize Gmail OAuth2 setup')
      }

      if (result.success && result.authUrl) {
        addToast({
          title: 'Redirecting to Google',
          description: 'Opening Google authorization page...',
          type: 'info'
        })

        window.location.href = result.authUrl
      } else {
        throw new Error('Failed to get Gmail authorization URL')
      }

    } catch (error: any) {
      console.error('Gmail OAuth2 setup error:', error)
      addToast({
        title: 'Gmail Setup Failed',
        description: error.message || 'Failed to start Gmail OAuth2 setup process',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Microsoft OAuth2 Setup Handler
  const handleMicrosoftOAuth2Setup = async () => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      const response = await fetch('/api/oauth2/microsoft/auth/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          navigationContext: {
            returnPath: workflowNavigation.returnPath,
            workflowName: 'email-account-setup'
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initialize Microsoft OAuth2 setup')
      }

      if (result.success && result.authUrl) {
        addToast({
          title: 'Redirecting to Microsoft',
          description: 'Opening Microsoft authorization page...',
          type: 'info'
        })

        window.location.href = result.authUrl
      } else {
        throw new Error('Failed to get Microsoft authorization URL')
      }

    } catch (error: any) {
      console.error('Microsoft OAuth2 setup error:', error)

      if (error.message.includes('Microsoft OAuth2 service is not available') ||
          error.message.includes('not configured')) {
        addToast({
          title: 'Microsoft OAuth2 Not Configured',
          description: 'Microsoft OAuth2 requires Azure App Registration setup. Please check your configuration.',
          type: 'error'
        })
      } else {
        addToast({
          title: 'Microsoft Setup Failed',
          description: error.message || 'Failed to start Microsoft OAuth2 setup process',
          type: 'error'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Relay Provider Test Handler
  const handleRelayTest = async () => {
    setIsTestingConnection(true)
    setConnectionTestPassed(false)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      // For SendGrid: require from_email
      if (relayConfig.provider_type === 'sendgrid' && (!relayConfig.api_key || !relayConfig.from_email)) {
        throw new Error('Please fill in API key and from email')
      }

      // For Mailgun: only require api_key and domain (NO from_email!)
      if (relayConfig.provider_type === 'mailgun') {
        if (!relayConfig.api_key || !relayConfig.domain) {
          throw new Error('Please fill in API key and domain')
        }
      }

      // Create relay provider with validation
      const testPayload: any = {
        provider_type: relayConfig.provider_type,
        provider_name: relayConfig.provider_name || `${relayConfig.provider_type} Account`,
        api_key: relayConfig.api_key,
        daily_limit: relayConfig.daily_limit,
        config: {}
      }

      // Add from_email and from_name ONLY for SendGrid
      if (relayConfig.provider_type === 'sendgrid') {
        testPayload.from_email = relayConfig.from_email
        testPayload.from_name = relayConfig.from_name
      }

      // Add Mailgun-specific config
      if (relayConfig.provider_type === 'mailgun') {
        testPayload.config = {
          domain: relayConfig.domain,
          region: relayConfig.region
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const response = await fetch(`${apiUrl}/api/relay-providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testPayload)
      })

      const result = await response.json()

      if (result.success) {
        setConnectionTestPassed(true)
        addToast({
          title: 'API Key Validated!',
          description: `${relayConfig.provider_type === 'sendgrid' ? 'SendGrid' : 'Mailgun'} connection successful.`,
          type: 'success'
        })

        // Store the provider ID for Step 2 (link email accounts)
        ;(window as any).__temp_relay_provider_id = result.provider.id
      } else {
        throw new Error(result.error || 'Validation failed')
      }

    } catch (error: any) {
      console.error('Relay test error:', error)
      addToast({
        title: 'Connection Test Failed',
        description: error.message || 'Failed to validate API key',
        type: 'error',
        duration: 10000
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  // Relay Provider Save Handler
  const handleRelaySave = async () => {
    setIsLoading(true)

    try {
      if (!connectionTestPassed) {
        throw new Error('Please test the connection first before saving')
      }

      // Get the relay provider ID from temp storage
      const relayProviderId = (window as any).__temp_relay_provider_id
      if (!relayProviderId) {
        throw new Error('Relay provider ID not found. Please test connection again.')
      }

      // For Mailgun: Redirect to Step 2 (link email accounts)
      if (relayConfig.provider_type === 'mailgun') {
        addToast({
          title: 'Mailgun Configured!',
          description: 'Now link your email accounts to this provider',
          type: 'success'
        })

        // Redirect to link-accounts page
        router.push(`/settings/email-accounts/mailgun/${relayProviderId}/link-accounts`)
        return
      }

      // For SendGrid: Keep the old flow (create email account directly)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Create an email account associated with this relay provider
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const emailAccountResponse = await fetch(`${apiUrl}/api/email-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: relayConfig.from_email,
          provider: relayConfig.provider_type,
          relay_provider_id: relayProviderId,
          settings: {
            from_name: relayConfig.from_name,
            daily_limit: relayConfig.daily_limit
          }
        })
      })

      if (!emailAccountResponse.ok) {
        const errorData = await emailAccountResponse.json()
        throw new Error(errorData.error || 'Failed to create email account')
      }

      addToast({
        title: 'SendGrid Added!',
        description: `Successfully configured ${relayConfig.from_email}`,
        type: 'success'
      })

      // Clean up temp storage
      delete (window as any).__temp_relay_provider_id

      setTimeout(() => {
        router.push('/settings/email-accounts')
      }, 2000)

    } catch (error: any) {
      console.error('Relay save error:', error)
      addToast({
        title: 'Setup Failed',
        description: error.message || 'Failed to save configuration',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Provider Selection Handler
  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider)
    if (provider === 'gmail-oauth2') {
      setCurrentStep('gmail-oauth2-setup')
    } else if (provider === 'microsoft-oauth2') {
      setCurrentStep('microsoft-oauth2-setup')
    } else if (provider === 'sendgrid') {
      setRelayConfig(prev => ({ ...prev, provider_type: 'sendgrid' }))
      setCurrentStep('sendgrid-setup')
    } else if (provider === 'mailgun') {
      setRelayConfig(prev => ({ ...prev, provider_type: 'mailgun' }))
      setCurrentStep('mailgun-setup')
    }
  }

  // Provider Selection Step
  if (currentStep === 'provider-selection') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/settings/email-accounts">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Email Accounts
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Email Account</h1>
            <p className="text-gray-600">Choose how you want to connect your email account</p>
          </div>
        </div>

        {/* Provider Options */}
        <div className="grid lg:grid-cols-2 md:grid-cols-2 gap-6">
          {/* Gmail OAuth2 Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
                onClick={() => handleProviderSelect('gmail-oauth2')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-6 w-6 mr-3 text-blue-600" />
                Gmail OAuth2
              </CardTitle>
              <CardDescription>
                Secure Gmail API integration with Google OAuth2 authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">87% better deliverability</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Enhanced security</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">10x performance vs SMTP</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Automatic token refresh</span>
                </div>
              </div>
              <Button className="w-full mt-6" size="lg">
                Connect Gmail
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Microsoft OAuth2 Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-orange-500"
                onClick={() => handleProviderSelect('microsoft-oauth2')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-6 w-6 mr-3 text-orange-600" />
                Microsoft OAuth2
              </CardTitle>
              <CardDescription>
                Secure Outlook integration with Microsoft Graph API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Microsoft Graph API</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Enhanced security</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Office 365 compatibility</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Automatic token refresh</span>
                </div>
              </div>
              <Button className="w-full mt-6" size="lg">
                Connect Microsoft
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* SendGrid Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-indigo-500"
                onClick={() => handleProviderSelect('sendgrid')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="h-6 w-6 mr-3 text-indigo-600" />
                SendGrid
              </CardTitle>
              <CardDescription>
                Professional email delivery with SendGrid API (100 emails/day free)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm">No port 25 required</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">100 emails/day free</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm">Pre-warmed IPs</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm">Better deliverability</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6" size="lg">
                Configure SendGrid
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Mailgun Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-red-500"
                onClick={() => handleProviderSelect('mailgun')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-6 w-6 mr-3 text-red-600" />
                Mailgun
              </CardTitle>
              <CardDescription>
                Powerful email API by Mailgun (5,000 emails/month free for 3 months)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-red-600" />
                  <span className="text-sm">No port 25 required</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">5,000 emails/month free</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span className="text-sm">Enterprise-grade reliability</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-red-600" />
                  <span className="text-sm">Great for developers</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6" size="lg">
                Configure Mailgun
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Gmail OAuth2 Setup Step
  if (currentStep === 'gmail-oauth2-setup') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="outline" size="sm" className="mr-4"
                  onClick={() => setCurrentStep('provider-selection')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Provider Selection
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gmail OAuth2 Setup</h1>
            <p className="text-gray-600">Secure Gmail account connection</p>
          </div>
        </div>

        {/* Gmail OAuth2 Setup Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Connect Your Gmail Account
            </CardTitle>
            <CardDescription>
              Securely connect using Google's OAuth2 authentication for better deliverability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Gmail Account</h3>
                <p className="text-sm text-gray-600">
                  Click the button below to securely connect your Gmail account. You'll choose your email address during the Google authorization process.
                </p>
              </div>
            </div>

            <Button
              onClick={handleGmailOAuth2Setup}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Connect with Google OAuth2
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Microsoft OAuth2 Setup Step
  if (currentStep === 'microsoft-oauth2-setup') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="outline" size="sm" className="mr-4"
                  onClick={() => setCurrentStep('provider-selection')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Provider Selection
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Microsoft OAuth2 Setup</h1>
            <p className="text-gray-600">Secure Outlook account connection</p>
          </div>
        </div>

        {/* Microsoft OAuth2 Setup Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-orange-600" />
              Connect Your Microsoft Account
            </CardTitle>
            <CardDescription>
              Securely connect using Microsoft's OAuth2 authentication for Outlook integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Microsoft Account</h3>
                <p className="text-sm text-gray-600">
                  Click the button below to securely connect your Microsoft/Outlook account. Supports personal and organizational accounts.
                </p>
              </div>
            </div>

            <Button
              onClick={handleMicrosoftOAuth2Setup}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting to Microsoft...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Connect with Microsoft OAuth2
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // SendGrid Setup Step
  if (currentStep === 'sendgrid-setup') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="outline" size="sm" className="mr-4"
                  onClick={() => setCurrentStep('provider-selection')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Provider Selection
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SendGrid Configuration</h1>
            <p className="text-gray-600">Configure your SendGrid API key</p>
          </div>
        </div>

        {/* SendGrid Configuration Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2 text-indigo-600" />
              SendGrid Account Setup
            </CardTitle>
            <CardDescription>
              Enter your SendGrid API key to start sending emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Name */}
            <div className="space-y-2">
              <Label htmlFor="provider_name">Account Name *</Label>
              <Input
                id="provider_name"
                placeholder="My SendGrid Account"
                value={relayConfig.provider_name}
                onChange={(e) => setRelayConfig(prev => ({ ...prev, provider_name: e.target.value }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Friendly name to identify this account</p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api_key">SendGrid API Key *</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={relayConfig.api_key}
                  onChange={(e) => setRelayConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Get your API key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">SendGrid Settings</a>
              </p>
            </div>

            {/* From Email */}
            <div className="space-y-2">
              <Label htmlFor="from_email">From Email Address *</Label>
              <Input
                id="from_email"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={relayConfig.from_email}
                onChange={(e) => setRelayConfig(prev => ({ ...prev, from_email: e.target.value }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Must be a verified sender in SendGrid</p>
            </div>

            {/* From Name */}
            <div className="space-y-2">
              <Label htmlFor="from_name">From Name (Optional)</Label>
              <Input
                id="from_name"
                placeholder="Your Company"
                value={relayConfig.from_name}
                onChange={(e) => setRelayConfig(prev => ({ ...prev, from_name: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Daily Limit */}
            <div className="space-y-2">
              <Label htmlFor="daily_limit">Daily Email Limit</Label>
              <Input
                id="daily_limit"
                type="number"
                min="1"
                max="100"
                value={relayConfig.daily_limit}
                onChange={(e) => setRelayConfig(prev => ({ ...prev, daily_limit: parseInt(e.target.value) || 100 }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">SendGrid free tier: 100 emails/day</p>
            </div>

            {/* Connection Test */}
            <div className="space-y-3">
              <Button
                onClick={handleRelayTest}
                disabled={isTestingConnection || !relayConfig.api_key || !relayConfig.from_email}
                variant="outline"
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating API Key...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Validate API Key
                  </>
                )}
              </Button>

              {connectionTestPassed && (
                <div className="flex items-center space-x-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>API key validated! Ready to save.</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button
              onClick={handleRelaySave}
              disabled={isLoading || !connectionTestPassed}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Account...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Save SendGrid Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-indigo-900">Your API key is secure</h4>
              <p className="text-sm text-indigo-700 mt-1">
                All API keys are encrypted using AES-256 encryption before storage. SendGrid's free tier includes 100 emails per day forever.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mailgun Setup Step
  if (currentStep === 'mailgun-setup') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="outline" size="sm" className="mr-4"
                  onClick={() => setCurrentStep('provider-selection')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Provider Selection
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mailgun Configuration</h1>
            <p className="text-gray-600">Configure your Mailgun API key and domain</p>
          </div>
        </div>

        {/* Mailgun Configuration Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2 text-red-600" />
              Mailgun Account Setup
            </CardTitle>
            <CardDescription>
              Enter your Mailgun API key and domain to start sending emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Name */}
            <div className="space-y-2">
              <Label htmlFor="provider_name">Account Name *</Label>
              <Input
                id="provider_name"
                placeholder="My Mailgun Account"
                value={relayConfig.provider_name}
                onChange={(e) => setRelayConfig(prev => ({ ...prev, provider_name: e.target.value }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Friendly name to identify this account</p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api_key">Mailgun API Key *</Label>
              <div className="relative">
                <Input
                  id="api_key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={relayConfig.api_key}
                  onChange={(e) => setRelayConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Get your API key from <a href="https://app.mailgun.com/settings/api_security" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Mailgun Settings</a>
              </p>
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">Mailgun Domain *</Label>
              <Input
                id="domain"
                placeholder="mg.yourdomain.com"
                value={relayConfig.domain}
                onChange={(e) => setRelayConfig(prev => ({ ...prev, domain: e.target.value }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Your verified domain from <a href="https://app.mailgun.com/sending/domains" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Mailgun Domains</a>
              </p>
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select
                value={relayConfig.region}
                onValueChange={(value: 'us' | 'eu') => setRelayConfig(prev => ({ ...prev, region: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States (US)</SelectItem>
                  <SelectItem value="eu">Europe (EU)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Select your Mailgun region</p>
            </div>

            {/* Daily Limit */}
            <div className="space-y-2">
              <Label htmlFor="daily_limit">Daily Email Limit</Label>
              <Input
                id="daily_limit"
                type="number"
                min="1"
                max="300"
                value={relayConfig.daily_limit}
                onChange={(e) => setRelayConfig(prev => ({ ...prev, daily_limit: parseInt(e.target.value) || 100 }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Mailgun free trial: 5,000 emails/month (first 3 months)</p>
            </div>

            {/* Connection Test Button */}
            <div className="space-y-3">
              <Button
                onClick={handleRelayTest}
                disabled={isTestingConnection || !relayConfig.api_key || !relayConfig.domain}
                variant="outline"
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating API Key...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Validate API Key
                  </>
                )}
              </Button>

              {connectionTestPassed && (
                <div className="flex items-center space-x-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>API key validated successfully!</span>
                </div>
              )}
            </div>

            {/* Next Button */}
            <Button
              onClick={handleRelaySave}
              disabled={isLoading || !connectionTestPassed}
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Next: Link Email Accounts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Your API key is secure</h4>
              <p className="text-sm text-red-700 mt-1">
                All API keys are encrypted using AES-256 encryption before storage. Mailgun requires domain verification - make sure to add DNS records.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function AddEmailAccountPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AddEmailAccountContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
