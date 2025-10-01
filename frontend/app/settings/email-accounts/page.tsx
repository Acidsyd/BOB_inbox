'use client'

import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import AppLayout from '../../../components/layout/AppLayout'
import { useEmailAccounts } from '../../../hooks/useEmailAccounts'
import { useToast } from '../../../components/ui/toast'
import { Card, CardContent } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Skeleton } from '../../../components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import {
  ArrowLeft,
  Plus,
  Mail,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Play,
  Pause,
  RefreshCw,
  Edit,
  Trash2,
  TestTube,
  Copy,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function EmailAccountsContent() {
  const { addToast } = useToast()
  const [actionLoadingStates, setActionLoadingStates] = useState<Record<string, boolean>>({})
  const [testingConnection, setTestingConnection] = useState<Record<string, boolean>>({})

  // Call useEmailAccounts after other hooks to ensure proper initialization
  const { accounts, isLoading, error, refetch, updateAccountStatus, testConnection, isUpdating } = useEmailAccounts()

  console.log('📧 Email accounts loaded:', accounts.length)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'warming': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getHealthDots = (health: number) => {
    const dots = Math.round(health / 20) // 0-5 dots
    const filled = '●'.repeat(dots)
    const empty = '○'.repeat(5 - dots)
    return filled + empty
  }

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600'
    if (health >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConnectionHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  const getConnectionHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-3.5 w-3.5" />
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5" />
      case 'critical': return <XCircle className="h-3.5 w-3.5" />
      default: return <Clock className="h-3.5 w-3.5" />
    }
  }

  const handleConnectionTest = async (accountId: string, email: string) => {
    setTestingConnection(prev => ({ ...prev, [accountId]: true }))

    try {
      const result = await testConnection(accountId)
      addToast({
        title: result.status === 'healthy' ? 'Connection Successful' : 'Connection Issues Detected',
        description: result.status === 'healthy'
          ? `${email} is connected and working properly`
          : `${email}: ${result.issues?.map((i: any) => i.message).join(', ')}`,
        type: result.status === 'healthy' ? 'success' : 'warning'
      })
    } catch (error: any) {
      addToast({
        title: 'Connection Test Failed',
        description: error.message || 'Failed to test connection',
        type: 'error'
      })
    } finally {
      setTestingConnection(prev => ({ ...prev, [accountId]: false }))
    }
  }

  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return
    }

    addToast({
      title: 'Delete functionality coming soon',
      description: 'Account deletion will be available in the next update',
      type: 'info'
    })
  }

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Skeleton className="h-8 w-24 mr-4" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="space-y-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border-b last:border-b-0">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Accounts</h1>
            <p className="text-sm text-gray-600">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} • {accounts.filter(a => a.status === 'active').length} active
            </p>
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
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const allTests = accounts.map(account =>
                handleConnectionTest(account.id, account.email)
              );
              await Promise.all(allTests);
            }}
            disabled={Object.keys(testingConnection).length > 0}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test All Connections
          </Button>
          <Link href="/settings/email-accounts/new">
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Table View */}
      {accounts.length === 0 ? (
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
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Health
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Connection
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Today
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                        {/* Email */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{account.email}</div>
                              <div className="text-xs text-gray-500 uppercase">{account.provider}</div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge className={`text-xs px-2 py-0.5 border ${getStatusColor(account.status)}`}>
                            {account.status}
                          </Badge>
                        </td>

                        {/* Health */}
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-mono ${getHealthColor(account.health)}`}>
                              {getHealthDots(account.health)}
                            </span>
                            <span className={`text-xs font-medium ${getHealthColor(account.health)}`}>
                              {account.health}%
                            </span>
                          </div>
                        </td>

                        {/* Connection */}
                        <td className="px-4 py-3">
                          <div className={`flex items-center space-x-1 ${getConnectionHealthColor(account.connectionHealth.status)}`}>
                            {getConnectionHealthIcon(account.connectionHealth.status)}
                            <span className="text-xs font-medium capitalize">
                              {account.connectionHealth.status}
                            </span>
                          </div>
                        </td>

                        {/* Today's Usage */}
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <span className="font-medium text-gray-900">{account.sentToday}</span>
                            <span className="text-gray-500">/{account.dailyLimit}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Quick Status Toggle */}
                            {account.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(account.id, 'paused')}
                                disabled={actionLoadingStates[account.id] || isUpdating}
                                className="h-9 w-9 p-0 hover:bg-orange-50"
                                title="Pause account"
                              >
                                {actionLoadingStates[account.id] ? (
                                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                                ) : (
                                  <Pause className="h-4.5 w-4.5" />
                                )}
                              </Button>
                            ) : account.status === 'paused' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(account.id, 'active')}
                                disabled={actionLoadingStates[account.id] || isUpdating}
                                className="h-9 w-9 p-0 hover:bg-green-50"
                                title="Resume account"
                              >
                                {actionLoadingStates[account.id] ? (
                                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                                ) : (
                                  <Play className="h-4.5 w-4.5" />
                                )}
                              </Button>
                            ) : null}

                            {/* Test Connection */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConnectionTest(account.id, account.email)}
                              disabled={testingConnection[account.id]}
                              className="h-9 w-9 p-0 hover:bg-blue-50"
                              title="Test connection"
                            >
                              {testingConnection[account.id] ? (
                                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                              ) : (
                                <TestTube className="h-4.5 w-4.5" />
                              )}
                            </Button>

                            {/* Settings */}
                            <Link href={`/settings/email-accounts/${account.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                                title="Account settings"
                              >
                                <Settings className="h-4.5 w-4.5" />
                              </Button>
                            </Link>

                            {/* More Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gray-100">
                                  <MoreHorizontal className="h-4.5 w-4.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/settings/email-accounts/${account.id}`} className="cursor-pointer flex items-center w-full">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Account
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  navigator.clipboard.writeText(account.email)
                                  addToast({ title: 'Copied', description: 'Email address copied to clipboard', type: 'success' })
                                }}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleDeleteAccount(account.id, account.email)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
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
