'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Play, Pause, Square, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  sent?: number
  replies?: number
  replyRate?: number
  lastActivity?: string
  createdAt?: string
}

interface CampaignTableProps {
  title?: string
  showActions?: boolean
  limit?: number
  onCampaignClick?: (campaign: Campaign) => void
}

export default function CampaignTable({ 
  title = 'Recent Campaigns',
  showActions = true,
  limit = 5,
  onCampaignClick
}: CampaignTableProps) {
  const router = useRouter()
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ['campaigns', 'dashboard'],
    queryFn: () => api.get('/campaigns').then(res => res.data.campaigns || []),
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', className: 'bg-green-100 text-green-800' },
      paused: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      completed: { variant: 'outline', className: 'bg-blue-100 text-blue-800' },
      draft: { variant: 'outline', className: 'bg-gray-100 text-gray-800' }
    }
    
    const config = variants[status] || variants.draft
    
    return (
      <Badge {...config}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleAction = async (campaignId: string, action: 'start' | 'pause' | 'stop') => {
    if (actionLoading[campaignId]) return
    
    try {
      setActionLoading({ ...actionLoading, [campaignId]: true })
      
      await api.post(`/campaigns/${campaignId}/${action}`)
      
      // Refetch campaigns data
      // queryClient.invalidateQueries(['campaigns'])
      
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error)
    } finally {
      setActionLoading({ ...actionLoading, [campaignId]: false })
    }
  }

  const handleRowClick = (campaign: Campaign) => {
    if (onCampaignClick) {
      onCampaignClick(campaign)
    } else {
      router.push(`/campaigns/${campaign.id}`)
    }
  }

  const displayCampaigns = campaigns.slice(0, limit)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || displayCampaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Your campaign performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium">
              {error ? 'Unable to load campaigns' : 'No campaigns yet'}
            </p>
            <p className="text-sm mt-2">
              {error ? 'Please try again' : 'Create your first campaign to see it here'}
            </p>
            {!error && (
              <Button 
                onClick={() => router.push('/campaigns/new')}
                className="mt-4"
                size="sm"
              >
                Create Campaign
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Your campaign performance overview</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/campaigns')}
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              onClick={() => handleRowClick(campaign)}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{campaign.name}</p>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(campaign.createdAt || '')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {getStatusBadge(campaign.status)}
                    <div className="text-center">
                      <div className="font-medium">{campaign.sent || 0}</div>
                      <div className="text-xs text-gray-500">Sent</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{campaign.replies || 0}</div>
                      <div className="text-xs text-gray-500">Replies</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">
                        {campaign.replyRate ? `${campaign.replyRate}%` : '0%'}
                      </div>
                      <div className="text-xs text-gray-500">Reply Rate</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {showActions && (
                <div className="flex gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {campaign.status === 'draft' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(campaign.id, 'start')}
                      disabled={actionLoading[campaign.id]}
                      className="h-8 w-8 p-0"
                    >
                      <Play className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  
                  {campaign.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(campaign.id, 'pause')}
                      disabled={actionLoading[campaign.id]}
                      className="h-8 w-8 p-0"
                    >
                      <Pause className="h-4 w-4 text-yellow-600" />
                    </Button>
                  )}
                  
                  {campaign.status === 'paused' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(campaign.id, 'start')}
                        disabled={actionLoading[campaign.id]}
                        className="h-8 w-8 p-0"
                      >
                        <Play className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(campaign.id, 'stop')}
                        disabled={actionLoading[campaign.id]}
                        className="h-8 w-8 p-0"
                      >
                        <Square className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}