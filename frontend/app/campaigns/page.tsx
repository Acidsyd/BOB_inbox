'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/lib/auth/context'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
// Removed tracking components for simplification
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Play, 
  Pause, 
  BarChart3,
  Users,
  Mail,
  Calendar,
  TrendingUp,
  Eye,
  MousePointer,
  Reply,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
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

  const { data: campaignsResponse, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then(res => res.data),
    refetchInterval: 30000,
  })

  const campaigns = campaignsResponse?.campaigns || []

  const filteredCampaigns = campaigns.filter(campaign => {
    if (!campaign || typeof campaign !== 'object' || !campaign.id) return false
    const campaignName = campaign.name || ''
    const campaignStatus = campaign.status || ''
    const matchesSearch = campaignName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || campaignStatus === filter
    return matchesSearch && matchesFilter
  })

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

      {/* Filters and Search */}
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

      {/* Tracking dashboard removed for simplification */}

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => {
            if (!campaign?.id) return null;
            
            const leads = campaign.leads || 0;
            const sent = campaign.sent || 0;
            const opened = campaign.opened || 0;
            const replied = campaign.replied || 0;
            const lastActivity = campaign.updatedAt || campaign.createdAt;
            
            // Tracking status removed for simplification
            
            // Use backend-calculated rates or fallback to local calculation
            const openRate = campaign.openRate ?? (sent > 0 ? Math.round((opened / sent) * 100) : 0)
            const clickRate = campaign.clickRate ?? (opened > 0 ? Math.round((campaign.clicked || 0) / opened * 100) : 0)
            const replyRate = campaign.replyRate ?? (sent > 0 ? Math.round((replied / sent) * 100) : 0)
            
            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg truncate">{campaign.name || 'Untitled Campaign'}</CardTitle>
                    <Badge className={getStatusColor(campaign.status || 'draft')}>
                      {campaign.status || 'draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{leads} leads</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{sent} sent</span>
                      </div>
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{opened} opened ({openRate}%)</span>
                      </div>
                      <div className="flex items-center">
                        <Reply className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{replied} replied ({replyRate}%)</span>
                      </div>
                    </div>
                    
                    {/* Tracking metrics removed for simplification */}

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: leads > 0 ? `${(sent / leads) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>

                    {/* Last Activity */}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      Last activity: {lastActivity ? new Date(lastActivity).toLocaleDateString() : 'N/A'}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-2">
                        {campaign.status === 'active' ? (
                          <Button size="sm" variant="outline" title="Pause campaign">
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" title="Start campaign">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" title="Analytics">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                      {campaign.id ? (
                        <Link href={`/campaigns/${campaign.id}`}>
                          <Button size="sm">View</Button>
                        </Link>
                      ) : (
                        <Button size="sm" disabled>View</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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