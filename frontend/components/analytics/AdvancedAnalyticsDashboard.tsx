'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  Users, 
  Target, 
  Clock,
  Eye,
  MousePointer,
  MessageSquare,
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react'
import { api } from '@/lib/api'

// Chart components (using a hypothetical charting library)
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

interface AnalyticsData {
  overview: {
    total_campaigns: number
    active_campaigns: number
    total_leads: number
    active_leads: number
    total_emails_sent: number
    total_emails_delivered: number
    total_emails_opened: number
    total_emails_clicked: number
    total_emails_replied: number
    total_emails_bounced: number
    delivery_rate: number
    open_rate: number
    click_rate: number
    reply_rate: number
    bounce_rate: number
    avg_inbox_placement_rate: number
    avg_engagement_score: number
  }
  timeSeries: Array<{
    date: string
    emails_sent: number
    emails_delivered: number
    emails_opened: number
    emails_clicked: number
    emails_replied: number
    emails_bounced: number
    inbox_placement_rate: number
  }>
  topCampaigns: Array<{
    id: string
    name: string
    emails_sent: number
    emails_delivered: number
    emails_opened: number
    emails_replied: number
    open_rate: number
    reply_rate: number
    avg_engagement_score: number
  }>
  accountPerformance: Array<{
    id: string
    email: string
    display_name: string
    provider: string
    health_score: number
    daily_limit: number
    campaigns_count: number
    emails_sent: number
    emails_delivered: number
    emails_bounced: number
    delivery_rate: number
  }>
}

const TIMEFRAMES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' }
]

const CHART_COLORS = {
  primary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: '#6B7280'
}

export default function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalytics()
  }, [timeframe])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/enhanced-analytics/dashboard?timeframe=${timeframe}`)
      setData(response.data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalytics()
    setRefreshing(false)
  }

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(decimals) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(decimals) + 'K'
    }
    return num.toString()
  }

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`
  }

  const getPerformanceColor = (value: number, type: 'rate' | 'score') => {
    if (type === 'rate') {
      if (value >= 20) return 'text-green-600'
      if (value >= 10) return 'text-yellow-600'
      return 'text-red-600'
    } else {
      if (value >= 80) return 'text-green-600'
      if (value >= 60) return 'text-yellow-600'
      return 'text-red-600'
    }
  }

  const getTrendIcon = (current: number, previous: number) => {
    const change = current - previous
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Start sending campaigns to see your performance metrics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your campaign performance and optimize your results</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-2">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Export Button */}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Campaigns */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <div className="flex items-center mt-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {data.overview.total_campaigns}
                  </p>
                  <Badge variant="secondary" className="ml-2">
                    {data.overview.active_campaigns} active
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Leads */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <div className="flex items-center mt-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(data.overview.total_leads)}
                  </p>
                  <Badge variant="secondary" className="ml-2">
                    {formatNumber(data.overview.active_leads)} active
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emails Sent */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <div className="flex items-center mt-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(data.overview.total_emails_sent)}
                  </p>
                  <div className="ml-2">
                    {getTrendIcon(data.overview.total_emails_sent, data.overview.total_emails_sent * 0.9)}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatPercentage(data.overview.delivery_rate)} delivered
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reply Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reply Rate</p>
                <div className="flex items-center mt-2">
                  <p className={`text-2xl font-bold ${getPerformanceColor(data.overview.reply_rate, 'rate')}`}>
                    {formatPercentage(data.overview.reply_rate)}
                  </p>
                  <div className="ml-2">
                    {getTrendIcon(data.overview.reply_rate, data.overview.reply_rate * 0.85)}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatNumber(data.overview.total_emails_replied)} replies
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <MessageSquare className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Open Rate</span>
            </div>
            <p className={`text-xl font-bold ${getPerformanceColor(data.overview.open_rate, 'rate')}`}>
              {formatPercentage(data.overview.open_rate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <MousePointer className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Click Rate</span>
            </div>
            <p className={`text-xl font-bold ${getPerformanceColor(data.overview.click_rate, 'rate')}`}>
              {formatPercentage(data.overview.click_rate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Bounce Rate</span>
            </div>
            <p className={`text-xl font-bold ${
              data.overview.bounce_rate <= 2 ? 'text-green-600' : 
              data.overview.bounce_rate <= 5 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatPercentage(data.overview.bounce_rate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-gray-600">Engagement</span>
            </div>
            <p className={`text-xl font-bold ${getPerformanceColor(data.overview.avg_engagement_score, 'score')}`}>
              {data.overview.avg_engagement_score.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Performance Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Email Performance Trends</CardTitle>
            <CardDescription>Track your email metrics over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [formatNumber(value), name]}
                />
                <Area 
                  type="monotone" 
                  dataKey="emails_sent" 
                  stackId="1"
                  stroke={CHART_COLORS.primary} 
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="emails_opened" 
                  stackId="2"
                  stroke={CHART_COLORS.success} 
                  fill={CHART_COLORS.success}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="emails_replied" 
                  stackId="3"
                  stroke={CHART_COLORS.warning} 
                  fill={CHART_COLORS.warning}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Campaigns</CardTitle>
            <CardDescription>Campaigns with highest reply rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topCampaigns.slice(0, 5).map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                      <p className="text-sm text-gray-500">
                        {formatNumber(campaign.emails_sent)} sent • {formatNumber(campaign.emails_replied)} replies
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getPerformanceColor(campaign.reply_rate, 'rate')}`}>
                      {formatPercentage(campaign.reply_rate)}
                    </p>
                    <p className="text-xs text-gray-500">reply rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Account Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Email Account Performance</CardTitle>
          <CardDescription>Monitor the health and performance of your sending accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Account</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Provider</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Health Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Emails Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Delivery Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Daily Limit</th>
                </tr>
              </thead>
              <tbody>
                {data.accountPerformance.map((account) => (
                  <tr key={account.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {account.display_name || account.email}
                        </div>
                        {account.display_name && (
                          <div className="text-sm text-gray-500">{account.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">
                        {account.provider}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          account.health_score >= 90 ? 'bg-green-500' :
                          account.health_score >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className={getPerformanceColor(account.health_score, 'score')}>
                          {account.health_score}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {formatNumber(account.emails_sent)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={getPerformanceColor(account.delivery_rate, 'rate')}>
                        {formatPercentage(account.delivery_rate)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span>{account.daily_limit}/day</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (account.emails_sent / account.daily_limit) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}