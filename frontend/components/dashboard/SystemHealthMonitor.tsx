'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Mail, 
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface EmailAccount {
  id: string
  email: string
  provider: string
  status: 'active' | 'error' | 'warning'
  lastSync?: string
  dailySent?: number
  dailyLimit?: number
  bounceRate?: number
  health?: number
}

interface SystemHealth {
  accounts: EmailAccount[]
  sendingQueue: {
    scheduled: number
    sending: number
    failed: number
  }
  rateLimiting: {
    globalRate: string
    accountsLimited: number
  }
  systemAlerts: Array<{
    type: 'error' | 'warning' | 'info'
    message: string
    timestamp: string
  }>
  lastUpdated: string
}

export default function SystemHealthMonitor() {
  const { data: health, isLoading, error, refetch } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      // Fetch real data from multiple endpoints
      const [accounts, campaigns, scheduledEmails] = await Promise.all([
        api.get('/email-accounts').then(res => res.data.accounts || []),
        api.get('/campaigns').then(res => res.data.campaigns || []),
        api.get('/scheduled-emails/stats').then(res => res.data).catch(() => ({
          scheduled: 0,
          sending: 0,
          failed: 0
        }))
      ])
      
      // Use real account data
      const realHealth: SystemHealth = {
        accounts: accounts.slice(0, 3).map((account: any) => ({
          id: account.id,
          email: account.email,
          provider: account.provider || 'gmail',
          status: account.status,
          lastSync: account.last_sync || new Date(Date.now() - 300000).toISOString(),
          dailySent: account.daily_sent || 0,
          dailyLimit: account.daily_limit || 50,
          bounceRate: account.bounce_rate || 0,
          health: account.health_score || 100
        })),
        sendingQueue: scheduledEmails,
        rateLimiting: {
          globalRate: accounts.some((acc: any) => acc.is_rate_limited) ? 'Limited' : 'Normal',
          accountsLimited: accounts.filter((acc: any) => acc.is_rate_limited).length
        },
        systemAlerts: campaigns
          .filter((c: any) => c.status === 'active')
          .slice(0, 2)
          .map((campaign: any) => ({
            type: 'info' as const,
            message: `Campaign "${campaign.name}" active`,
            timestamp: campaign.created_at || new Date().toISOString()
          })),
        lastUpdated: new Date().toISOString()
      }
      
      return realHealth
    },
    refetchInterval: 30000,
    retry: 2
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle }
      case 'warning':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle }
      case 'error':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock }
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded animate-pulse">
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Unable to load system health</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Email Accounts - Compact */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Accounts ({health.accounts.length})
          </h4>
          <div className="space-y-1">
            {health.accounts.map((account) => {
              const statusConfig = getStatusColor(account.status)
              const StatusIcon = statusConfig.icon
              
              return (
                <div key={account.id} className="flex items-center justify-between p-2 border rounded text-xs">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                    <span className="font-medium">{account.email.split('@')[0]}@...</span>
                  </div>
                  <div className="text-right">
                    <div>{account.dailySent}/{account.dailyLimit}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Queue & Status - Combined */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Queue</h4>
            <div className="grid grid-cols-3 gap-1">
              <div className="text-center p-2 bg-blue-50 rounded text-xs">
                <div className="font-bold text-blue-600">{health.sendingQueue.scheduled}</div>
                <div className="text-blue-600">Queue</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded text-xs">
                <div className="font-bold text-yellow-600">{health.sendingQueue.sending}</div>
                <div className="text-yellow-600">Sending</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded text-xs">
                <div className="font-bold text-red-600">{health.sendingQueue.failed}</div>
                <div className="text-red-600">Failed</div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Status</h4>
            <div className="p-2 bg-gray-50 rounded">
              <Badge 
                variant={health.rateLimiting.globalRate === 'Normal' ? 'default' : 'secondary'}
                className={health.rateLimiting.globalRate === 'Normal' ? 
                  'bg-green-100 text-green-700 text-xs' : 'bg-yellow-100 text-yellow-700 text-xs'
                }
              >
                {health.rateLimiting.globalRate}
              </Badge>
              {health.rateLimiting.accountsLimited > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {health.rateLimiting.accountsLimited} limited
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}