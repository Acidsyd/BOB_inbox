'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  DownloadIcon, 
  RefreshCw, 
  Calendar, 
  TrendingUp, 
  Users, 
  Mail, 
  Eye, 
  MousePointer, 
  Reply, 
  AlertTriangle,
  ExternalLink,
  Target
} from 'lucide-react';

// Import our analytics components
import {
  KPICards,
  EngagementChart,
  GeographicAnalytics,
  DeviceAnalytics,
  RecentActivityFeed,
  DeliverabilityMonitor,
  ReplyAnalytics
} from '@/components/analytics';

// Import the analytics hook
import { useAnalytics } from '@/hooks/useAnalytics';

type TimeRange = '24h' | '7d' | '30d' | '90d';

interface CampaignDetails {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  createdAt: string;
  startDate?: string;
  endDate?: string;
  totalLeads: number;
  emailsSent: number;
  emailsDelivered: number;
  description?: string;
  tags?: string[];
}

function CampaignAnalyticsContent() {
  const params = useParams();
  const campaignId = params.id as string;
  
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [campaignDetails, setCampaignDetails] = useState<CampaignDetails | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  // Use our analytics hook for real-time data
  const {
    analytics,
    realtimeMetrics,
    isLoading,
    error,
    refresh,
    exportData
  } = useAnalytics({
    timeRange,
    campaignId,
    refreshInterval: 30000 // 30 seconds
  });

  // Load campaign details
  useEffect(() => {
    const loadCampaignDetails = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`);
        if (response.ok) {
          const data = await response.json();
          setCampaignDetails(data);
        }
      } catch (error) {
        console.error('Failed to load campaign details:', error);
      } finally {
        setLoadingCampaign(false);
      }
    };

    if (campaignId) {
      loadCampaignDetails();
    }
  }, [campaignId]);

  // Handle export functionality
  const handleExport = async () => {
    try {
      await exportData(timeRange, campaignId);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRefresh = () => {
    refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loadingCampaign) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!campaignDetails) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Campaign Not Found</h3>
          <p className="text-red-700 mb-4">The campaign you're looking for doesn't exist or you don't have access to it.</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading && !analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Analytics</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="px-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaignDetails.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={getStatusColor(campaignDetails.status)}>
                {campaignDetails.status}
              </Badge>
              <span className="text-gray-600">Campaign Analytics</span>
              {campaignDetails.tags && campaignDetails.tags.length > 0 && (
                <div className="flex gap-1">
                  {campaignDetails.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {campaignDetails.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{campaignDetails.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button onClick={handleExport} size="sm">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`/campaigns/${campaignId}`, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Campaign
          </Button>
        </div>
      </div>

      {/* Campaign Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {campaignDetails.totalLeads.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {campaignDetails.emailsSent.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Emails Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {campaignDetails.emailsDelivered.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Delivered</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Users className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {((campaignDetails.emailsDelivered / campaignDetails.emailsSent) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Delivery Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status Indicator */}
      {realtimeMetrics && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live campaign analytics</span>
          </div>
          <span className="text-gray-400">•</span>
          <span>Last updated: {new Date(realtimeMetrics.lastUpdated).toLocaleTimeString()}</span>
        </div>
      )}

      {/* KPI Cards */}
      <KPICards 
        analytics={analytics} 
        realtimeMetrics={realtimeMetrics}
        timeRange={timeRange}
        className="mb-8"
      />

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="deliverability">Deliverability</TabsTrigger>
          <TabsTrigger value="replies">Replies</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Over Time Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Campaign Engagement Timeline
                </CardTitle>
                <CardDescription>
                  Track opens, clicks, and replies for this specific campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementChart 
                  data={analytics?.engagementTimeline} 
                  timeRange={timeRange}
                  detailed={true}
                />
              </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Recent Campaign Activity
                </CardTitle>
                <CardDescription>
                  Latest engagement events from this campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivityFeed 
                  activities={analytics?.recentEvents?.filter(event => event.campaign_id === campaignId) || []} 
                  limit={8}
                  showFilters={false}
                  isLive={true}
                />
              </CardContent>
            </Card>

            {/* Campaign Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Performance Summary
                </CardTitle>
                <CardDescription>
                  Key metrics and insights for this campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Performance Indicators */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Eye className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-600">
                        {analytics?.summary?.open_rate?.toFixed(1) || '0.0'}%
                      </div>
                      <div className="text-xs text-gray-600">Open Rate</div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <MousePointer className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600">
                        {analytics?.summary?.click_rate?.toFixed(1) || '0.0'}%
                      </div>
                      <div className="text-xs text-gray-600">Click Rate</div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Reply className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-purple-600">
                        {analytics?.summary?.reply_rate?.toFixed(1) || '0.0'}%
                      </div>
                      <div className="text-xs text-gray-600">Reply Rate</div>
                    </div>
                  </div>

                  {/* Campaign Info */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{new Date(campaignDetails.createdAt).toLocaleDateString()}</span>
                      </div>
                      {campaignDetails.startDate && (
                        <div className="flex justify-between">
                          <span>Started:</span>
                          <span>{new Date(campaignDetails.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {campaignDetails.endDate && (
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span>{new Date(campaignDetails.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Engagement Analysis</CardTitle>
              <CardDescription>
                Detailed engagement metrics and patterns for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EngagementChart 
                data={analytics?.engagementTimeline} 
                timeRange={timeRange}
                detailed={true}
                height={400}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="space-y-6">
          <GeographicAnalytics 
            data={analytics?.geographic} 
            timeRange={timeRange}
          />
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <DeviceAnalytics 
            data={analytics?.devices} 
            timeRange={timeRange}
          />
        </TabsContent>

        {/* Deliverability Tab */}
        <TabsContent value="deliverability" className="space-y-6">
          <DeliverabilityMonitor 
            data={analytics?.deliverability} 
            timeRange={timeRange}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        {/* Replies Tab */}
        <TabsContent value="replies" className="space-y-6">
          <ReplyAnalytics 
            data={analytics?.replies} 
            timeRange={timeRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CampaignAnalyticsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CampaignAnalyticsContent />
      </AppLayout>
    </ProtectedRoute>
  );
}