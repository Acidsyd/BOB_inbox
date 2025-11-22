'use client'

import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import AppLayout from '../../../components/layout/AppLayout'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useTimezone } from '../../../contexts/TimezoneContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Edit3,
  BarChart3,
  Users,
  Mail,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Send,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'

interface Campaign {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'stopped' | 'completed'
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
  // Sequence step breakdown
  initialEmails?: number
  followUpEmails?: number
  // Schedule settings
  timezone?: string
  emailsPerDay?: number
  emailsPerHour?: number
  sendingInterval?: number
  sendingHours?: { start: number; end: number }
  activeDays?: string[]
  // Human-like timing
  enableJitter?: boolean
  jitterMinutes?: number
  // Nightly reschedule tracking
  rescheduleCount?: number
  lastRescheduledAt?: string
}

interface EmailActivity {
  id: string
  time: string
  from: string
  to: string
  status: 'sent' | 'failed' | 'bounced'
  sequence_step?: number
  error_message?: string
}

function CampaignDetailContent() {
  const params = useParams()
  const campaignId = params.id as string
  const [recentActivity, setRecentActivity] = useState<EmailActivity[]>([])
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [scheduledActivity, setScheduledActivity] = useState<EmailActivity[]>([])
  // Immediate loading states - set instantly on button click
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const queryClient = useQueryClient()
  const { formatDate } = useTimezone()

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.get(`/campaigns/${campaignId}`).then(res => res.data.campaign),
    enabled: campaignId && campaignId !== 'undefined',
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Start campaign mutation
  const startCampaignMutation = useMutation({
    mutationFn: () => api.post(`/campaigns/${campaignId}/start`),
    onSuccess: () => {
      setIsStarting(false) // Clear immediate loading state
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      console.log('✅ Campaign started successfully')
    },
    onError: (error) => {
      setIsStarting(false) // Clear immediate loading state on error
      console.error('❌ Failed to start campaign:', error)
    }
  })

  // Stop campaign mutation
  const stopCampaignMutation = useMutation({
    mutationFn: () => {
      console.log('🔄 Attempting to stop campaign:', campaignId)
      return api.post(`/campaigns/${campaignId}/stop`)
    },
    onSuccess: (response) => {
      setIsStopping(false) // Clear immediate loading state
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      console.log('✅ Campaign stopped successfully:', response.data)
    },
    onError: (error) => {
      setIsStopping(false) // Clear immediate loading state on error
      console.error('❌ Failed to stop campaign:', error)
      console.error('❌ Error details:', error.response?.data)
    }
  })


  const handleStartCampaign = () => {
    // Prevent double-clicks and multiple starts - check both mutation pending AND immediate state
    if (startCampaignMutation.isPending || isStarting) {
      console.log('⚠️ Campaign start already in progress, ignoring duplicate request')
      return
    }
    
    if (campaign?.status === 'draft' || campaign?.status === 'paused' || campaign?.status === 'stopped' || campaign?.status === 'completed') {
      console.log('🚀 Starting campaign:', campaignId, 'from status:', campaign?.status)
      setIsStarting(true) // ⚡ IMMEDIATELY set loading state to block UI
      startCampaignMutation.mutate()
    } else {
      console.log('⚠️ Cannot start campaign with status:', campaign?.status)
    }
  }

  const handleStopCampaign = () => {
    // Prevent double-clicks and multiple stops - check both mutation pending AND immediate state
    if (stopCampaignMutation.isPending || isStopping) {
      console.log('⚠️ Campaign stop already in progress, ignoring duplicate request')
      return
    }
    
    if (campaign?.status === 'active') {
      console.log('🛑 Stopping campaign:', campaignId)
      setIsStopping(true) // ⚡ IMMEDIATELY set loading state to block UI
      stopCampaignMutation.mutate()
    }
  }

  
  // Fetch recent activity, daily stats, and scheduled activity
  useEffect(() => {
    if (campaignId && campaignId !== 'undefined') {
      const fetchData = () => {
        // Fetch recent email activity
        api.get(`/campaigns/${campaignId}/activity`)
          .then(res => setRecentActivity(res.data.activity || []))
          .catch(err => console.error('Failed to fetch activity:', err))

        // Fetch daily stats for chart
        api.get(`/campaigns/${campaignId}/daily-stats`)
          .then(res => {
            const stats = res.data.stats || []
            console.log('📊 Daily stats fetched:', stats.length, 'days of data')

            // Log detailed stats
            const totalSent = stats.reduce((sum, day) => sum + (day.sent || 0), 0)
            const totalBounced = stats.reduce((sum, day) => sum + (day.bounced || 0), 0)
            const totalReplies = stats.reduce((sum, day) => sum + (day.replies || 0), 0)
            console.log(`📊 Total activity - Sent: ${totalSent}, Bounced: ${totalBounced}, Replies: ${totalReplies}`)

            // Show days with activity
            const activeDays = stats.filter(day => day.sent > 0 || day.bounced > 0 || day.replies > 0)
            console.log(`📊 Days with activity: ${activeDays.length}`)
            if (activeDays.length > 0) {
              console.log('📊 Active days:', activeDays.map(d => `${d.date}: ${d.sent}s/${d.bounced}b/${d.replies}r`).join(', '))
            } else {
              console.log('⚠️ NO ACTIVITY FOUND IN ANY DAY - Chart will be empty!')
            }

            setDailyStats(stats)
          })
          .catch(err => console.error('Failed to fetch daily stats:', err))

        // Fetch scheduled activity
        api.get(`/campaigns/${campaignId}/scheduled-activity`)
          .then(res => {
            const activity = res.data.activity || [];
            console.log('🕐 Frontend received scheduled activity:', activity);
            // Debug scheduled emails for September 22nd
            activity.forEach((item, index) => {
              if (item.time && typeof item.time === 'string' && item.time.includes('2025-09-22')) {
                console.log(`🕐 Scheduled activity ${index + 1} for Sep 22:`, {
                  originalTime: item.time,
                  from: item.from,
                  to: item.to
                });
              }
            });
            setScheduledActivity(activity);
          })
          .catch(err => console.error('Failed to fetch scheduled activity:', err))
      }

      // Initial fetch
      fetchData()

      // Refetch every 30 seconds to keep data fresh
      const intervalId = setInterval(fetchData, 30000)

      return () => clearInterval(intervalId)
    }
  }, [campaignId])

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
          <p className="text-gray-500 mb-4">The campaign you&apos;re looking for doesn&apos;t exist.</p>
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
      case 'stopped': return 'bg-red-100 text-red-800'
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
          <Link href={`/campaigns/${campaignId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          {campaign.status === 'active' || campaign.status === 'paused' || campaign.status === 'draft' || campaign.status === 'stopped' ? (
            campaign.status === 'active' ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleStopCampaign}
                disabled={stopCampaignMutation.isPending || isStopping}
              >
                <Square className="h-4 w-4 mr-2" />
                {(stopCampaignMutation.isPending || isStopping) ? 'Stopping...' : 'Stop'}
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="btn-primary"
                onClick={handleStartCampaign}
                disabled={startCampaignMutation.isPending || isStarting}
              >
                <Play className="h-4 w-4 mr-2" />
                {(startCampaignMutation.isPending || isStarting) ? 'Starting...' : 'Start'}
              </Button>
            )
          ) : null}
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
                  <span className="text-sm">Sent</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{campaign.sent || 0}</div>
                  <div className="text-xs text-gray-500">
                    {campaign.leads > 0 ? ((campaign.sent / campaign.leads) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Delivered</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{campaign.delivered || (campaign.sent || 0) - (campaign.bounced || 0)}</div>
                  <div className="text-xs text-gray-500">
                    {campaign.sent > 0 ? (((campaign.delivered || (campaign.sent - campaign.bounced)) / campaign.sent) * 100).toFixed(1) : '0.0'}%
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

              {/* Sequence Step Breakdown */}
              <div className="border-t pt-4 mt-4">
                <div className="text-xs font-medium text-gray-700 mb-2">Email Sequence</div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Send className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm">Initial Emails</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{campaign.initialEmails || 0}</div>
                    <div className="text-xs text-gray-500">Sequence step 0</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm">Follow-ups</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{campaign.followUpEmails || 0}</div>
                    <div className="text-xs text-gray-500">Sequence step 1+</div>
                  </div>
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
                <div className="text-sm text-gray-600 capitalize">
                  {campaign.type ? campaign.type.replace('_', ' ') : 'Outbound'}
                </div>
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

              {/* Nightly Reschedule Tracking */}
              {campaign.rescheduleCount !== undefined && campaign.rescheduleCount > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-900">Nightly Reschedules</div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <Activity className="h-3 w-3 mr-1" />
                    {campaign.rescheduleCount} time{campaign.rescheduleCount !== 1 ? 's' : ''}
                    {campaign.lastRescheduledAt && (
                      <span className="text-xs text-gray-500 ml-2">
                        (last: {new Date(campaign.lastRescheduledAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Schedule Settings */}
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-900 mb-3">Schedule Settings</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Timezone</span>
                    <span className="text-xs text-gray-900">{campaign.timezone || 'UTC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Emails per day</span>
                    <span className="text-xs text-gray-900">{campaign.emailsPerDay || 50}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Emails per hour</span>
                    <span className="text-xs text-gray-900">{campaign.emailsPerHour || 10}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Interval (minutes)</span>
                    <span className="text-xs text-gray-900">{campaign.sendingInterval || 15}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Sending hours</span>
                    <span className="text-xs text-gray-900">
                      {campaign.sendingHours ? 
                        `${String(campaign.sendingHours.start).padStart(2, '0')}:00 - ${String(campaign.sendingHours.end).padStart(2, '0')}:00` : 
                        '09:00 - 17:00'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Active days</span>
                    <span className="text-xs text-gray-900">
                      {campaign.activeDays ? 
                        campaign.activeDays.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ') :
                        'Mon, Tue, Wed, Thu, Fri'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Natural timing</span>
                    <span className="text-xs text-gray-900">
                      {campaign.enableJitter ? 
                        `±${campaign.jitterMinutes || 3} min variation` : 
                        'Exact timing'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Progress Chart - Full Width */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Progress</CardTitle>
            <CardDescription>Daily email activity: sent, delivered, bounced, and replies</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={dailyStats}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" fill="#8b5cf6" name="Emails Sent" />
                  <Bar dataKey="bounced" fill="#ef4444" name="Bounced" />
                  <Bar dataKey="replies" fill="#10b981" name="Replies" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">No data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Sections - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last emails sent from this campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded">
                    <div className="flex-shrink-0">
                      {activity.status === 'sent' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      ) : activity.status === 'failed' || activity.status === 'bounced' ? (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{formatDate(activity.time, 'MMM d, yyyy h:mm:ss a')}</span>
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                          activity.status === 'sent' ? 'bg-green-100 text-green-800' :
                          activity.status === 'failed' || activity.status === 'bounced' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {activity.status === 'sent' ? 'Delivered' :
                           activity.status === 'failed' || activity.status === 'bounced' ? 'Bounced' :
                           activity.status.toUpperCase()}
                        </span>
                        {activity.sequence_step !== undefined && activity.sequence_step > 0 && (
                          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            Follow-up #{activity.sequence_step}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        From <span className="text-gray-700">{activity.from}</span> → <span className="text-gray-700">{activity.to}</span>
                        {(activity.status === 'failed' || activity.status === 'bounced') && activity.error_message && (
                          <div className="text-xs text-red-600 mt-1 italic">
                            {activity.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No recent activity</p>
                  <p className="text-sm text-gray-400">Email activity will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Activity</CardTitle>
            <CardDescription>Upcoming emails to be sent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {scheduledActivity.length > 0 ? (
                scheduledActivity.map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded">
                    <div className="flex-shrink-0">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{activity.time}</span>
                        {activity.sequence_step !== undefined && activity.sequence_step > 0 && (
                          <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            Follow-up #{activity.sequence_step}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        From <span className="text-gray-700">{activity.from}</span> → <span className="text-gray-700">{activity.to}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No scheduled activity</p>
                  <p className="text-sm text-gray-400">Scheduled emails will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading Overlay - Shows when any campaign action is in progress */}
      {(startCampaignMutation.isPending || stopCampaignMutation.isPending || isStarting || isStopping) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center shadow-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {(startCampaignMutation.isPending || isStarting) && 'Starting Campaign...'}
              {(stopCampaignMutation.isPending || isStopping) && 'Stopping Campaign...'}
            </h3>
            <p className="text-gray-600 text-sm">
              {(startCampaignMutation.isPending || isStarting) && 'Please wait while we launch your campaign. This may take a few minutes for large campaigns.'}
              {(stopCampaignMutation.isPending || isStopping) && 'Stopping campaign and cancelling pending emails.'}
            </p>
          </div>
        </div>
      )}

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