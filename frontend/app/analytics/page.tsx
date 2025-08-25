'use client'

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Mail, 
  Download,
  Calendar,
  Target,
  Zap,
  MousePointer,
  Reply,
  AlertTriangle,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface AnalyticsOverview {
  total_campaigns: number;
  active_campaigns: number;
  total_leads: number;
  active_leads: number;
  total_emails_sent: number;
  total_emails_delivered: number;
  total_emails_opened: number;
  total_emails_clicked: number;
  total_emails_replied: number;
  total_emails_bounced: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  bounce_rate: number;
  avg_inbox_placement_rate: number;
  avg_engagement_score: number;
}

interface TimeSeriesData {
  date: string;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
  emails_replied: number;
  emails_bounced: number;
  inbox_placement_rate: number;
}

interface TopCampaign {
  id: string;
  name: string;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_replied: number;
  open_rate: number;
  reply_rate: number;
  avg_engagement_score: number;
}

interface AccountPerformance {
  id: string;
  email: string;
  display_name: string;
  provider: string;
  health_score: number;
  daily_limit: number;
  campaigns_count: number;
  emails_sent: number;
  emails_delivered: number;
  emails_bounced: number;
  delivery_rate: number;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  timeSeries: TimeSeriesData[];
  topCampaigns: TopCampaign[];
  accountPerformance: AccountPerformance[];
  timeframe: string;
  interval: string;
}

function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyticsData = async (newTimeframe?: string) => {
    const selectedTimeframe = newTimeframe || timeframe;
    setLoading(newTimeframe !== undefined);
    setRefreshing(newTimeframe === undefined);

    try {
      const response = await fetch(`/api/enhanced-analytics/dashboard?timeframe=${selectedTimeframe}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        console.error('Failed to load analytics:', result.error);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch('/api/enhanced-analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'overview',
          timeframe,
          format: 'csv',
          includeMetrics: ['overview', 'campaigns', 'accounts']
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Create download
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'text/csv'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${timeframe}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const getHealthColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadgeColor = (score: number): string => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track performance, optimize campaigns, and measure ROI</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeframe}
            onChange={(e) => {
              setTimeframe(e.target.value);
              loadAnalyticsData(e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadAnalyticsData()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading analytics...</span>
        </div>
      ) : data ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.total_campaigns}</div>
                <p className="text-xs text-blue-600">
                  {data.overview.active_campaigns} currently active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.overview.total_emails_sent)}</div>
                <p className="text-xs text-green-600">
                  {formatPercentage(data.overview.delivery_rate)} delivery rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(data.overview.open_rate)}</div>
                <p className="text-xs text-gray-500">
                  {formatNumber(data.overview.total_emails_opened)} total opens
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
                <Reply className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(data.overview.reply_rate)}</div>
                <p className="text-xs text-gray-500">
                  {formatNumber(data.overview.total_emails_replied)} total replies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(data.overview.click_rate)}</div>
                <p className="text-xs text-gray-500">
                  {formatNumber(data.overview.total_emails_clicked)} clicks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(data.overview.bounce_rate)}</div>
                <p className="text-xs text-red-600">
                  {formatNumber(data.overview.total_emails_bounced)} bounces
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inbox Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(data.overview.avg_inbox_placement_rate)}</div>
                <p className="text-xs text-green-600">
                  Average inbox placement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.avg_engagement_score.toFixed(1)}</div>
                <p className="text-xs text-gray-500">
                  Average engagement quality
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Email Performance Trend</CardTitle>
                <CardDescription>Daily email metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                {data.timeSeries.length > 0 ? (
                  <div className="space-y-4">
                    {data.timeSeries.slice(-7).map((item, idx) => {
                      const date = new Date(item.date);
                      const openRate = item.emails_delivered > 0 ? (item.emails_opened / item.emails_delivered * 100) : 0;
                      const replyRate = item.emails_delivered > 0 ? (item.emails_replied / item.emails_delivered * 100) : 0;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatNumber(item.emails_sent)} sent
                              </span>
                              <span className="text-xs text-green-600">
                                {openRate.toFixed(1)}% open
                              </span>
                              <span className="text-xs text-blue-600">
                                {replyRate.toFixed(1)}% reply
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No trend data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>Breakdown of email engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Delivery Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Delivery Rate</span>
                      <span className="text-sm text-gray-600">{formatPercentage(data.overview.delivery_rate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${data.overview.delivery_rate}%` }}
                      />
                    </div>
                  </div>

                  {/* Open Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Open Rate</span>
                      <span className="text-sm text-gray-600">{formatPercentage(data.overview.open_rate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${data.overview.open_rate}%` }}
                      />
                    </div>
                  </div>

                  {/* Click Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Click Rate</span>
                      <span className="text-sm text-gray-600">{formatPercentage(data.overview.click_rate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${data.overview.click_rate}%` }}
                      />
                    </div>
                  </div>

                  {/* Reply Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Reply Rate</span>
                      <span className="text-sm text-gray-600">{formatPercentage(data.overview.reply_rate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(data.overview.reply_rate, 1)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Campaigns</CardTitle>
                <CardDescription>Campaigns with highest engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topCampaigns.length > 0 ? (
                  <div className="space-y-4">
                    {data.topCampaigns.slice(0, 5).map((campaign, idx) => (
                      <div key={campaign.id} className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{campaign.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {formatPercentage(campaign.open_rate)} open
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {formatPercentage(campaign.reply_rate)} reply
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatNumber(campaign.emails_sent)} emails sent
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{campaign.emails_replied}</div>
                          <div className="text-xs text-gray-500">replies</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No campaigns found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Account Performance</CardTitle>
                <CardDescription>Sender reputation and deliverability</CardDescription>
              </CardHeader>
              <CardContent>
                {data.accountPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {data.accountPerformance.slice(0, 5).map((account, idx) => (
                      <div key={account.id} className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{account.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getHealthBadgeColor(account.health_score)}>
                              {account.health_score}% health
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {account.provider}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatNumber(account.emails_sent)} sent • {account.campaigns_count} campaigns
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getHealthColor(account.delivery_rate)}`}>
                            {formatPercentage(account.delivery_rate)}
                          </div>
                          <div className="text-xs text-gray-500">delivery</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No email accounts found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>Key metrics and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Insights based on data */}
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      data.overview.open_rate >= 25 ? 'bg-green-600' : 
                      data.overview.open_rate >= 15 ? 'bg-yellow-600' : 'bg-red-600'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {data.overview.open_rate >= 25 ? 'Great' : 
                         data.overview.open_rate >= 15 ? 'Good' : 'Needs improvement'} open rate
                      </p>
                      <p className="text-xs text-gray-500">
                        {data.overview.open_rate >= 25 ? 
                         'Your emails are performing well' : 
                         'Consider improving subject lines and timing'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      data.overview.reply_rate >= 5 ? 'bg-green-600' : 
                      data.overview.reply_rate >= 2 ? 'bg-yellow-600' : 'bg-red-600'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {data.overview.reply_rate >= 5 ? 'Excellent' : 
                         data.overview.reply_rate >= 2 ? 'Good' : 'Low'} reply rate
                      </p>
                      <p className="text-xs text-gray-500">
                        {data.overview.reply_rate >= 5 ? 
                         'Strong engagement from prospects' : 
                         'Focus on personalization and value proposition'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      data.overview.bounce_rate <= 2 ? 'bg-green-600' : 
                      data.overview.bounce_rate <= 5 ? 'bg-yellow-600' : 'bg-red-600'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {data.overview.bounce_rate <= 2 ? 'Low' : 
                         data.overview.bounce_rate <= 5 ? 'Moderate' : 'High'} bounce rate
                      </p>
                      <p className="text-xs text-gray-500">
                        {data.overview.bounce_rate <= 2 ? 
                         'Good list quality' : 
                         'Review email list quality and verification'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      data.overview.avg_inbox_placement_rate >= 90 ? 'bg-green-600' : 
                      data.overview.avg_inbox_placement_rate >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {data.overview.avg_inbox_placement_rate >= 90 ? 'Excellent' : 
                         data.overview.avg_inbox_placement_rate >= 75 ? 'Good' : 'Poor'} deliverability
                      </p>
                      <p className="text-xs text-gray-500">
                        {data.overview.avg_inbox_placement_rate >= 90 ? 
                         'Great sender reputation' : 
                         'Monitor account health and warm up properly'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Failed to load analytics data</p>
          <Button 
            variant="outline" 
            onClick={() => loadAnalyticsData()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AnalyticsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}