'use client'

import { useState } from 'react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppLayout from '../../components/layout/AppLayout'
import { useAuth } from '../../lib/auth/context'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Mail, Users, TrendingUp, Activity, Inbox } from 'lucide-react'
import Link from 'next/link'
import { DashboardErrorBoundary } from '../../components/ui/error-boundary'
import { useOffline } from '../../hooks/useOffline'

// Import new dashboard components
import PeriodSelector from '../../components/dashboard/PeriodSelector'
import MetricCard from '../../components/dashboard/MetricCard'
import LabelChart from '../../components/dashboard/LabelChart'
import ActivityChart from '../../components/dashboard/ActivityChart'
import CampaignTable from '../../components/dashboard/CampaignTable'
import LatestActivity from '../../components/dashboard/LatestActivity'

interface DashboardData {
  period: { type: string; startDate: string; endDate: string }
  metrics: {
    emailsSent: number
    replyRate: number
    activeCampaigns: number
    totalLeads: number
    inboxActivity: number
  }
  labels: Record<string, { count: number; color: string }>
  dailyActivity: Array<{ date: string; sent: number; replies: number }>
  campaigns: { total: number; active: number }
  leads: { total: number; active: number }
  accounts: { total: number; avgHealth: number }
  rates: { replyRate: string; bounceRate: string }
}

function DashboardContent() {
  const { user } = useAuth()
  const { isOnline, queuedActions } = useOffline()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  
  // Parse custom period for API call
  const getPeriodParams = (period: string) => {
    if (period.startsWith('custom:')) {
      const [, startDate, endDate] = period.split(':')
      return { period: 'custom', startDate, endDate }
    }
    return { period }
  }

  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard-analytics', selectedPeriod],
    queryFn: () => {
      const params = getPeriodParams(selectedPeriod)
      const query = new URLSearchParams(params).toString()
      return api.get(`/analytics/dashboard?${query}`).then(res => res.data)
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => {
      if (!isOnline) return false
      return failureCount < 3
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  if (isLoading && !data) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Activity className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Unable to load dashboard</p>
            <p className="text-sm text-gray-600">
              {isOnline ? 'There was a problem loading your dashboard data.' : 'You are currently offline.'}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const stats = data || {
    period: { type: 'month', startDate: '', endDate: '' },
    metrics: { emailsSent: 0, replyRate: 0, activeCampaigns: 0, totalLeads: 0, inboxActivity: 0 },
    labels: {},
    dailyActivity: [],
    campaigns: { total: 0, active: 0 },
    leads: { total: 0, active: 0 },
    accounts: { total: 0, avgHealth: 0 },
    rates: { replyRate: '0%', bounceRate: '0%' }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2" />
            <p className="text-sm text-yellow-800">
              You're offline. Some features may be limited.
              {queuedActions.length > 0 && ` ${queuedActions.length} actions queued for sync.`}
            </p>
          </div>
        </div>
      )}

      {/* Header with Period Selector */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName}! Here's your performance overview.</p>
        </div>
        
        <PeriodSelector 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard
          title="Emails Sent"
          value={stats.metrics.emailsSent}
          subtitle={`${stats.period.type} total`}
          icon={<Mail className="h-4 w-4" />}
          onClick={() => {}}
        />
        <MetricCard
          title="Reply Rate"
          value={`${stats.metrics.replyRate}%`}
          subtitle="from sent emails"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{
            direction: stats.metrics.replyRate > 5 ? 'up' : stats.metrics.replyRate < 2 ? 'down' : 'neutral',
            value: stats.rates.replyRate
          }}
        />
        <MetricCard
          title="Active Campaigns"
          value={stats.metrics.activeCampaigns}
          subtitle={`of ${stats.campaigns.total} total`}
          icon={<Activity className="h-4 w-4" />}
          onClick={() => window.location.href = '/campaigns'}
        />
        <MetricCard
          title="Total Leads"
          value={stats.metrics.totalLeads}
          subtitle="in database"
          icon={<Users className="h-4 w-4" />}
          onClick={() => window.location.href = '/leads'}
        />
        <MetricCard
          title="Inbox Activity"
          value={stats.metrics.inboxActivity}
          subtitle="unread replies"
          icon={<Inbox className="h-4 w-4" />}
          onClick={() => window.location.href = '/inbox'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LabelChart 
          labels={stats.labels}
          title="Conversation Labels"
        />
        
        <ActivityChart 
          data={stats.dailyActivity}
          title="Email Activity"
          period={stats.period.type}
        />
      </div>

      {/* Bottom Section - Campaigns and Latest Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignTable 
          title="Recent Campaigns"
          limit={5}
          showActions={true}
        />
        
        <LatestActivity 
          title="Latest Activity"
          limit={8}
        />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <DashboardErrorBoundary>
          <DashboardContent />
        </DashboardErrorBoundary>
      </AppLayout>
    </ProtectedRoute>
  )
}