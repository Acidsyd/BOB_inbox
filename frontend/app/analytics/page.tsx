'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  RefreshCw, 
  Calendar, 
  TrendingUp, 
  Users, 
  Mail, 
  Eye, 
  MousePointer, 
  Reply, 
  AlertTriangle,
  BarChart3,
  Target,
  Globe,
  Smartphone,
  Activity,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

// Import our analytics components
import {
  KPICards,
  EngagementChart,
  GeographicAnalytics,
  DeviceAnalytics,
  CampaignPerformanceTable,
  RecentActivityFeed,
  DeliverabilityMonitor,
  ReplyAnalytics,
  AdvancedAnalyticsDashboard
} from '@/components/analytics'

// Import the analytics hook
import { useAnalytics } from '@/hooks/useAnalytics'

type TimeRange = '24h' | '7d' | '30d' | '90d';

interface AnalyticsPageProps {}

function AnalyticsContent() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  // Use our analytics hook for real-time data
  const {
    analytics,
    campaignAnalytics,
    realtimeMetrics,
    isLoading,
    error,
    refresh,
    exportData,
    connectionStatus
  } = useAnalytics({
    timeRange,
    campaignId: selectedCampaign === 'all' ? undefined : selectedCampaign,
    refreshInterval: 30000 // 30 seconds
  });

  // Handle export functionality with loading state
  const handleExport = async (format: 'csv' | 'json' | 'excel' = 'csv') => {
    setIsExporting(true);
    try {
      await exportData(timeRange, selectedCampaign, format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    refresh();
  };

  const getTimeRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case '24h': return 'Last 24 Hours';
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      default: return 'Last 7 Days';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Connection Status */}
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {connectionStatus === 'connected' ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Live
                </>
              ) : connectionStatus === 'reconnecting' ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Reconnecting
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
          </div>
          <p className="text-gray-600">
            Track performance, optimize campaigns, and measure ROI in real-time
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Campaign Selector */}
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignAnalytics?.campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport('csv')}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="font-medium">Failed to load analytics data</p>
                <p className="text-sm text-red-500 mt-1">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh} 
                  className="mt-3"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !analytics ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-700 font-medium">Loading analytics...</span>
        </div>
      ) : analytics && (
        <>
          {/* KPI Cards Section */}
          <KPICards 
            analytics={analytics.summary}
            realtimeMetrics={realtimeMetrics || undefined}
            timeRange={timeRange}
          />

          {/* Main Dashboard Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="engagement" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Engagement
              </TabsTrigger>
              <TabsTrigger value="geographic" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Geographic
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Devices
              </TabsTrigger>
              <TabsTrigger value="deliverability" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Deliverability
              </TabsTrigger>
              <TabsTrigger value="replies" className="flex items-center gap-2">
                <Reply className="w-4 h-4" />
                Replies
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EngagementChart 
                  data={analytics.engagementTimeline}
                  timeRange={timeRange}
                  isLoading={isLoading}
                />
                <CampaignPerformanceTable 
                  campaigns={campaignAnalytics?.campaigns || []}
                  isLoading={isLoading}
                />
              </div>
              
              <RecentActivityFeed 
                events={analytics.recentEvents}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="space-y-6">
              <EngagementChart 
                data={analytics.engagementTimeline}
                timeRange={timeRange}
                isLoading={isLoading}
                detailed={true}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CampaignPerformanceTable 
                  campaigns={campaignAnalytics?.campaigns || []}
                  isLoading={isLoading}
                  detailed={true}
                />
                <RecentActivityFeed 
                  events={analytics.recentEvents}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>

            {/* Geographic Tab */}
            <TabsContent value="geographic" className="space-y-6">
              <GeographicAnalytics 
                data={analytics.geographic}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Devices Tab */}
            <TabsContent value="devices" className="space-y-6">
              <DeviceAnalytics 
                data={analytics.devices}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Deliverability Tab */}
            <TabsContent value="deliverability" className="space-y-6">
              <DeliverabilityMonitor 
                data={analytics.deliverability}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* Replies Tab */}
            <TabsContent value="replies" className="space-y-6">
              <ReplyAnalytics 
                data={analytics.replies}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </>
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