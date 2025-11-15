'use client'

import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppLayout from '../../components/layout/AppLayout'
import { useAuth } from '../../lib/auth/context'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import {
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  BarChart3,
  Users,
  Mail,
  Calendar,
  Eye,
  Reply,
  Copy,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  leads: number
  sent: number
  opened: number
  replied: number
  createdAt: string
  lastActivity: string
  // Tracking metrics
  tracking_enabled?: boolean
  tracking_health?: 'healthy' | 'warning' | 'error'
  open_rate?: number
  click_rate?: number
  reply_rate?: number
  bounce_rate?: number
  last_tracking_update?: string
}

function CampaignsContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [duplicatingCampaignId, setDuplicatingCampaignId] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: string | null
    direction: 'asc' | 'desc' | null
  }>({ key: null, direction: null })

  const { data: campaignsResponse, isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then(res => res.data),
    refetchInterval: 30000,
  })

  const campaigns = campaignsResponse?.campaigns || []

  // Filtering
  const filteredCampaigns = campaigns.filter(campaign => {
    if (!campaign || typeof campaign !== 'object' || !campaign.id) return false
    const campaignName = campaign.name || ''
    const campaignStatus = campaign.status || ''
    const matchesSearch = campaignName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || campaignStatus === filter
    return matchesSearch && matchesFilter
  })

  // Sorting logic
  const sortedCampaigns = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return filteredCampaigns
    }

    return [...filteredCampaigns].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortConfig.key) {
        case 'name':
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
          break
        case 'status':
          aValue = (a.status || '').toLowerCase()
          bValue = (b.status || '').toLowerCase()
          break
        case 'leads':
          aValue = a.leads || 0
          bValue = b.leads || 0
          break
        case 'sent':
          aValue = a.sent || 0
          bValue = b.sent || 0
          break
        case 'opened':
          aValue = a.opened || 0
          bValue = b.opened || 0
          break
        case 'clicked':
          aValue = a.clicked || 0
          bValue = b.clicked || 0
          break
        case 'bounced':
          aValue = a.bounced || 0
          bValue = b.bounced || 0
          break
        case 'replied':
          aValue = a.replied || 0
          bValue = b.replied || 0
          break
        case 'created':
          aValue = new Date(a.createdAt || 0).getTime()
          bValue = new Date(b.createdAt || 0).getTime()
          break
        case 'lastActivity':
          aValue = new Date(a.updatedAt || a.createdAt || 0).getTime()
          bValue = new Date(b.updatedAt || b.createdAt || 0).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredCampaigns, sortConfig])

  // Summary calculations
  const summary = useMemo(() => {
    return {
      totalCampaigns: filteredCampaigns.length,
      activeCampaigns: filteredCampaigns.filter(c => c.status === 'active').length,
      totalLeads: filteredCampaigns.reduce((sum, c) => sum + (c.leads || 0), 0),
      totalSent: filteredCampaigns.reduce((sum, c) => sum + (c.sent || 0), 0),
    }
  }, [filteredCampaigns])

  // Handle column sort
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current.key === key) {
        // Cycle: asc → desc → none
        if (current.direction === 'asc') {
          return { key, direction: 'desc' }
        } else if (current.direction === 'desc') {
          return { key: null, direction: null }
        }
      }
      // First click: asc
      return { key, direction: 'asc' }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateNewCampaign = () => {
    if (isCreatingCampaign) return // Prevent double clicks

    console.log('🔍 Create campaign button clicked')
    setIsCreatingCampaign(true) // ⚡ INSTANT UI blocking

    try {
      console.log('🔍 Navigating to /campaigns/new')
      router.push('/campaigns/new')
    } catch (error) {
      console.error('❌ Navigation error:', error)
      setIsCreatingCampaign(false)
    }

    // Reset loading state after 3 seconds as fallback
    setTimeout(() => {
      setIsCreatingCampaign(false)
    }, 3000)
  }

  const handleDuplicateCampaign = async (campaignId: string) => {
    if (duplicatingCampaignId) return // Prevent double clicks

    console.log('📋 Duplicate campaign button clicked for:', campaignId)
    setDuplicatingCampaignId(campaignId) // ⚡ INSTANT UI blocking

    try {
      const response = await api.post(`/campaigns/${campaignId}/duplicate`)

      if (response.data.success) {
        console.log('✅ Campaign duplicated successfully:', response.data.campaign)
        // Refetch campaigns to show the new duplicated campaign
        await refetch()
      } else {
        console.error('❌ Failed to duplicate campaign:', response.data.error)
      }
    } catch (error) {
      console.error('❌ Error duplicating campaign:', error)
    } finally {
      setDuplicatingCampaignId(null)
    }
  }

  // Tracking functions removed for simplification

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  // Helper to render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage and monitor your outreach campaigns</p>
        </div>
        <div className="flex gap-2">
          <Link href="/campaigns/automation">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Automated Campaign
            </Button>
          </Link>
          <Button
            className="btn-primary"
            onClick={handleCreateNewCampaign}
            disabled={isCreatingCampaign}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreatingCampaign ? 'Creating...' : 'New Campaign'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Campaigns
            </CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Campaigns
            </CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeCampaigns}</div>
            <p className="text-xs text-gray-500">
              {summary.totalCampaigns > 0
                ? `${Math.round((summary.activeCampaigns / summary.totalCampaigns) * 100)}% of total`
                : 'No campaigns'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLeads.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Sent
            </CardTitle>
            <Mail className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSent.toLocaleString()}</div>
            <p className="text-xs text-gray-500">
              {summary.totalLeads > 0
                ? `${Math.round((summary.totalSent / summary.totalLeads) * 100)}% of leads contacted`
                : 'No emails sent'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={filter === 'draft' ? 'default' : 'outline'}
            onClick={() => setFilter('draft')}
            size="sm"
          >
            Draft
          </Button>
          <Button
            variant={filter === 'paused' ? 'default' : 'outline'}
            onClick={() => setFilter('paused')}
            size="sm"
          >
            Paused
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      {sortedCampaigns.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Mail className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first campaign.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/campaigns/automation">
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Automated Campaign
                </Button>
              </Link>
              <Button
                className="btn-primary"
                onClick={handleCreateNewCampaign}
                disabled={isCreatingCampaign}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreatingCampaign ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Campaign Name
                    {renderSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {renderSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('leads')}
                >
                  <div className="flex items-center">
                    Leads
                    {renderSortIcon('leads')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('sent')}
                >
                  <div className="flex items-center">
                    Sent
                    {renderSortIcon('sent')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('opened')}
                >
                  <div className="flex items-center">
                    Opened
                    {renderSortIcon('opened')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('clicked')}
                >
                  <div className="flex items-center">
                    Clicks
                    {renderSortIcon('clicked')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('bounced')}
                >
                  <div className="flex items-center">
                    Bounces
                    {renderSortIcon('bounced')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('replied')}
                >
                  <div className="flex items-center">
                    Replied
                    {renderSortIcon('replied')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('created')}
                >
                  <div className="flex items-center">
                    Created
                    {renderSortIcon('created')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('lastActivity')}
                >
                  <div className="flex items-center">
                    Last Activity
                    {renderSortIcon('lastActivity')}
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns.map((campaign) => {
                if (!campaign?.id) return null

                const leads = campaign.leads || 0
                const sent = campaign.sent || 0
                const opened = campaign.opened || 0
                const clicked = campaign.clicked || 0
                const bounced = campaign.bounced || 0
                const replied = campaign.replied || 0
                const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
                const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0
                const bounceRate = sent > 0 ? Math.round((bounced / sent) * 100) : 0
                const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0
                const progress = leads > 0 ? Math.round((sent / leads) * 100) : 0

                return (
                  <TableRow key={campaign.id}>
                    {/* Campaign Name */}
                    <TableCell className="font-medium">
                      <div className="max-w-xs">
                        <div className="truncate">{campaign.name || 'Untitled Campaign'}</div>
                        {campaign.description && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {campaign.description}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge className={getStatusColor(campaign.status || 'draft')}>
                        {campaign.status || 'draft'}
                      </Badge>
                    </TableCell>

                    {/* Leads */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{leads.toLocaleString()}</div>
                        <Progress value={progress} className="h-1" />
                        <div className="text-xs text-gray-500">{progress}% sent</div>
                      </div>
                    </TableCell>

                    {/* Sent */}
                    <TableCell>
                      <div className="text-sm">{sent.toLocaleString()}</div>
                    </TableCell>

                    {/* Opened */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{opened.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{openRate}% rate</div>
                      </div>
                    </TableCell>

                    {/* Clicks */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{clicked.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{clickRate}% rate</div>
                      </div>
                    </TableCell>

                    {/* Bounces */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{bounced.toLocaleString()}</div>
                        <div className={`text-xs ${bounceRate > 5 ? 'text-red-500' : 'text-gray-500'}`}>
                          {bounceRate}% rate
                        </div>
                      </div>
                    </TableCell>

                    {/* Replied */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{replied.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{replyRate}% rate</div>
                      </div>
                    </TableCell>

                    {/* Created */}
                    <TableCell className="text-sm text-gray-600">
                      {campaign.createdAt
                        ? new Date(campaign.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </TableCell>

                    {/* Last Activity */}
                    <TableCell className="text-sm text-gray-600">
                      {campaign.updatedAt || campaign.createdAt
                        ? new Date(campaign.updatedAt || campaign.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Never'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Play/Pause Button */}
                        {campaign.status === 'active' ? (
                          <Button size="sm" variant="ghost" title="Pause campaign">
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" title="Start campaign">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/campaigns/${campaign.id}`} className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/campaigns/${campaign.id}/analytics`} className="cursor-pointer">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analytics
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateCampaign(campaign.id)}
                              disabled={duplicatingCampaignId === campaign.id}
                            >
                              {duplicatingCampaignId === campaign.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                  Duplicating...
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CampaignsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}