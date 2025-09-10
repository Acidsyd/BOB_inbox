'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useEmailAccounts } from '@/hooks/useEmailAccounts'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { 
  ArrowLeft, 
  Settings, 
  TrendingUp, 
  Heart, 
  BarChart3,
  User,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Target,
  Shield,
  Timer,
  Users,
  Mail,
  Globe,
  Palette,
  Sliders,
  TestTube
} from 'lucide-react'

interface EmailAccount {
  id: string
  email: string
  provider: string
  status: string
  health_score: number
  settings: any
  created_at: string
  updated_at: string
}

interface AccountStats {
  timeframe: string
  totalSent: number
  deliveryRate: number
  openRate: number
  responseRate: number
  bounceRate: number
  complaintRate: number
  dailyVolume: Array<{
    date: string
    sent: number
    delivered: number
    opened: number
    replied: number
  }>
  hourlyDistribution: Array<{
    hour: number
    sent: number
  }>
}

interface AccountHealth {
  score: number
  status: string
  lastChecked: string
  metrics: {
    connectionStatus: string
    authenticationStatus: string
    deliveryReputation: {
      score: number
      trend: string
    }
    recentErrors: number
    avgResponseTime: number
  }
  recentActivity: {
    lastSent: string
    emailsSentToday: number
    successRate: number
    errorRate: number
  }
  issues: Array<{
    type: string
    message: string
    timestamp: string
    severity: string
  }>
}

function AccountConfigurationContent() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const accountId = params.id as string
  const { accounts, isLoading, error } = useEmailAccounts()
  
  const [activeTab, setActiveTab] = useState('settings')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [health, setHealth] = useState<AccountHealth | null>(null)
  const [stats, setStats] = useState<AccountStats | null>(null)

  // Find the account from the loaded accounts
  const account = accounts.find(acc => acc.id === accountId)
  
  console.log('📧 Looking for account ID:', accountId)
  console.log('📧 Available accounts:', accounts.map(a => ({ id: a.id, email: a.email })))
  console.log('📧 Found account:', account)

  // Load health data when account is available and health tab is active
  useEffect(() => {
    if (account && activeTab === 'health' && !health) {
      // Mock health data - replace with real API call
      setHealth({
        score: account.health_score || 85,
        status: account.status === 'active' ? 'good' : 'warning',
        lastChecked: new Date().toISOString(),
        metrics: {
          connectionStatus: 'connected',
          authenticationStatus: 'authenticated',
          deliveryReputation: {
            score: account.health_score || 85,
            trend: 'stable'
          },
          recentErrors: 0,
          avgResponseTime: 150
        },
        recentActivity: {
          lastSent: account.updated_at,
          emailsSentToday: Math.floor(Math.random() * 20),
          successRate: 98,
          errorRate: 2
        },
        issues: []
      })
    }
  }, [account, activeTab, health])

  // Load stats data when account is available and stats tab is active
  useEffect(() => {
    if (account && activeTab === 'stats' && !stats) {
      // Mock stats data - replace with real API call
      setStats({
        timeframe: '7d',
        totalSent: Math.floor(Math.random() * 500) + 100,
        deliveryRate: 95.2,
        openRate: 22.8,
        responseRate: 4.1,
        bounceRate: 1.2,
        complaintRate: 0.1,
        dailyVolume: [],
        hourlyDistribution: []
      })
    }
  }, [account, activeTab, stats])

  // Helper function to safely get account settings
  const getAccountSettings = (account: any) => {
    if (!account) return {}
    // Since useEmailAccounts returns processed data, we can use account properties directly
    return {
      dailyLimit: account.dailyLimit || 50,
      signature: account.signature || '',
      customFromName: account.customFromName || account.email?.split('@')[0] || ''
    }
  }

  // Save account settings
  const saveSettings = async (newSettings: any) => {
    if (!account) return
    
    try {
      setSaving(true)
      
      const response = await api.put(`/email-accounts/${account.id}/settings`, newSettings)
      
      addToast({
        title: 'Settings saved',
        description: 'Account settings updated successfully',
        type: 'success'
      })
    } catch (error) {
      addToast({
        title: 'Save failed',
        description: 'Failed to update account settings',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  // Test connection
  const testConnection = async () => {
    if (!account) return
    
    try {
      setTesting(true)
      
      const response = await api.post(`/email-accounts/${account.id}/test-connection`)
      
      const testResults = response.data
      addToast({
        title: testResults.success ? 'Connection successful' : 'Connection issues detected',
        description: testResults.overall,
        type: testResults.success ? 'success' : 'error'
      })
    } catch (error) {
      addToast({
        title: 'Test failed',
        description: 'Failed to test account connection',
        type: 'error'
      })
    } finally {
      setTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading accounts</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/settings/email-accounts">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Email Accounts
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Account not found</h3>
          <p className="text-gray-600 mb-6">
            The email account you're looking for doesn't exist.
            <br />
            <span className="text-sm text-gray-400 mt-2 block">Account ID: {accountId}</span>
          </p>
          <Link href="/settings/email-accounts">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Email Accounts
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const displayAccount = account

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Configure sending limits, signature, and timing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Sending Limit
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="500"
                  defaultValue={getAccountSettings(account).dailyLimit || 50}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onChange={(e) => {
                    // Update on blur or implement real-time saving
                  }}
                />
                <span className="text-sm text-gray-500">emails/day</span>
              </div>
            </div>

            {/* Time Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Zone
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
              </select>
            </div>
          </div>

          {/* Sending Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sending Hours
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md" defaultValue={9}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Time</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md" defaultValue={17}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Email Signature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Signature
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your email signature..."
              defaultValue={getAccountSettings(account).signature || ''}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={() => saveSettings({})}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warmup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Warmup Settings
          </CardTitle>
          <CardDescription>
            Configure gradual volume increase to improve deliverability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Enable Warmup</h4>
              <p className="text-sm text-gray-600">Gradually increase sending volume</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Initial Volume</label>
              <input
                type="number"
                min="1"
                max="50"
                defaultValue={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Daily Increase</label>
              <input
                type="number"
                min="1"
                max="20"
                defaultValue={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Rotation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Account Rotation
          </CardTitle>
          <CardDescription>
            Control how this account is used in campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Weight</label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Priority</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderHealthTab = () => (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="h-5 w-5 mr-2" />
            Account Health Overview
          </CardTitle>
          <CardDescription>
            Real-time monitoring of account performance and issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {health && (
            <div className="space-y-6">
              {/* Health Score */}
              <div className="text-center">
                <div className={`text-4xl font-bold ${health.score >= 90 ? 'text-green-600' : health.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {health.score}%
                </div>
                <div className="text-lg font-medium capitalize">{health.status}</div>
                <div className="text-sm text-gray-500">Last checked: {new Date(health.lastChecked).toLocaleString()}</div>
              </div>

              {/* Health Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${health.metrics.connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                    {health.metrics.connectionStatus === 'connected' ? <CheckCircle className="h-8 w-8 mx-auto" /> : <XCircle className="h-8 w-8 mx-auto" />}
                  </div>
                  <div className="text-sm font-medium">Connection</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(health.metrics.deliveryReputation.score)}%
                  </div>
                  <div className="text-sm font-medium">Reputation</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(health.metrics.avgResponseTime)}ms
                  </div>
                  <div className="text-sm font-medium">Response Time</div>
                </div>
              </div>

              {/* Recent Issues */}
              {health.issues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent Issues</h4>
                  <div className="space-y-2">
                    {health.issues.map((issue, index) => (
                      <div key={index} className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{issue.message}</div>
                          <div className="text-xs text-gray-500">{new Date(issue.timestamp).toLocaleString()}</div>
                        </div>
                        <Badge variant="outline">{issue.severity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Connection */}
              <div className="flex justify-center">
                <Button
                  onClick={testConnection}
                  disabled={testing}
                  variant="outline"
                >
                  {testing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderStatsTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalSent}</div>
                <div className="text-sm text-gray-600">Total Sent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(stats.deliveryRate)}%</div>
                <div className="text-sm text-gray-600">Delivery Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.round(stats.openRate)}%</div>
                <div className="text-sm text-gray-600">Open Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{Math.round(stats.responseRate)}%</div>
                <div className="text-sm text-gray-600">Response Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Sending Volume (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>Chart visualization will be implemented here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )

  const renderManagementTab = () => (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500">Email Address</label>
              <div className="font-medium">{account.email}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-500">Provider</label>
              <div className="flex items-center space-x-2">
                <span className="font-medium capitalize">{account.provider}</span>
                <Badge variant="outline">{account.status}</Badge>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500">Created</label>
              <div className="font-medium">{new Date(account.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-500">Last Updated</label>
              <div className="font-medium">{new Date(account.updated_at).toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-red-800">Delete Account</h4>
              <p className="text-sm text-red-600">Permanently remove this email account</p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/settings/email-accounts">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Email Accounts
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{displayAccount.email}</h1>
            <p className="text-gray-600">Configure account settings and monitor performance</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`${
            displayAccount.status === 'active' ? 'bg-green-100 text-green-800' :
            displayAccount.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            displayAccount.status === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {displayAccount.status}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {displayAccount.provider}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'settings', label: 'Account Settings', icon: Settings },
            { id: 'health', label: 'Health Monitoring', icon: Heart },
            { id: 'stats', label: 'Statistics', icon: BarChart3 },
            { id: 'management', label: 'Account Management', icon: User }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeTab === id
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && renderSettingsTab()}
      {activeTab === 'health' && renderHealthTab()}
      {activeTab === 'stats' && renderStatsTab()}
      {activeTab === 'management' && renderManagementTab()}
    </div>
  )
}

export default function EmailAccountConfigurationPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AccountConfigurationContent />
      </AppLayout>
    </ProtectedRoute>
  )
}