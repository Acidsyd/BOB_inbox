'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useEmailAccounts, EmailAccount } from '@/hooks/useEmailAccounts'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Plus,
  Mail,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Search,
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  Reply,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'

type SortField = 'display_name' | 'email' | 'status' | 'dailyLimit' | 'sentToday' | 'totalSent' | 'replies' | 'opens' | 'clicks' | 'bounces'
type SortDirection = 'asc' | 'desc' | false

function EmailAccountsContent() {
  const { accounts, isLoading, error, refetch, updateAccountStatus, deleteAccount } = useEmailAccounts({ includeAnalytics: true })
  const { addToast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('display_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'warming': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getBounceColor = (rate: number) => {
    if (rate >= 5) return 'text-red-600 font-semibold'
    if (rate >= 3) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getProviderBadge = (provider: string) => {
    const providerType = provider.toLowerCase()
    if (providerType.includes('gmail')) return { label: 'Gmail', color: 'bg-red-50 text-red-700' }
    if (providerType.includes('microsoft') || providerType.includes('outlook')) return { label: 'Microsoft', color: 'bg-blue-50 text-blue-700' }
    if (providerType.includes('mailgun')) return { label: 'Mailgun', color: 'bg-purple-50 text-purple-700' }
    return { label: provider.toUpperCase(), color: 'bg-gray-50 text-gray-700' }
  }

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? false : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter and sort accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = accounts.filter(account =>
      account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.provider.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (sortDirection) {
      filtered.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortField) {
          case 'display_name':
            aValue = a.display_name.toLowerCase()
            bValue = b.display_name.toLowerCase()
            break
          case 'email':
            aValue = a.email.toLowerCase()
            bValue = b.email.toLowerCase()
            break
          case 'status':
            aValue = a.status
            bValue = b.status
            break
          case 'dailyLimit':
            aValue = a.dailyLimit
            bValue = b.dailyLimit
            break
          case 'sentToday':
            aValue = a.sentToday
            bValue = b.sentToday
            break
          case 'totalSent':
            aValue = a.analytics?.totalEmailsSent || 0
            bValue = b.analytics?.totalEmailsSent || 0
            break
          case 'replies':
            aValue = a.analytics?.totalReplies || 0
            bValue = b.analytics?.totalReplies || 0
            break
          case 'opens':
            aValue = a.analytics?.totalOpens || 0
            bValue = b.analytics?.totalOpens || 0
            break
          case 'clicks':
            aValue = a.analytics?.totalClicks || 0
            bValue = b.analytics?.totalClicks || 0
            break
          case 'bounces':
            aValue = a.analytics?.totalBounces || 0
            bValue = b.analytics?.totalBounces || 0
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [accounts, searchTerm, sortField, sortDirection])

  // Handlers
  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return
    }

    const success = await deleteAccount(accountId)
    if (success) {
      addToast({
        title: 'Account Deleted',
        description: `${email} has been removed successfully`,
        type: 'success'
      })
    }
  }

  const handleStatusChange = async (accountId: string, newStatus: 'active' | 'paused') => {
    await updateAccountStatus(accountId, newStatus)
    addToast({
      title: 'Account Updated',
      description: `Account ${newStatus === 'active' ? 'activated' : 'paused'} successfully`,
      type: 'success'
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
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
            <Button onClick={refetch} variant="outline">
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
            <p className="text-gray-600">Manage your sending accounts with comprehensive analytics</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/settings/email-accounts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
                <p className="text-xs text-gray-500">Total Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.filter(a => a.status === 'active').length}
                </p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.reduce((sum, a) => sum + (a.analytics?.totalEmailsSent || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Reply className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.reduce((sum, a) => sum + (a.analytics?.totalReplies || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  sortable
                  sorted={sortField === 'display_name' ? sortDirection : false}
                  onSort={() => handleSort('display_name')}
                >
                  Account
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'status' ? sortDirection : false}
                  onSort={() => handleSort('status')}
                >
                  Status
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'sentToday' ? sortDirection : false}
                  onSort={() => handleSort('sentToday')}
                >
                  Daily Sent/Limit
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'totalSent' ? sortDirection : false}
                  onSort={() => handleSort('totalSent')}
                >
                  Total Sent
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'replies' ? sortDirection : false}
                  onSort={() => handleSort('replies')}
                >
                  Replies
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'opens' ? sortDirection : false}
                  onSort={() => handleSort('opens')}
                >
                  Opens
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'clicks' ? sortDirection : false}
                  onSort={() => handleSort('clicks')}
                >
                  Clicks
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'bounces' ? sortDirection : false}
                  onSort={() => handleSort('bounces')}
                >
                  Bounces
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No accounts match your search' : 'No email accounts found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedAccounts.map((account) => {
                  const provider = getProviderBadge(account.provider)
                  const analytics = account.analytics

                  return (
                    <TableRow key={account.id}>
                      {/* Account Column */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{account.display_name}</span>
                          <span className="text-sm text-gray-500">{account.email}</span>
                          <Badge className={`text-xs mt-1 w-fit ${provider.color}`}>
                            {provider.label}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Status Column */}
                      <TableCell>
                        <Badge className={getStatusColor(account.status)}>
                          {account.status}
                        </Badge>
                      </TableCell>

                      {/* Daily Sent/Limit Column */}
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium">{account.sentToday}/{account.dailyLimit}</span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                account.sentToday >= account.dailyLimit
                                  ? 'bg-red-500'
                                  : account.sentToday >= account.dailyLimit * 0.8
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((account.sentToday / account.dailyLimit) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Sent Column */}
                      <TableCell>
                        <span className="font-medium">{(analytics?.totalEmailsSent || 0).toLocaleString()}</span>
                      </TableCell>

                      {/* Replies Column */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{analytics?.totalReplies || 0}</span>
                          {analytics && analytics.totalEmailsSent > 0 && (
                            <span className="text-xs text-gray-500">
                              {analytics.replyRate.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Opens Column */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{analytics?.totalOpens || 0}</span>
                          {analytics && analytics.totalEmailsSent > 0 && (
                            <span className="text-xs text-gray-500">
                              {analytics.openRate.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Clicks Column */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{analytics?.totalClicks || 0}</span>
                          {analytics && analytics.totalEmailsSent > 0 && (
                            <span className="text-xs text-gray-500">
                              {analytics.clickRate.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Bounces Column */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={`font-medium ${getBounceColor(analytics?.bounceRate || 0)}`}>
                            {analytics?.totalBounces || 0}
                            {analytics && analytics.bounceRate >= 5 && (
                              <AlertCircle className="inline h-3 w-3 ml-1" />
                            )}
                          </span>
                          {analytics && analytics.totalEmailsSent > 0 && (
                            <span className={`text-xs ${getBounceColor(analytics.bounceRate)}`}>
                              {analytics.bounceRate.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions Column */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {account.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(account.id, 'paused')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(account.id, 'active')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          <Link href={`/settings/email-accounts/${account.id}`}>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/settings/email-accounts/${account.id}`}>
                                  Configure Settings
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteAccount(account.id, account.email)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Empty State */}
      {accounts.length === 0 && (
        <Card className="mt-6">
          <CardContent className="p-12">
            <div className="text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No email accounts</h3>
              <p className="text-gray-500 mb-6">
                Connect your first email account to start sending campaigns
              </p>
              <Link href="/settings/email-accounts/new">
                <Button>
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
