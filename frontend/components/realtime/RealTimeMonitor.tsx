/**
 * Real-Time Monitor Component
 * 
 * Demonstrates comprehensive usage of WebSocket hooks for:
 * - Connection management and health monitoring
 * - Real-time billing updates and alerts
 * - Campaign progress tracking
 * - Error notifications and recovery
 * 
 * This component serves as both a functional dashboard and a reference
 * implementation for integrating real-time features.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useBillingWebSocket } from '../../hooks/useBillingWebSocket';

interface CampaignProgress {
  campaignId: string;
  name: string;
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage: string;
  };
  status: string;
  timestamp: string;
}

interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  dismissable: boolean;
}

export const RealTimeMonitor: React.FC = () => {
  const {
    isConnected,
    connectionError,
    metrics,
    on,
    off,
    subscribeToCampaign,
    unsubscribeFromCampaign
  } = useWebSocket();

  const {
    isConnected: billingConnected,
    currentUsage,
    subscriptionStatus,
    billingAlerts,
    hasUsageLimitReached,
    getUsagePercentage,
    dismissAlert
  } = useBillingWebSocket();

  // Local state for real-time data
  const [campaignProgress, setCampaignProgress] = useState<Map<string, CampaignProgress>>(new Map());
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [subscribedCampaigns, setSubscribedCampaigns] = useState<Set<string>>(new Set());

  /**
   * Handle campaign progress updates
   */
  const handleCampaignProgress = useCallback((data: any) => {
    setCampaignProgress(prev => {
      const newProgress = new Map(prev);
      newProgress.set(data.campaignId, {
        campaignId: data.campaignId,
        name: data.data?.description || `Campaign ${data.campaignId}`,
        progress: data.data?.progress || data.progress,
        status: data.data?.status || data.status,
        timestamp: data.timestamp
      });
      return newProgress;
    });
  }, []);

  /**
   * Handle campaign status changes
   */
  const handleCampaignStatus = useCallback((data: any) => {
    // Update campaign progress with status change
    setCampaignProgress(prev => {
      const newProgress = new Map(prev);
      const existing = newProgress.get(data.campaignId);
      if (existing) {
        newProgress.set(data.campaignId, {
          ...existing,
          status: data.status,
          timestamp: data.timestamp
        });
      }
      return newProgress;
    });

    // Add notification for significant status changes
    if (['active', 'completed', 'failed', 'paused'].includes(data.status)) {
      const notification: SystemNotification = {
        id: `campaign_${data.campaignId}_${Date.now()}`,
        type: data.status === 'failed' ? 'error' : 
              data.status === 'completed' ? 'success' : 'info',
        title: 'Campaign Status Update',
        message: data.message || `Campaign ${data.status}`,
        timestamp: data.timestamp,
        dismissable: true
      };

      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    }
  }, []);

  /**
   * Handle system notifications
   */
  const handleSystemNotification = useCallback((data: any) => {
    const notification: SystemNotification = {
      id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.severity === 'error' ? 'error' : 
            data.severity === 'warning' ? 'warning' : 'info',
      title: data.title || 'System Notification',
      message: data.message,
      timestamp: data.timestamp,
      dismissable: true
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
  }, []);

  /**
   * Handle error notifications
   */
  const handleErrorNotification = useCallback((data: any) => {
    const notification: SystemNotification = {
      id: `error_${data.id || Date.now()}`,
      type: 'error',
      title: data.title || 'Error Notification',
      message: data.message,
      timestamp: data.timestamp,
      dismissable: true
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
  }, []);

  /**
   * Subscribe to a campaign for progress updates
   */
  const subscribeToCampaignProgress = useCallback((campaignId: string) => {
    if (!subscribedCampaigns.has(campaignId)) {
      subscribeToCampaign(campaignId);
      setSubscribedCampaigns(prev => new Set([...prev, campaignId]));
    }
  }, [subscribeToCampaign, subscribedCampaigns]);

  /**
   * Unsubscribe from campaign progress updates
   */
  const unsubscribeFromCampaignProgress = useCallback((campaignId: string) => {
    if (subscribedCampaigns.has(campaignId)) {
      unsubscribeFromCampaign(campaignId);
      setSubscribedCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  }, [unsubscribeFromCampaign, subscribedCampaigns]);

  /**
   * Dismiss a notification
   */
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  /**
   * Get connection status color
   */
  const getConnectionStatusColor = (connected: boolean, error: any) => {
    if (error) return 'text-red-500';
    return connected ? 'text-green-500' : 'text-yellow-500';
  };

  /**
   * Get usage status color
   */
  const getUsageStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-500';
    if (percentage >= 80) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeFunctions = [
      on('campaign_progress', handleCampaignProgress),
      on('campaign_progress_detailed', handleCampaignProgress),
      on('campaign_status', handleCampaignStatus),
      on('campaign_status_detailed', handleCampaignStatus),
      on('system_notification', handleSystemNotification),
      on('error_notification', handleErrorNotification),
      on('server_metrics', (data) => {
        console.debug('📊 Server metrics:', data);
      }),
      on('progress_batch', (data) => {
        // Handle batched progress updates
        data.events?.forEach((event: any) => {
          if (event.type === 'progress_update') {
            handleCampaignProgress(event);
          }
        });
      })
    ];

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [
    isConnected,
    on,
    handleCampaignProgress,
    handleCampaignStatus,
    handleSystemNotification,
    handleErrorNotification
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Real-Time System Monitor</h2>
        
        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">WebSocket</span>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <p className={`text-lg font-semibold ${getConnectionStatusColor(isConnected, connectionError)}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
            {connectionError && (
              <p className="text-xs text-red-500 mt-1">{connectionError.message}</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Billing</span>
              <div className={`w-3 h-3 rounded-full ${billingConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <p className={`text-lg font-semibold ${getConnectionStatusColor(billingConnected, null)}`}>
              {billingConnected ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Latency</span>
              <span className="text-xs text-gray-500">ms</span>
            </div>
            <p className={`text-lg font-semibold ${metrics.latency > 200 ? 'text-red-500' : metrics.latency > 100 ? 'text-yellow-500' : 'text-green-500'}`}>
              {metrics.latency || 0}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Events</span>
              <span className="text-xs text-gray-500">total</span>
            </div>
            <p className="text-lg font-semibold text-blue-600">
              {metrics.totalEvents || 0}
            </p>
          </div>
        </div>

        {/* Usage Monitoring */}
        {currentUsage.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Current Usage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUsage.map((usage) => (
                <div key={`${usage.metric}_${usage.period}`} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {usage.metric.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{usage.period}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold">{usage.current}</span>
                    <span className="text-sm text-gray-500">/ {usage.limit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        usage.percentage >= 100 ? 'bg-red-500' :
                        usage.percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                    />
                  </div>
                  <p className={`text-sm font-medium mt-1 ${getUsageStatusColor(usage.percentage)}`}>
                    {usage.percentage.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Progress */}
        {campaignProgress.size > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Campaign Progress</h3>
            <div className="space-y-3">
              {Array.from(campaignProgress.values()).map((campaign) => (
                <div key={campaign.campaignId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{campaign.name}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                        campaign.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {campaign.status}
                      </span>
                      <button
                        onClick={() => unsubscribeFromCampaignProgress(campaign.campaignId)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Unsubscribe
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {campaign.progress.current} / {campaign.progress.total} ({campaign.progress.stage})
                    </span>
                    <span className="text-sm font-medium">
                      {campaign.progress.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(campaign.progress.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Updated: {new Date(campaign.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Alerts */}
        {billingAlerts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Billing Alerts</h3>
            <div className="space-y-2">
              {billingAlerts.map((alert, index) => (
                <div key={`${alert.organizationId}_${alert.timestamp}_${index}`} 
                     className={`p-3 rounded-lg border-l-4 ${
                       alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                       alert.severity === 'error' ? 'bg-red-50 border-red-400' :
                       alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                       'bg-blue-50 border-blue-400'
                     }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissAlert(index)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">System Notifications</h3>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} 
                     className={`p-3 rounded-lg border-l-4 ${
                       notification.type === 'error' ? 'bg-red-50 border-red-500' :
                       notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                       notification.type === 'success' ? 'bg-green-50 border-green-400' :
                       'bg-blue-50 border-blue-400'
                     }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {notification.dismissable && (
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Subscription Control */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Campaign Monitoring</h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Enter Campaign ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const campaignId = (e.target as HTMLInputElement).value.trim();
                  if (campaignId) {
                    subscribeToCampaignProgress(campaignId);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <span className="text-sm text-gray-500">Press Enter to subscribe</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Subscribed to {subscribedCampaigns.size} campaigns
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitor;