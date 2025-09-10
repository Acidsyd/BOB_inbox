'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { 
  ArrowLeft, 
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Mail,
  Server,
  Zap,
  Eye,
  EyeOff,
  TestTube,
  ChevronRight,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkflowNavigation } from '@/lib/navigation/context'

type SetupStep = 'provider-selection' | 'gmail-oauth2-setup' | 'microsoft-oauth2-setup' | 'smtp-setup'
type Provider = 'gmail-oauth2' | 'microsoft-oauth2' | 'smtp'
type SMTPProvider = 'gmail' | 'outlook' | 'yahoo' | 'protonmail' | 'custom'

interface SMTPConfig {
  email: string
  password: string
  host: string
  port: string
  secure: boolean
  provider: SMTPProvider
  displayName: string
}

// Provider configurations for SMTP
const smtpProviders = {
  gmail: {
    name: 'Gmail SMTP',
    host: 'smtp.gmail.com',
    port: '587',
    secure: false,
    instructions: 'Use Gmail App Password instead of your regular password. Enable 2FA first.',
    icon: '🔗'
  },
  outlook: {
    name: 'Outlook SMTP', 
    host: 'smtp-mail.outlook.com',
    port: '587',
    secure: false,
    instructions: 'Use Outlook App Password. Enable 2FA and generate app-specific password.',
    icon: '📧'
  },
  yahoo: {
    name: 'Yahoo Mail SMTP',
    host: 'smtp.mail.yahoo.com', 
    port: '587',
    secure: false,
    instructions: 'Generate Yahoo App Password from Account Security settings.',
    icon: '💜'
  },
  protonmail: {
    name: 'ProtonMail SMTP',
    host: 'mail.protonmail.ch',
    port: '587', 
    secure: false,
    instructions: 'Requires ProtonMail Bridge. Download and configure Bridge first.',
    icon: '🛡️'
  },
  custom: {
    name: 'Custom SMTP',
    host: '',
    port: '587',
    secure: false,
    instructions: 'Configure your custom SMTP server settings.',
    icon: '⚙️'
  }
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
  const [showPassword, setShowPassword] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionTestPassed, setConnectionTestPassed] = useState(false)
  
  
  // SMTP Configuration
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>({
    email: '',
    password: '',
    host: '',
    port: '587',
    secure: false,
    provider: 'gmail',
    displayName: ''
  })

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
        // Check if we have a return path from navigation context
        if (workflowNavigation.returnPath) {
          console.log('🧭 OAuth2 success: Returning to workflow path:', workflowNavigation.returnPath)
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
      
      // Check if it's a configuration issue
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

  // SMTP Connection Test Handler
  const handleSMTPTest = async () => {
    setIsTestingConnection(true)
    setConnectionTestPassed(false)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      if (!smtpConfig.email || !smtpConfig.password || !smtpConfig.host || !smtpConfig.port) {
        throw new Error('Please fill in all required SMTP fields')
      }

      const response = await fetch('/api/smtp/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: smtpConfig.email,
          password: smtpConfig.password,
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          provider: smtpConfig.provider
        })
      })

      const result = await response.json()

      if (result.success) {
        setConnectionTestPassed(true)
        addToast({
          title: 'Connection Test Passed!',
          description: result.testEmailSent ? 
            'SMTP connection successful and test email sent.' : 
            'SMTP connection successful.',
          type: 'success'
        })
      } else {
        throw new Error(result.details || 'SMTP connection test failed')
      }

    } catch (error: any) {
      console.error('SMTP test error:', error)
      addToast({
        title: 'Connection Test Failed',
        description: error.message || 'Failed to test SMTP connection',
        type: 'error'
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  // SMTP Save Handler
  const handleSMTPSave = async () => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      if (!connectionTestPassed) {
        throw new Error('Please test the connection first before saving')
      }

      const response = await fetch('/api/smtp/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: smtpConfig.email,
          password: smtpConfig.password,
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          provider: smtpConfig.provider,
          displayName: smtpConfig.displayName || smtpConfig.email.split('@')[0]
        })
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          title: 'SMTP Account Added!',
          description: `Successfully configured ${result.email} via SMTP`,
          type: 'success'
        })
        
        setTimeout(() => {
          router.push('/settings/email-accounts')
        }, 2000)
      } else {
        throw new Error(result.details || 'Failed to save SMTP credentials')
      }

    } catch (error: any) {
      console.error('SMTP save error:', error)
      addToast({
        title: 'Setup Failed',
        description: error.message || 'Failed to save SMTP configuration',
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
    } else {
      setCurrentStep('smtp-setup')
    }
  }

  // SMTP Provider Change Handler
  const handleSMTPProviderChange = (provider: SMTPProvider) => {
    const providerConfig = smtpProviders[provider]
    setSMTPConfig(prev => ({
      ...prev,
      provider,
      host: providerConfig.host,
      port: providerConfig.port,
      secure: providerConfig.secure
    }))
    setConnectionTestPassed(false)
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
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
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

          {/* SMTP Option */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-500" 
                onClick={() => handleProviderSelect('smtp')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-6 w-6 mr-3 text-purple-600" />
                SMTP Integration
              </CardTitle>
              <CardDescription>
                Connect via SMTP for Gmail, Outlook, Yahoo, ProtonMail, or custom servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Universal compatibility</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Custom server support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Encrypted storage</span>
                </div>
                <div className="flex items-center space-x-3">
                  <TestTube className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Connection testing</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6" size="lg">
                Configure SMTP
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

  // SMTP Setup Step
  if (currentStep === 'smtp-setup') {
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
            <h1 className="text-2xl font-bold text-gray-900">SMTP Configuration</h1>
            <p className="text-gray-600">Configure your SMTP email account</p>
          </div>
        </div>

        {/* SMTP Configuration Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2 text-purple-600" />
              SMTP Account Setup
            </CardTitle>
            <CardDescription>
              Configure your SMTP settings to send emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-3">
              <Label htmlFor="provider">Email Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(smtpProviders).map(([key, provider]) => (
                  <Button
                    key={key}
                    variant={smtpConfig.provider === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSMTPProviderChange(key as SMTPProvider)}
                    className="justify-start"
                  >
                    <span className="mr-2">{provider.icon}</span>
                    {provider.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {smtpProviders[smtpConfig.provider].instructions}
              </p>
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@gmail.com"
                value={smtpConfig.email}
                onChange={(e) => setSMTPConfig(prev => ({ ...prev, email: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password / App Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your app password"
                  value={smtpConfig.password}
                  onChange={(e) => setSMTPConfig(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* SMTP Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">SMTP Host *</Label>
                <Input
                  id="host"
                  placeholder="smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) => setSMTPConfig(prev => ({ ...prev, host: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  placeholder="587"
                  value={smtpConfig.port}
                  onChange={(e) => setSMTPConfig(prev => ({ ...prev, port: e.target.value }))}
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (Optional)</Label>
              <Input
                id="displayName"
                placeholder="Your Name"
                value={smtpConfig.displayName}
                onChange={(e) => setSMTPConfig(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>

            {/* Connection Test */}
            <div className="space-y-3">
              <Button
                onClick={handleSMTPTest}
                disabled={isTestingConnection || !smtpConfig.email || !smtpConfig.password || !smtpConfig.host || !smtpConfig.port}
                variant="outline"
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {connectionTestPassed && (
                <div className="flex items-center space-x-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Connection test passed! Ready to save.</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSMTPSave}
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
                  <Mail className="h-4 w-4 mr-2" />
                  Save SMTP Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Your credentials are secure</h4>
              <p className="text-sm text-purple-700">
                All SMTP credentials are encrypted using AES-256 encryption before storage. 
                We recommend using app passwords instead of your main account password.
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