'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { 
  TrackingAnalyticsSummary, 
  EmailTrackingEvent, 
  CampaignTrackingOverview,
  GeographicInsight,
  DeviceInsight,
  EmailClientInsight
} from '@/types/email-tracking';

interface AnalyticsParams {
  timeRange: '24h' | '7d' | '30d' | '90d';
  campaignId?: string;
  organizationId?: string;
  refreshInterval?: number;
}

interface AnalyticsData {
  summary: TrackingAnalyticsSummary;
  engagementTimeline: Array<{
    date: string;
    opens: number;
    clicks: number;
    replies: number;
    bounces: number;
  }>;
  geographic: {
    countries: GeographicInsight[];
    regions: GeographicInsight[];
  };
  devices: {
    types: DeviceInsight[];
    emailClients: EmailClientInsight[];
  };
  deliverability: {
    deliveryRate: number;
    bounceRate: number;
    spamRate: number;
    reputationScore: number;
    trends: Array<{
      date: string;
      deliveryRate: number;
      bounceRate: number;
    }>;
  };
  replies: {
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
      ooo: number;
    };
    categories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    timeline: Array<{
      date: string;
      replies: number;
      sentiment: number;
    }>;
  };
  recentEvents: EmailTrackingEvent[];
  trends: {
    openRate: number;
    clickRate: number;
    replyRate: number;
  };
}

interface CampaignAnalyticsData {
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    openRate: number;
    clickRate: number;
    replyRate: number;
    sentCount: number;
  }>;
}

interface RealtimeMetrics {
  lastUpdated: string;
  activeUsers: number;
  liveEvents: number;
  currentOpenRate: number;
  currentClickRate: number;
  currentReplyRate: number;
}

export const useAnalytics = (params: AnalyticsParams) => {
  const queryClient = useQueryClient();
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // WebSocket connection for real-time updates
  const { on, off, emit, isConnected } = useWebSocket({
    autoConnect: true,
    reconnectionAttempts: 5
  });

  // Query keys
  const analyticsQueryKey = ['analytics', params.timeRange, params.campaignId, params.organizationId];
  const campaignAnalyticsQueryKey = ['campaign-analytics', params.organizationId];

  // Main analytics data query
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery<AnalyticsData>({
    queryKey: analyticsQueryKey,
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        timeRange: params.timeRange,
        ...(params.campaignId && { campaignId: params.campaignId }),
        ...(params.organizationId && { organizationId: params.organizationId })
      });

      const response = await fetch(`/api/analytics/dashboard?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      return response.json();
    },
    refetchInterval: params.refreshInterval || 30000,
    staleTime: 15000, // Consider data fresh for 15 seconds
    retry: 3
  });

  // Campaign analytics query
  const {
    data: campaignAnalytics,
    isLoading: campaignAnalyticsLoading,
    error: campaignAnalyticsError
  } = useQuery<CampaignAnalyticsData>({
    queryKey: campaignAnalyticsQueryKey,
    queryFn: async () => {
      const response = await fetch('/api/analytics/campaigns');
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign analytics: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  });

  // Real-time event handlers
  useEffect(() => {
    if (!isConnected) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connected');

    // Subscribe to analytics events
    const unsubscribeAnalytics = on('analytics_update', (data: any) => {
      console.log('Received analytics update:', data);
      
      // Update real-time metrics
      setRealtimeMetrics({
        lastUpdated: new Date().toISOString(),
        activeUsers: data.activeUsers || 0,
        liveEvents: data.liveEvents || 0,
        currentOpenRate: data.openRate || 0,
        currentClickRate: data.clickRate || 0,
        currentReplyRate: data.replyRate || 0
      });

      // Invalidate queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: analyticsQueryKey });
    });

    // Subscribe to tracking events for real-time updates
    const unsubscribeTracking = on('tracking_event', (event: EmailTrackingEvent) => {
      console.log('Received tracking event:', event);
      
      // Update metrics based on event type
      setRealtimeMetrics(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          lastUpdated: new Date().toISOString(),
          liveEvents: prev.liveEvents + 1
        };
      });

      // Optimistically update analytics data
      queryClient.setQueryData(analyticsQueryKey, (oldData: AnalyticsData | undefined) => {
        if (!oldData) return oldData;

        // Update recent events
        const updatedRecentEvents = [event, ...oldData.recentEvents.slice(0, 9)];

        // Update summary based on event type
        let updatedSummary = { ...oldData.summary };
        switch (event.event_type) {
          case 'open':
            updatedSummary.total_opens += 1;
            updatedSummary.open_rate = (updatedSummary.total_opens / updatedSummary.emails_delivered) * 100;
            break;
          case 'click':
            updatedSummary.total_clicks += 1;
            updatedSummary.click_rate = (updatedSummary.total_clicks / updatedSummary.emails_delivered) * 100;
            break;
          case 'reply':
            updatedSummary.replies_received += 1;
            updatedSummary.reply_rate = (updatedSummary.replies_received / updatedSummary.emails_delivered) * 100;
            break;
        }

        return {
          ...oldData,
          summary: updatedSummary,
          recentEvents: updatedRecentEvents
        };
      });
    });

    // Subscribe to campaign-specific events if campaign ID is provided
    if (params.campaignId) {
      emit('subscribe_campaign_analytics', { campaignId: params.campaignId });
    }

    // Subscribe to organization-wide events
    if (params.organizationId) {
      emit('subscribe_organization_analytics', { organizationId: params.organizationId });
    }

    return () => {
      unsubscribeAnalytics();
      unsubscribeTracking();
      
      if (params.campaignId) {
        emit('unsubscribe_campaign_analytics', { campaignId: params.campaignId });
      }
      if (params.organizationId) {
        emit('unsubscribe_organization_analytics', { organizationId: params.organizationId });
      }
    };
  }, [isConnected, params.campaignId, params.organizationId, on, off, emit, queryClient, analyticsQueryKey]);

  // Connection status updates
  useEffect(() => {
    const unsubscribeConnect = on('connect', () => {
      setConnectionStatus('connected');
    });

    const unsubscribeDisconnect = on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    const unsubscribeReconnect = on('reconnect', () => {
      setConnectionStatus('connected');
    });

    const unsubscribeReconnecting = on('reconnecting', () => {
      setConnectionStatus('reconnecting');
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeReconnect();
      unsubscribeReconnecting();
    };
  }, [on]);

  // Export functionality
  const exportData = useCallback(async (
    timeRange: string, 
    campaignId?: string,
    format: 'csv' | 'json' | 'excel' = 'csv'
  ) => {
    try {
      const searchParams = new URLSearchParams({
        timeRange,
        format,
        ...(campaignId && campaignId !== 'all' && { campaignId }),
      });

      const response = await fetch(`/api/analytics/export?${searchParams}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Handle file download
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `analytics-export-${timeRange}-${Date.now()}.${format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    refetchAnalytics();
    queryClient.invalidateQueries({ queryKey: campaignAnalyticsQueryKey });
  }, [refetchAnalytics, queryClient, campaignAnalyticsQueryKey]);

  // Calculate loading state
  const isLoading = analyticsLoading || campaignAnalyticsLoading;
  
  // Combine errors
  const error = analyticsError?.message || campaignAnalyticsError?.message || null;

  return {
    // Data
    analytics,
    campaignAnalytics,
    realtimeMetrics,
    
    // States
    isLoading,
    error,
    connectionStatus,
    
    // Actions
    refresh,
    exportData,
    
    // WebSocket status
    isConnected
  };
};

export default useAnalytics;