'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Square, 
  Edit3,
  BarChart3,
  Users,
  Mail,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  type: string
  leads: number
  sent: number
  opened: number
  clicked: number
  replied: number
  bounced: number
  createdAt: string
  lastActivity: string
  emailSubject: string
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
}

function CampaignDetailContent() {
  const params = useParams()
  const campaignId = params.id as string

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.get(`/campaigns/${campaignId}`).then(res => res.data),
    enabled: campaignId && campaignId !== 'undefined'
  })

  // Handle invalid campaign ID
  if (!campaignId || campaignId === 'undefined') {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Campaign</h3>
          <p className="text-gray-500 mb-4">The campaign ID is invalid.</p>
          <Link href="/campaigns">
            <Button>Back to Campaigns</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign details...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Campaign not found</h3>
          <p className="text-gray-500 mb-4">The campaign you're looking for doesn't exist.</p>
          <Link href="/campaigns">
            <Button>Back to Campaigns</Button>
          </Link>
        </div>
      </div>
    )
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/campaigns">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>
            <p className="text-gray-600">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {campaign.status === 'active' ? (
            <Button variant="outline" size="sm">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button size="sm" className="btn-primary">
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
          {campaign.status !== 'completed' && (
            <Button variant="outline" size="sm">
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.leads}</div>
            <p className="text-xs text-muted-foreground">
              {campaign.leads - campaign.sent} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.sent}</div>
            <p className="text-xs text-muted-foreground">
              {((campaign.sent / campaign.leads) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {campaign.opened} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.replyRate}%</div>
            <p className="text-xs text-muted-foreground">
              {campaign.replied} replies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Email Performance</CardTitle>
            <CardDescription>Detailed engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm">Delivered</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{campaign.sent - campaign.bounced}</div>
                  <div className="text-xs text-gray-500">
                    {(((campaign.sent - campaign.bounced) / campaign.sent) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm">Opened</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{campaign.opened}</div>
                  <div className="text-xs text-gray-500">{campaign.openRate}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="text-sm">Clicked</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{campaign.clicked}</div>
                  <div className="text-xs text-gray-500">{campaign.clickRate}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm">Replied</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{campaign.replied}</div>
                  <div className="text-xs text-gray-500">{campaign.replyRate}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <XCircle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm">Bounced</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{campaign.bounced}</div>
                  <div className="text-xs text-gray-500">{campaign.bounceRate}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Info</CardTitle>
            <CardDescription>Details and timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Campaign Type</div>
                <div className="text-sm text-gray-600 capitalize">{campaign.type.replace('_', ' ')}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-900">Email Subject</div>
                <div className="text-sm text-gray-600">{campaign.emailSubject}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-900">Created</div>
                <div className="text-sm text-gray-600">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-900">Last Activity</div>
                <div className="text-sm text-gray-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(campaign.lastActivity).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Progress</CardTitle>
          <CardDescription>Email sending progress over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Progress chart will be displayed here</p>
              <p className="text-sm text-gray-400">Integration with charting library needed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CampaignDetailPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CampaignDetailContent />
      </AppLayout>
    </ProtectedRoute>
  )
}