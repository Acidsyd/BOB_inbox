'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUp, 
  Calendar, 
  Mail, 
  Users, 
  Target,
  BarChart3,
  LineChart,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { formatDate } from '@/lib/billing'
import { UsageStats } from '@/types/billing'

interface UsageAnalyticsProps {
  isLoading?: boolean
}

interface UsageTrendData {
  period: string
  emails_sent: number
  email_accounts_connected: number
  campaigns_created: number
  leads_imported: number
  quota_utilization: number
}

// Mock data for demonstration
const mockUsageTrends: UsageTrendData[] = [
  {
    period: '2024-05',
    emails_sent: 3200,
    email_accounts_connected: 3,
    campaigns_created: 8,
    leads_imported: 450,
    quota_utilization: 64
  },
  {
    period: '2024-06',
    emails_sent: 4100,
    email_accounts_connected: 4,
    campaigns_created: 12,
    leads_imported: 620,
    quota_utilization: 82
  },
  {
    period: '2024-07',
    emails_sent: 3800,
    email_accounts_connected: 4,
    campaigns_created: 10,
    leads_imported: 580,
    quota_utilization: 76
  },
  {
    period: '2024-08',
    emails_sent: 4500,
    email_accounts_connected: 5,
    campaigns_created: 15,
    leads_imported: 750,
    quota_utilization: 90
  }
]

interface MetricCardProps {
  icon: React.ReactNode
  title: string
  current: number
  previous: number
  unit: string
  format?: (value: number) => string
}

function MetricCard({ icon, title, current, previous, unit, format }: MetricCardProps) {
  const change = current - previous
  const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0
  const isPositive = change > 0
  const isNeutral = change === 0

  const formatValue = format || ((value: number) => value.toLocaleString())

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isNeutral ? 'text-gray-600' : isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {isNeutral ? (
            '–'
          ) : (
            <>
              <TrendingUp className={`h-3 w-3 ${isPositive ? '' : 'transform rotate-180'}`} />
              {Math.abs(changePercent)}%
            </>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatValue(current)}
        </div>
        <div className="text-sm text-gray-500">
          {change !== 0 && (
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {isPositive ? '+' : ''}{formatValue(Math.abs(change))} {unit}
            </span>
          )}
          {change !== 0 && <span className="text-gray-400 mx-1">vs last month</span>}
          {change === 0 && <span>No change from last month</span>}
        </div>
      </div>
    </div>
  )
}

function SimpleBarChart({ data, dataKey, title, color = '#3b82f6' }: {
  data: UsageTrendData[]
  dataKey: keyof UsageTrendData
  title: string
  color?: string
}) {
  const maxValue = Math.max(...data.map(item => Number(item[dataKey])))
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="flex items-end gap-2 h-32">
        {data.map((item, index) => {
          const value = Number(item[dataKey])
          const height = (value / maxValue) * 100
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-gray-200 rounded-t flex items-end justify-center relative group cursor-pointer"
                style={{ height: '100%' }}
              >
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                  style={{ 
                    height: `${height}%`, 
                    backgroundColor: color,
                    minHeight: value > 0 ? '2px' : '0'
                  }}
                />
                
                {/* Tooltip */}
                <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {value.toLocaleString()}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                {new Date(item.period).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function UsageAnalytics({ isLoading }: UsageAnalyticsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'emails' | 'accounts' | 'campaigns' | 'leads'>('emails')
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '1y'>('3m')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mock current data
  const currentMonth = mockUsageTrends[mockUsageTrends.length - 1]
  const previousMonth = mockUsageTrends[mockUsageTrends.length - 2]

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const handleExport = () => {
    // Generate CSV export
    console.log('Export usage analytics')
  }

  const getChartColor = () => {
    switch (selectedMetric) {
      case 'emails': return '#3b82f6'
      case 'accounts': return '#10b981'
      case 'campaigns': return '#8b5cf6'
      case 'leads': return '#f59e0b'
      default: return '#3b82f6'
    }
  }

  const getChartDataKey = (): keyof UsageTrendData => {
    switch (selectedMetric) {
      case 'emails': return 'emails_sent'
      case 'accounts': return 'email_accounts_connected'
      case 'campaigns': return 'campaigns_created'
      case 'leads': return 'leads_imported'
      default: return 'emails_sent'
    }
  }

  const getChartTitle = () => {
    switch (selectedMetric) {
      case 'emails': return 'Emails Sent Over Time'
      case 'accounts': return 'Email Accounts Connected'
      case 'campaigns': return 'Campaigns Created'
      case 'leads': return 'Leads Imported'
      default: return 'Usage Over Time'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Analytics
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Historical usage trends and analytics for your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Overview */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Monthly Summary</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Mail className="h-4 w-4" />}
              title="Emails Sent"
              current={currentMonth.emails_sent}
              previous={previousMonth.emails_sent}
              unit="emails"
            />
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              title="Email Accounts"
              current={currentMonth.email_accounts_connected}
              previous={previousMonth.email_accounts_connected}
              unit="accounts"
            />
            <MetricCard
              icon={<Target className="h-4 w-4" />}
              title="Campaigns"
              current={currentMonth.campaigns_created}
              previous={previousMonth.campaigns_created}
              unit="campaigns"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              title="Quota Utilization"
              current={currentMonth.quota_utilization}
              previous={previousMonth.quota_utilization}
              unit="%"
              format={(value) => `${value}%`}
            />
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Metric:</span>
            <div className="flex gap-1">
              {[
                { key: 'emails' as const, label: 'Emails', icon: <Mail className="h-3 w-3" /> },
                { key: 'accounts' as const, label: 'Accounts', icon: <Users className="h-3 w-3" /> },
                { key: 'campaigns' as const, label: 'Campaigns', icon: <Target className="h-3 w-3" /> },
                { key: 'leads' as const, label: 'Leads', icon: <TrendingUp className="h-3 w-3" /> }
              ].map((metric) => (
                <Button
                  key={metric.key}
                  variant={selectedMetric === metric.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMetric(metric.key)}
                  className="h-8 px-3"
                >
                  {metric.icon}
                  <span className="ml-1 hidden sm:inline">{metric.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Period:</span>
            <div className="flex gap-1">
              {[
                { key: '3m' as const, label: '3 Months' },
                { key: '6m' as const, label: '6 Months' },
                { key: '1y' as const, label: '1 Year' }
              ].map((period) => (
                <Button
                  key={period.key}
                  variant={dateRange === period.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateRange(period.key)}
                  className="h-8 px-3"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Trend Chart */}
        <div className="p-4 border rounded-lg bg-white">
          <SimpleBarChart
            data={mockUsageTrends}
            dataKey={getChartDataKey()}
            title={getChartTitle()}
            color={getChartColor()}
          />
        </div>

        {/* Usage Insights */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Growth Trend</h4>
            <p className="text-sm text-blue-700">
              Your email volume has grown by 41% over the last 3 months, 
              indicating strong campaign engagement.
            </p>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Usage Pattern</h4>
            <p className="text-sm text-yellow-700">
              You're consistently using 85%+ of your quota. Consider upgrading 
              to avoid hitting limits during peak campaigns.
            </p>
          </div>
        </div>

        {/* Data Footer */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t">
          Data updated every hour • Last updated: {formatDate(new Date().toISOString())} • 
          <Button variant="link" className="text-xs p-0 h-auto ml-1">
            Learn more about usage tracking
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}