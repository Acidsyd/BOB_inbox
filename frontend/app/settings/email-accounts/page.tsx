'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useEmailAccounts } from '@/hooks/useEmailAccounts'
// Removed tracking configuration hook for simplification
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft, 
  Plus, 
  Mail, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Zap,
  Play,
  Pause,
  WifiIcon,
  WifiOff,
  RefreshCw,
  Activity,
  Eye,
  MousePointer,
  Target
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// Email account interface is now imported from the hook

// Loading skeleton component for account cards
function AccountCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div>
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Real-time status indicator component
function StatusIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center space-x-1">
      {isConnected ? (
        <WifiIcon className="h-3 w-3 text-green-500" />
      ) : (
        <WifiOff className="h-3 w-3 text-red-500" />
      )}
      <span className="text-xs text-gray-500">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}

function EmailAccountsContent() {
  const { accounts, isLoading, error, refetch, updateAccountStatus, isUpdating } = useEmailAccounts()
  const { 
    accountTrackingHealths, 
    refreshAccountHealth, 
    testTrackingSetup,
    getAccountTrackingHealth 
  } = useTrackingConfiguration()
  const { addToast } = useToast()
  const [actionLoadingStates, setActionLoadingStates] = useState<Record<string, boolean>>({})
  const [trackingTestStates, setTrackingTestStates] = useState<Record<string, boolean>>({})

  // Load tracking health data for all accounts when they change
  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach(account => {
        getAccountTrackingHealth(account.id).catch(console.error)
      })
    }
  }, [accounts, getAccountTrackingHealth])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'warming': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600'
    if (health >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthIcon = (health: number) => {
    if (health >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (health >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  // Get tracking health for an account
  const getTrackingHealth = (accountId: string) => {
    return accountTrackingHealths[accountId]
  }

  const getTrackingHealthColor = (reliability: string) => {
    switch (reliability) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100' 
      case 'poor': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrackingIcon = (reliability: string) => {
    switch (reliability) {
      case 'excellent': return <Activity className="h-4 w-4 text-green-600" />
      case 'good': return <Activity className="h-4 w-4 text-blue-600" />
      case 'poor': return <Activity className="h-4 w-4 text-yellow-600" />
      case 'critical': return <Activity className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  // Test tracking setup for an account
  const handleTrackingTest = async (accountId: string) => {
    setTrackingTestStates(prev => ({ ...prev, [accountId]: true }))
    
    try {
      const result = await testTrackingSetup(accountId)
      
      addToast({
        title: result ? 'Tracking Test Passed' : 'Tracking Test Failed',
        description: result 
          ? 'Tracking pixel and links are working correctly' 
          : 'There are issues with tracking setup',
        type: result ? 'success' : 'error'
      })
      
      // Refresh tracking health after test
      await refreshAccountHealth(accountId)
    } catch (error: any) {
      addToast({
        title: 'Test failed',
        description: 'Unable to test tracking setup',
        type: 'error'
      })
    } finally {
      setTrackingTestStates(prev => ({ ...prev, [accountId]: false }))
    }
  }

  // Handle account status changes with user feedback
  const handleStatusChange = async (accountId: string, newStatus: 'active' | 'paused') => {
    setActionLoadingStates(prev => ({ ...prev, [accountId]: true }))
    
    try {
      await updateAccountStatus(accountId, newStatus)
      addToast({
        title: 'Account updated',
        description: `Account ${newStatus === 'active' ? 'resumed' : 'paused'} successfully`,
        type: 'success'
      })
    } catch (error: any) {
      addToast({
        title: 'Update failed', 
        description: error.message || 'Failed to update account status',
        type: 'error'
      })
    } finally {
      setActionLoadingStates(prev => ({ ...prev, [accountId]: false }))
    }
  }

  const handleRefresh = async () => {
    try {
      await refetch()
      addToast({
        title: 'Refreshed',
        description: 'Email accounts refreshed successfully',
        type: 'success'
      })
    } catch (error: any) {
      addToast({
        title: 'Refresh failed',
        description: 'Failed to refresh accounts',
        type: 'error'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Skeleton className="h-8 w-24 mr-4" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 mr-3" />
                  <div>
                    <Skeleton className="h-6 w-8 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Account cards skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load email accounts</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // No mock data needed - using real Supabase data

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Email Accounts</h1>
              <StatusIndicator isConnected={!error} />
            </div>
            <p className="text-gray-600">Manage your sending accounts and warmup settings</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/settings/email-accounts/new">
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">{accounts.length}</p>
                <p className="text-sm text-gray-600">Total Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.status === 'warming').length}
                </p>
                <p className="text-sm text-gray-600">Warming Up</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {Object.values(accountTrackingHealths).filter(h => 
                    h.trackingReliability === 'excellent' || h.trackingReliability === 'good'
                  ).length}
                </p>
                <p className="text-sm text-gray-600">Tracking Healthy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Mail className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">{account.email}</h3>
                      <Badge className={getStatusColor(account.status)}>
                        {account.status}
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 uppercase">
                          {account.provider}
                        </span>
                        {account.provider === 'gmail' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            OAuth2
                          </span>
                        )}
                        {account.provider === 'outlook' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Microsoft OAuth2
                          </span>
                        )}
                        {account.provider === 'smtp' && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            SMTP
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        {getHealthIcon(account.health)}
                        <span className={`ml-1 font-medium ${getHealthColor(account.health)}`}>
                          {account.health}% Health
                        </span>
                      </div>
                      
                      {/* Tracking Health Indicator */}
                      {(() => {
                        const trackingHealth = getTrackingHealth(account.id)
                        return trackingHealth ? (
                          <div className="flex items-center">
                            {getTrackingIcon(trackingHealth.trackingReliability)}
                            <span className={`ml-1 px-2 py-1 text-xs font-medium rounded-full ${
                              getTrackingHealthColor(trackingHealth.trackingReliability)
                            }`}>
                              Tracking: {trackingHealth.trackingScore}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <span className="ml-1 text-gray-500 text-xs">Testing...</span>
                          </div>
                        )
                      })()} 
                      
                      <div>
                        Sent: {account.sentToday}/{account.dailyLimit} today
                      </div>
                      {account.status === 'warming' && (
                        <div>
                          Warmup: {account.warmupProgress}% ({account.warmupDaysRemaining} days left)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Tracking Test Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTrackingTest(account.id)}
                    disabled={trackingTestStates[account.id]}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    {trackingTestStates[account.id] ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 mr-2" />
                    )}
                    Test Tracking
                  </Button>
                  
                  {account.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusChange(account.id, 'paused')}
                      disabled={actionLoadingStates[account.id] || isUpdating}
                    >
                      {actionLoadingStates[account.id] ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4 mr-2" />
                      )}
                      Pause
                    </Button>
                  ) : account.status === 'paused' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusChange(account.id, 'active')}
                      disabled={actionLoadingStates[account.id] || isUpdating}
                    >
                      {actionLoadingStates[account.id] ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Resume
                    </Button>
                  ) : account.status === 'error' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        addToast({
                          title: 'Configure Account',
                          description: 'Please check your email account settings and credentials',
                          type: 'info'
                        })
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Fix Issues
                    </Button>
                  ) : null}
                  
                  <Link href={`/settings/email-accounts/${account.id}`}>
                    <Button 
                      variant="outline" 
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </Link>
                  
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Progress bars */}
              <div className="mt-4 space-y-3">
                {/* Daily usage */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Daily Usage</span>
                    <span>{account.sentToday}/{account.dailyLimit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((account.sentToday / account.dailyLimit) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Tracking Health Progress */}
                {(() => {
                  const trackingHealth = getTrackingHealth(account.id)
                  return trackingHealth && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          Tracking Performance
                        </span>
                        <span>{trackingHealth.trackingScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            trackingHealth.trackingScore >= 90 ? 'bg-green-500' :
                            trackingHealth.trackingScore >= 70 ? 'bg-blue-500' :
                            trackingHealth.trackingScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${trackingHealth.trackingScore}%` }}
                        ></div>
                      </div>
                      
                      {/* Tracking details */}
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span className="flex items-center">
                          <MousePointer className="h-3 w-3 mr-1" />
                          Pixel: {Math.round(trackingHealth.pixelDeliveryRate)}%
                        </span>
                        <span>Links: {Math.round(trackingHealth.linkClickabilityRate)}%</span>
                      </div>
                      
                      {/* Tracking issues warning */}
                      {trackingHealth.trackingIssues.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <div className="flex items-center text-yellow-800 mb-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            <span className="font-medium">Tracking Issues ({trackingHealth.trackingIssues.length})</span>
                          </div>
                          <div className="text-yellow-700">
                            {trackingHealth.trackingIssues.slice(0, 2).map((issue, index) => (
                              <div key={index}>• {issue}</div>
                            ))}
                            {trackingHealth.trackingIssues.length > 2 && (
                              <div className="text-yellow-600 font-medium">
                                +{trackingHealth.trackingIssues.length - 2} more issues
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Warmup progress (if warming) */}
                {account.status === 'warming' && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Warmup Progress</span>
                      <span>{account.warmupProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${account.warmupProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {accounts.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No email accounts</h3>
              <p className="text-gray-500 mb-6">
                Connect your first email account to start sending campaigns
              </p>
              <Link href="/settings/email-accounts/new">
                <Button className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function EmailAccountsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <EmailAccountsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}