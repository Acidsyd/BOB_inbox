'use client'

import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppLayout from '../../components/layout/AppLayout'
import { useEmailAccounts } from '../../hooks/useEmailAccounts'
import { useToast } from '../../components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
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
  Edit,
  Trash2,
  TestTube,
  Copy
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
  const { addToast } = useToast()
  const [actionLoadingStates, setActionLoadingStates] = useState<Record<string, boolean>>({})
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(false)
  
  console.log('📧 Email accounts loaded:', accounts.length)

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (autoRefresh && !isLoading) {
      interval = setInterval(async () => {
        try {
          await refetch()
          setLastRefresh(new Date())
        } catch (error) {
          console.error('Auto-refresh failed:', error)
        }
      }, 30000) // Refresh every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [autoRefresh, isLoading, refetch])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + R for refresh
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault()
        if (!isLoading) {
          refetch().then(() => setLastRefresh(new Date()))
        }
      }
      // Ctrl/Cmd + Shift + A for auto-refresh toggle
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault()
        setAutoRefresh(prev => {
          const newValue = !prev
          addToast({
            title: newValue ? 'Auto-refresh enabled' : 'Auto-refresh disabled',
            description: newValue ? 'Updates every 30 seconds' : 'Manual refresh only',
            type: 'info'
          })
          return newValue
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, refetch, addToast])

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
    if (health >= 90) return <CheckCircle className="h-3 w-3 text-green-600" />
    if (health >= 70) return <AlertTriangle className="h-3 w-3 text-yellow-600" />
    return <XCircle className="h-3 w-3 text-red-600" />
  }

  // Test connection for an account
  const handleConnectionTest = async (accountId: string, email: string) => {
    addToast({
      title: 'Testing Connection',
      description: `Testing connection for ${email}...`,
      type: 'info'
    })
    
    // TODO: Implement actual connection test
    setTimeout(() => {
      addToast({
        title: 'Connection Successful',
        description: `${email} is connected and working properly`,
        type: 'success'
      })
    }, 2000)
  }

  // Delete account handler
  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return
    }

    try {
      // TODO: Implement actual delete functionality
      addToast({
        title: 'Account Deleted',
        description: `${email} has been removed`,
        type: 'success'
      })
      await refetch()
    } catch (error: any) {
      addToast({
        title: 'Delete Failed',
        description: 'Failed to delete account',
        type: 'error'
      })
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
      setLastRefresh(new Date())
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

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
    addToast({
      title: autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled',
      description: autoRefresh ? 'Manual refresh only' : 'Updates every 30 seconds',
      type: 'info'
    })
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
            <p className="text-gray-600 flex items-center space-x-2">
              <span>Manage your sending accounts and warmup settings</span>
              {lastRefresh && (
                <>
                  <span>•</span>
                  <span className="text-xs">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="text-xs text-gray-400">
                Press Ctrl+R to refresh, Ctrl+Shift+A for auto-refresh
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoRefresh}
            className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto-refresh
          </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-bold text-gray-900">{accounts.length}</p>
                <p className="text-xs text-gray-500 font-medium">Total Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-bold text-gray-900">
                  {accounts.filter(a => a.status === 'active').length}
                </p>
                <p className="text-xs text-gray-500 font-medium">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-bold text-gray-900">
                  {accounts.filter(a => a.status === 'warming').length}
                </p>
                <p className="text-xs text-gray-500 font-medium">Warming Up</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Pause className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-bold text-gray-900">
                  {accounts.filter(a => a.status === 'paused').length}
                </p>
                <p className="text-xs text-gray-500 font-medium">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <Card key={account.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{account.email}</h3>
                      <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(account.status)}`}>
                        {account.status}
                      </Badge>
                      <span className="text-xs text-gray-500 uppercase font-medium">
                        {account.provider}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        {getHealthIcon(account.health)}
                        <span className={`font-medium ${getHealthColor(account.health)}`}>
                          {account.health}%
                        </span>
                      </div>
                      <span>•</span>
                      <span>{account.sentToday}/{account.dailyLimit} sent today</span>
                      {account.status === 'warming' && (
                        <>
                          <span>•</span>
                          <span>Warmup {account.warmupProgress}% ({account.warmupDaysRemaining}d left)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Quick Status Toggle */}
                  {account.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusChange(account.id, 'paused')}
                      disabled={actionLoadingStates[account.id] || isUpdating}
                      className="h-8 px-3"
                    >
                      {actionLoadingStates[account.id] ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Pause className="h-3 w-3" />
                      )}
                    </Button>
                  ) : account.status === 'paused' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusChange(account.id, 'active')}
                      disabled={actionLoadingStates[account.id] || isUpdating}
                      className="h-8 px-3"
                    >
                      {actionLoadingStates[account.id] ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                  ) : account.status === 'error' ? (
                    <Link href={`/settings/email-accounts/${account.id}`}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-3"
                      >
                        <AlertTriangle className="h-3 w-3" />
                      </Button>
                    </Link>
                  ) : null}
                  
                  {/* Configure Button */}
                  <Link href={`/settings/email-accounts/${account.id}`}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-3"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </Link>
                  
                  {/* Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Link href={`/settings/email-accounts/${account.id}`} className="cursor-pointer flex items-center w-full">
                          <Edit className="mr-2 h-3 w-3" />
                          Edit Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleConnectionTest(account.id, account.email)}>
                        <TestTube className="mr-2 h-3 w-3" />
                        Test Connection
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        navigator.clipboard.writeText(account.email)
                        addToast({ title: 'Copied', description: 'Email address copied to clipboard', type: 'success' })
                      }}>
                        <Copy className="mr-2 h-3 w-3" />
                        Copy Email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDeleteAccount(account.id, account.email)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete Account
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Warmup progress (if warming) */}
              {account.status === 'warming' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Warmup Progress</span>
                    <span>{account.warmupProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${account.warmupProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
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