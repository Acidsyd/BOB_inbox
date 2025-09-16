'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Check, Mail, Reply, Eye, Send, Clock, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface ActivityItem {
  id: string
  type: 'sent' | 'reply' | 'opened' | 'clicked' | 'bounced'
  fromEmail: string
  toEmail: string
  subject?: string
  campaign?: string
  timestamp: string
}

interface LatestActivityProps {
  title?: string
  limit?: number
}

export default function LatestActivity({ 
  title = 'Latest Activity',
  limit = 8
}: LatestActivityProps) {
  const router = useRouter()

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['latest-activity'],
    queryFn: async () => {
      try {
        // Fetch real conversation messages with email data
        const response = await api.get('/inbox/conversations?limit=50')
        const conversations = response.data.conversations || []
        
        const activities: ActivityItem[] = []
        
        // Process conversations to extract real email activities
        for (const conv of conversations.slice(0, limit)) {
          // Try to get messages for this conversation
          try {
            const messagesResponse = await api.get(`/inbox/conversations/${conv.id}/messages`, {
              params: { timezone: 'UTC' } // Use UTC for dashboard consistency or could use getUserTimezone()
            })
            const messages = messagesResponse.data.messages || []
            
            // Get the most recent message
            if (messages.length > 0) {
              const recentMessage = messages[messages.length - 1]
              
              activities.push({
                id: recentMessage.id,
                type: recentMessage.direction === 'sent' ? 'sent' : 'reply',
                fromEmail: recentMessage.from_email || 'unknown@domain.com',
                toEmail: recentMessage.to_email || 'recipient@domain.com',
                subject: conv.subject || 'No subject',
                campaign: conv.conversation_type === 'campaign' ? 'Campaign' : undefined,
                timestamp: recentMessage.sent_at || recentMessage.received_at || conv.last_activity_at
              })
            }
          } catch (msgError) {
            // Fallback to conversation data if message fetch fails
            const participants = conv.participants || []
            activities.push({
              id: conv.id,
              type: conv.conversation_type === 'campaign' ? 'sent' : 'reply',
              fromEmail: participants[0] || 'sender@domain.com',
              toEmail: participants[1] || 'recipient@domain.com',
              subject: conv.subject || 'No subject',
              timestamp: conv.last_activity_at
            })
          }
        }
        
        // Sort by timestamp and return results
        return activities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit)
        
      } catch (error) {
        console.error('Failed to fetch activities:', error)
        return []
      }
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sent':
        return <Send className="h-4 w-4 text-blue-600" />
      case 'reply':
        return <Reply className="h-4 w-4 text-green-600" />
      case 'opened':
        return <Eye className="h-4 w-4 text-purple-600" />
      case 'clicked':
        return <ArrowRight className="h-4 w-4 text-orange-600" />
      case 'bounced':
        return <Mail className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityBadge = (type: string) => {
    const variants: Record<string, any> = {
      sent: { variant: 'default', className: 'bg-blue-100 text-blue-800' },
      reply: { variant: 'default', className: 'bg-green-100 text-green-800' },
      opened: { variant: 'default', className: 'bg-purple-100 text-purple-800' },
      clicked: { variant: 'default', className: 'bg-orange-100 text-orange-800' },
      bounced: { variant: 'default', className: 'bg-red-100 text-red-800' }
    }
    
    const config = variants[type] || variants.sent
    
    return (
      <Badge {...config}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.type === 'reply' || activity.type === 'sent') {
      router.push('/inbox')
    } else if (activity.campaign) {
      router.push('/campaigns')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded animate-pulse">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Recent email activities and interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium">
              {error ? 'Unable to load activities' : 'No recent activity'}
            </p>
            <p className="text-sm mt-2">
              {error ? 'Please try again' : 'Start sending campaigns to see activity here'}
            </p>
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
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last emails sent from this campaign</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/inbox')}
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-2 text-sm"
            >
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="font-medium text-gray-900">
                {new Date(activity.timestamp).toLocaleString('en-CA', {
                  year: 'numeric',
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                }).replace(/[,]/g, 'T').replace(/[\s]/g, '')}
              </span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                {activity.type === 'sent' ? 'Delivered' : activity.type === 'reply' ? 'Reply' : 'Opened'}
              </Badge>
              <span className="text-gray-600">
                From {activity.fromEmail} → {activity.toEmail}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}