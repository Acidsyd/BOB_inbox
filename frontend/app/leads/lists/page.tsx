'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Search, MoreVertical, Trash2, Eye, Users, Mail, MousePointer, Reply, AlertCircle } from 'lucide-react'
import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import AppLayout from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Progress } from '../../../components/ui/progress'
import { Skeleton } from '../../../components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { useLeadLists, LeadList } from '../../../hooks/useLeadLists'

type SortField = 'name' | 'totalLeads' | 'activeLeads' | 'campaigns' | 'deliveryRate' | 'replyRate' | 'updatedAt'
type SortDirection = 'asc' | 'desc' | false

function LeadListsContent() {
  const router = useRouter()
  const { leadLists, isLoading, error, deleteLeadList, refetch } = useLeadLists({ includeAnalytics: true })

  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? false : 'asc')
      if (sortDirection === 'desc') setSortField('name')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter and sort lead lists
  const filteredAndSortedLists = useMemo(() => {
    let filtered = leadLists.filter(list =>
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (list.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (sortDirection) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any

        switch (sortField) {
          case 'name':
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
            break
          case 'totalLeads':
            aVal = a.totalLeads
            bVal = b.totalLeads
            break
          case 'activeLeads':
            aVal = a.activeLeads
            bVal = b.activeLeads
            break
          case 'campaigns':
            aVal = a.analytics?.campaignsUsing || 0
            bVal = b.analytics?.campaignsUsing || 0
            break
          case 'deliveryRate':
            aVal = a.analytics?.deliveryRate || 0
            bVal = b.analytics?.deliveryRate || 0
            break
          case 'replyRate':
            aVal = a.analytics?.replyRate || 0
            bVal = b.analytics?.replyRate || 0
            break
          case 'updatedAt':
            aVal = new Date(a.updatedAt).getTime()
            bVal = new Date(b.updatedAt).getTime()
            break
          default:
            return 0
        }

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
        }
      })
    }

    return filtered
  }, [leadLists, searchTerm, sortField, sortDirection])

  // Calculate aggregate stats
  const totalLeadsCount = leadLists.reduce((sum, list) => sum + list.totalLeads, 0)
  const activeLeadsCount = leadLists.reduce((sum, list) => sum + list.activeLeads, 0)
  const totalEmailsSent = leadLists.reduce((sum, list) => sum + (list.analytics?.totalEmailsSent || 0), 0)
  const avgReplyRate = leadLists.length > 0
    ? leadLists.reduce((sum, list) => sum + (list.analytics?.replyRate || 0), 0) / leadLists.length
    : 0

  // Handle delete
  const handleDelete = async (listId: string, listName: string) => {
    if (confirm(`Are you sure you want to delete "${listName}"? This action cannot be undone.`)) {
      const success = await deleteLeadList(listId)
      if (success) {
        await refetch()
      }
    }
  }

  // Get health status based on active leads percentage
  const getHealthStatus = (totalLeads: number, activeLeads: number) => {
    if (totalLeads === 0) return { label: 'Empty', color: 'bg-gray-500' }
    const percentage = (activeLeads / totalLeads) * 100
    if (percentage >= 80) return { label: 'Excellent', color: 'bg-green-500' }
    if (percentage >= 60) return { label: 'Good', color: 'bg-blue-500' }
    if (percentage >= 40) return { label: 'Fair', color: 'bg-yellow-500' }
    return { label: 'Poor', color: 'bg-red-500' }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={refetch} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Lists</h1>
          <p className="text-gray-500">Manage your lead lists and track performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/leads/upload')}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
          <Button onClick={() => router.push('/leads/lists/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create List
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Lists</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadLists.length}</div>
            <p className="text-xs text-gray-500">Lead lists created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeadsCount.toLocaleString()}</div>
            <p className="text-xs text-gray-500">{activeLeadsCount.toLocaleString()} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmailsSent.toLocaleString()}</div>
            <p className="text-xs text-gray-500">From all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Avg Reply Rate</CardTitle>
            <Reply className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgReplyRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500">Across all lists</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search lead lists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                sortable
                sorted={sortField === 'name' ? sortDirection : false}
                onSort={() => handleSort('name')}
              >
                List Name
              </TableHead>
              <TableHead
                sortable
                sorted={sortField === 'totalLeads' ? sortDirection : false}
                onSort={() => handleSort('totalLeads')}
              >
                Leads
              </TableHead>
              <TableHead
                sortable
                sorted={sortField === 'campaigns' ? sortDirection : false}
                onSort={() => handleSort('campaigns')}
              >
                Campaigns
              </TableHead>
              <TableHead
                sortable
                sorted={sortField === 'deliveryRate' ? sortDirection : false}
                onSort={() => handleSort('deliveryRate')}
              >
                Delivery Rate
              </TableHead>
              <TableHead
                sortable
                sorted={sortField === 'replyRate' ? sortDirection : false}
                onSort={() => handleSort('replyRate')}
              >
                Reply Rate
              </TableHead>
              <TableHead>Opens</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                sortable
                sorted={sortField === 'updatedAt' ? sortDirection : false}
                onSort={() => handleSort('updatedAt')}
              >
                Last Updated
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                  {searchTerm ? 'No lead lists found matching your search.' : 'No lead lists yet. Create your first list to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedLists.map((list) => {
                const analytics = list.analytics
                const health = getHealthStatus(list.totalLeads, list.activeLeads)
                const leadPercentage = list.totalLeads > 0 ? (list.activeLeads / list.totalLeads) * 100 : 0

                return (
                  <TableRow key={list.id}>
                    {/* List Name */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{list.name}</span>
                        {list.description && (
                          <span className="text-xs text-gray-500">{list.description}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Leads */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{list.totalLeads.toLocaleString()}</span>
                          <span className="text-xs text-gray-500">total</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={leadPercentage} className="h-1.5 w-16" />
                          <span className="text-xs text-gray-500">
                            {list.activeLeads} active ({leadPercentage.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Campaigns */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{analytics?.campaignsUsing || 0}</span>
                        <span className="text-xs text-gray-500">
                          {analytics?.activeCampaigns || 0} active
                        </span>
                      </div>
                    </TableCell>

                    {/* Delivery Rate */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`font-medium ${
                          (analytics?.deliveryRate || 0) >= 95 ? 'text-green-600' :
                          (analytics?.deliveryRate || 0) >= 90 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(analytics?.deliveryRate || 0).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {analytics?.totalDelivered || 0} / {analytics?.totalEmailsSent || 0}
                        </span>
                      </div>
                    </TableCell>

                    {/* Reply Rate */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`font-medium ${
                          (analytics?.replyRate || 0) >= 10 ? 'text-green-600' :
                          (analytics?.replyRate || 0) >= 5 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(analytics?.replyRate || 0).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          {analytics?.totalReplies || 0} replies
                        </span>
                      </div>
                    </TableCell>

                    {/* Opens */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{analytics?.totalOpens || 0}</span>
                        <span className="text-xs text-gray-500">
                          {(analytics?.openRate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Clicks */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{analytics?.totalClicks || 0}</span>
                        <span className="text-xs text-gray-500">
                          {(analytics?.clickRate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge className={health.color}>
                        {health.label}
                      </Badge>
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(list.updatedAt).toLocaleDateString()}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/leads/lists/${list.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(list.id, list.name)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

export default function LeadListsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <LeadListsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
