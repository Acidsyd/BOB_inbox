'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Mail, 
  Users, 
  Target,
  BarChart3,
  LineChart,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Brain,
  Eye
} from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/billing'
import { 
  UsageAnalyticsData, 
  UsageTrendData, 
  UsageForecast,
  DrillDownFilter 
} from '@/types/billing'

interface AdvancedUsageAnalyticsProps {
  isLoading?: boolean
  onRefresh?: () => Promise<void>
  onExport?: (format: 'csv' | 'pdf' | 'xlsx') => void
}

// Enhanced Mock Data with forecasting and drill-down
const mockAnalyticsData: UsageAnalyticsData = {
  current: {
    id: 'current',
    organization_id: 'org-1',
    period_month: 8,
    period_year: 2024,
    period_start: '2024-08-01T00:00:00Z',
    period_end: '2024-08-31T23:59:59Z',
    emails_sent: 4500,
    emails_quota: 5000,
    emails_remaining: 500,
    overage_emails: 0,
    email_accounts_connected: 5,
    email_accounts_quota: 10,
    campaigns_created: 15,
    campaigns_quota: 50,
    active_campaigns: 3,
    leads_imported: 750,
    leads_quota: 1000,
    last_reset_date: '2024-08-01T00:00:00Z',
    auto_reset: true,
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-23T12:00:00Z',
    utilizationPercentage: 90
  },
  historical: [],
  trends: {
    daily: Array.from({ length: 30 }, (_, i) => ({
      period: `2024-08-${String(i + 1).padStart(2, '0')}`,
      periodType: 'day' as const,
      timestamp: new Date(2024, 7, i + 1).toISOString(),
      emails_sent: Math.floor(Math.random() * 200) + 100,
      emails_delivered: Math.floor(Math.random() * 180) + 95,
      emails_opened: Math.floor(Math.random() * 80) + 40,
      emails_clicked: Math.floor(Math.random() * 20) + 10,
      email_accounts_connected: 5,
      email_accounts_active: Math.floor(Math.random() * 3) + 3,
      campaigns_created: Math.floor(Math.random() * 3),
      campaigns_active: Math.floor(Math.random() * 2) + 1,
      leads_imported: Math.floor(Math.random() * 50) + 20,
      leads_processed: Math.floor(Math.random() * 45) + 18,
      quota_utilization: Math.floor(Math.random() * 40) + 60,
      cost_per_email: 0.02,
      revenue_generated: Math.floor(Math.random() * 1000) + 500
    })),
    weekly: Array.from({ length: 12 }, (_, i) => ({
      period: `2024-W${i + 20}`,
      periodType: 'week' as const,
      timestamp: new Date(2024, 4, i * 7 + 1).toISOString(),
      emails_sent: Math.floor(Math.random() * 1000) + 800,
      emails_delivered: Math.floor(Math.random() * 950) + 750,
      emails_opened: Math.floor(Math.random() * 400) + 300,
      emails_clicked: Math.floor(Math.random() * 100) + 80,
      email_accounts_connected: 5,
      email_accounts_active: 4,
      campaigns_created: Math.floor(Math.random() * 5) + 2,
      campaigns_active: Math.floor(Math.random() * 3) + 1,
      leads_imported: Math.floor(Math.random() * 200) + 150,
      leads_processed: Math.floor(Math.random() * 180) + 140,
      quota_utilization: Math.floor(Math.random() * 30) + 70,
      cost_per_email: 0.02,
      revenue_generated: Math.floor(Math.random() * 5000) + 3000
    })),
    monthly: Array.from({ length: 6 }, (_, i) => ({
      period: `2024-${String(i + 3).padStart(2, '0')}`,
      periodType: 'month' as const,
      timestamp: new Date(2024, i + 2, 1).toISOString(),
      emails_sent: Math.floor(Math.random() * 2000) + 3000,
      emails_delivered: Math.floor(Math.random() * 1900) + 2800,
      emails_opened: Math.floor(Math.random() * 800) + 1200,
      emails_clicked: Math.floor(Math.random() * 200) + 300,
      email_accounts_connected: Math.floor(Math.random() * 2) + 4,
      email_accounts_active: Math.floor(Math.random() * 2) + 3,
      campaigns_created: Math.floor(Math.random() * 10) + 10,
      campaigns_active: Math.floor(Math.random() * 5) + 2,
      leads_imported: Math.floor(Math.random() * 300) + 500,
      leads_processed: Math.floor(Math.random() * 280) + 480,
      quota_utilization: Math.floor(Math.random() * 30) + 70,
      cost_per_email: 0.02,
      revenue_generated: Math.floor(Math.random() * 10000) + 15000
    }))
  },
  forecasting: {
    nextMonth: {
      predicted_emails: 5200,
      predicted_accounts_needed: 6,
      predicted_cost: 104,
      confidence_level: 85,
      growth_rate: 15.6,
      seasonality_factor: 1.1,
      recommendations: [
        {
          type: 'upgrade',
          message: 'Consider upgrading to handle predicted 15.6% growth',
          priority: 'medium',
          action: 'upgrade-plan'
        },
        {
          type: 'optimize',
          message: 'Current utilization is high, optimize send times',
          priority: 'low',
          action: 'optimize-sending'
        }
      ]
    },
    nextQuarter: {
      predicted_emails: 16800,
      predicted_accounts_needed: 8,
      predicted_cost: 336,
      confidence_level: 78,
      growth_rate: 24.3,
      seasonality_factor: 1.2,
      recommendations: [
        {
          type: 'upgrade',
          message: 'Plan upgrade recommended for Q4 seasonal increase',
          priority: 'high',
          action: 'upgrade-plan'
        },
        {
          type: 'warning',
          message: 'High growth rate may exceed current quotas',
          priority: 'high',
          action: 'monitor-usage'
        }
      ]
    },
    recommendations: [
      'Consider upgrading to Full plan for better scalability',
      'Optimize email sending during peak hours for better deliverability',
      'Monitor quota utilization closely during campaign launches'
    ]
  },
  drillDown: {
    emailsByDomain: [
      { domain: 'gmail.com', count: 1800, percentage: 40 },
      { domain: 'outlook.com', count: 1350, percentage: 30 },
      { domain: 'yahoo.com', count: 675, percentage: 15 },
      { domain: 'hotmail.com', count: 450, percentage: 10 },
      { domain: 'other', count: 225, percentage: 5 }
    ],
    campaignPerformance: [
      { name: 'Q3 Product Launch', sent: 1200, opened: 480, clicked: 144 },
      { name: 'Newsletter August', sent: 800, opened: 240, clicked: 48 },
      { name: 'Webinar Invitation', sent: 600, opened: 300, clicked: 90 },
      { name: 'Customer Survey', sent: 400, opened: 160, clicked: 32 }
    ],
    accountUtilization: [
      { account: 'marketing@company.com', sent: 1800, quota: 2000, utilization: 90 },
      { account: 'sales@company.com', sent: 1500, quota: 2000, utilization: 75 },
      { account: 'support@company.com', sent: 800, quota: 1000, utilization: 80 },
      { account: 'info@company.com', sent: 400, quota: 1000, utilization: 40 }
    ]
  }
}

interface MetricCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  change?: {
    value: number
    label: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  forecast?: {
    value: number
    confidence: number
  }
  status?: 'good' | 'warning' | 'critical'
}

function EnhancedMetricCard({ icon, title, value, change, forecast, status }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getChangeIcon = () => {
    if (!change) return null
    switch (change.type) {
      case 'increase': return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'decrease': return <TrendingDown className="h-3 w-3 text-red-600" />
      default: return <Activity className="h-3 w-3 text-gray-600" />
    }
  }

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/50 rounded-lg">
          {icon}
        </div>
        {change && (
          <div className="flex items-center gap-1 text-sm font-medium">
            {getChangeIcon()}
            {Math.abs(change.value)}%
          </div>
        )}
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-1">{title}</h4>
        <div className="text-2xl font-bold mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {change && (
          <div className="text-sm mb-2">
            <span className={
              change.type === 'increase' ? 'text-green-600' : 
              change.type === 'decrease' ? 'text-red-600' : 
              'text-gray-600'
            }>
              {change.label}
            </span>
          </div>
        )}

        {forecast && (
          <div className="pt-2 border-t border-white/50">
            <div className="flex items-center justify-between text-xs">
              <span>Forecast:</span>
              <Badge variant="secondary" className="text-xs">
                {forecast.confidence}% confidence
              </Badge>
            </div>
            <div className="text-sm font-medium">
              {forecast.value.toLocaleString()} next month
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ForecastingPanelProps {
  forecast: UsageForecast
  period: 'nextMonth' | 'nextQuarter'
  title: string
}

function ForecastingPanel({ forecast, period, title }: ForecastingPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-purple-600" />
          {title}
          <Badge variant="outline" className="ml-2">
            {forecast.confidence_level}% confidence
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered predictions based on historical patterns and trends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Mail className="h-5 w-5 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-900">
              {forecast.predicted_emails.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">Predicted Emails</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Users className="h-5 w-5 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-900">
              {forecast.predicted_accounts_needed}
            </div>
            <div className="text-sm text-green-600">Accounts Needed</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-900">
              +{forecast.growth_rate}%
            </div>
            <div className="text-sm text-purple-600">Growth Rate</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">AI Recommendations</h4>
          {forecast.recommendations.map((rec, index) => {
            const getIconAndColor = () => {
              switch (rec.type) {
                case 'upgrade': return { icon: <ArrowUpRight className="h-4 w-4" />, color: 'blue' }
                case 'warning': return { icon: <AlertTriangle className="h-4 w-4" />, color: 'yellow' }
                case 'optimize': return { icon: <Zap className="h-4 w-4" />, color: 'green' }
                default: return { icon: <CheckCircle className="h-4 w-4" />, color: 'gray' }
              }
            }
            
            const { icon, color } = getIconAndColor()
            
            return (
              <div key={index} className={`p-3 border-l-4 border-${color}-500 bg-${color}-50`}>
                <div className="flex items-start gap-3">
                  <div className={`p-1 rounded bg-${color}-100 text-${color}-600`}>
                    {icon}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium text-${color}-900`}>
                      {rec.message}
                    </div>
                    <Badge 
                      variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                      className="mt-1 text-xs"
                    >
                      {rec.priority} priority
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface DrillDownPanelProps {
  data: UsageAnalyticsData['drillDown']
  activeView: 'domains' | 'campaigns' | 'accounts'
  onViewChange: (view: 'domains' | 'campaigns' | 'accounts') => void
}

function DrillDownPanel({ data, activeView, onViewChange }: DrillDownPanelProps) {
  const renderDomainsView = () => (
    <div className="space-y-3">
      {data.emailsByDomain.map((item, index) => (
        <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{item.domain}</div>
            <div className="text-sm text-gray-500">{item.count.toLocaleString()} emails</div>
          </div>
          <div className="flex-none w-24">
            <Progress value={item.percentage} className="h-2" />
            <div className="text-xs text-gray-500 mt-1">{item.percentage}%</div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderCampaignsView = () => (
    <div className="space-y-3">
      {data.campaignPerformance.map((item, index) => (
        <div key={index} className="p-3 border rounded-lg">
          <div className="font-medium mb-2">{item.name}</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Sent</div>
              <div className="font-medium">{item.sent.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Opened</div>
              <div className="font-medium text-blue-600">
                {item.opened.toLocaleString()} ({Math.round((item.opened / item.sent) * 100)}%)
              </div>
            </div>
            <div>
              <div className="text-gray-500">Clicked</div>
              <div className="font-medium text-green-600">
                {item.clicked.toLocaleString()} ({Math.round((item.clicked / item.sent) * 100)}%)
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderAccountsView = () => (
    <div className="space-y-3">
      {data.accountUtilization.map((item, index) => (
        <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{item.account}</div>
            <div className="text-sm text-gray-500">
              {item.sent.toLocaleString()} / {item.quota.toLocaleString()} emails
            </div>
          </div>
          <div className="flex-none w-24">
            <Progress value={item.utilization} className="h-2" />
            <div className="text-xs text-gray-500 mt-1">{item.utilization}%</div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Drill-down Analysis
          </div>
          <div className="flex gap-1">
            {[
              { key: 'domains' as const, label: 'Domains' },
              { key: 'campaigns' as const, label: 'Campaigns' },
              { key: 'accounts' as const, label: 'Accounts' }
            ].map((view) => (
              <Button
                key={view.key}
                variant={activeView === view.key ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange(view.key)}
              >
                {view.label}
              </Button>
            ))}
          </div>
        </CardTitle>
        <CardDescription>
          Detailed breakdown of your email sending patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeView === 'domains' && renderDomainsView()}
        {activeView === 'campaigns' && renderCampaignsView()}
        {activeView === 'accounts' && renderAccountsView()}
      </CardContent>
    </Card>
  )
}

export default function AdvancedUsageAnalytics({ 
  isLoading, 
  onRefresh, 
  onExport 
}: AdvancedUsageAnalyticsProps) {
  const [data] = useState<UsageAnalyticsData>(mockAnalyticsData)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedMetric, setSelectedMetric] = useState<'emails_sent' | 'emails_opened' | 'campaigns_created'>('emails_sent')
  const [forecastPeriod, setForecastPeriod] = useState<'nextMonth' | 'nextQuarter'>('nextMonth')
  const [drillDownView, setDrillDownView] = useState<'domains' | 'campaigns' | 'accounts'>('domains')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const currentTrends = useMemo(() => {
    return data.trends[selectedPeriod] || []
  }, [data.trends, selectedPeriod])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getMetricChange = (metric: keyof UsageTrendData) => {
    const recent = currentTrends.slice(-2)
    if (recent.length < 2) return null
    
    const current = Number(recent[1][metric])
    const previous = Number(recent[0][metric])
    const change = ((current - previous) / previous) * 100
    
    return {
      value: Math.abs(Math.round(change)),
      label: change > 0 ? 'vs last period' : 'vs last period',
      type: change > 0 ? 'increase' as const : change < 0 ? 'decrease' as const : 'neutral' as const
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-80" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Analytics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Advanced Usage Analytics
              <Badge variant="outline" className="ml-2">
                AI-Powered
              </Badge>
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
              <Select onValueChange={(value) => onExport?.(value as any)}>
                <SelectTrigger className="w-32">
                  <Download className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">Export CSV</SelectItem>
                  <SelectItem value="xlsx">Export Excel</SelectItem>
                  <SelectItem value="pdf">Export PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
          <CardDescription>
            Real-time analytics with AI-powered forecasting and detailed insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Metrics Overview */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Real-time Metrics
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <EnhancedMetricCard
                icon={<Mail className="h-4 w-4" />}
                title="Emails Sent"
                value={data.current.emails_sent}
                change={getMetricChange('emails_sent') || undefined}
                forecast={{
                  value: data.forecasting.nextMonth.predicted_emails,
                  confidence: data.forecasting.nextMonth.confidence_level
                }}
                status={data.current.utilizationPercentage > 90 ? 'critical' : 
                       data.current.utilizationPercentage > 75 ? 'warning' : 'good'}
              />
              
              <EnhancedMetricCard
                icon={<Users className="h-4 w-4" />}
                title="Active Accounts"
                value={data.current.email_accounts_connected}
                change={getMetricChange('email_accounts_active') || undefined}
                forecast={{
                  value: data.forecasting.nextMonth.predicted_accounts_needed,
                  confidence: data.forecasting.nextMonth.confidence_level
                }}
                status="good"
              />
              
              <EnhancedMetricCard
                icon={<Target className="h-4 w-4" />}
                title="Active Campaigns"
                value={data.current.active_campaigns}
                change={getMetricChange('campaigns_active') || undefined}
                status="good"
              />
              
              <EnhancedMetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                title="Quota Utilization"
                value={`${data.current.utilizationPercentage}%`}
                status={data.current.utilizationPercentage > 90 ? 'critical' : 
                       data.current.utilizationPercentage > 75 ? 'warning' : 'good'}
              />
            </div>
          </div>

          {/* Period and Metric Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Period:</span>
              <div className="flex gap-1">
                {[
                  { key: 'daily' as const, label: 'Daily' },
                  { key: 'weekly' as const, label: 'Weekly' },
                  { key: 'monthly' as const, label: 'Monthly' }
                ].map((period) => (
                  <Button
                    key={period.key}
                    variant={selectedPeriod === period.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period.key)}
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Metric:</span>
              <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emails_sent">Emails Sent</SelectItem>
                  <SelectItem value="emails_opened">Emails Opened</SelectItem>
                  <SelectItem value="campaigns_created">Campaigns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecasting Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ForecastingPanel
          forecast={data.forecasting.nextMonth}
          period="nextMonth"
          title="Next Month Forecast"
        />
        <ForecastingPanel
          forecast={data.forecasting.nextQuarter}
          period="nextQuarter"
          title="Next Quarter Forecast"
        />
      </div>

      {/* Drill-down Analysis */}
      <DrillDownPanel
        data={data.drillDown}
        activeView={drillDownView}
        onViewChange={setDrillDownView}
      />
    </div>
  )
}