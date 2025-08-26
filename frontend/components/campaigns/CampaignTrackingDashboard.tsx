'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity,
  Eye,
  MousePointer,
  Reply,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Globe,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import { useTrackingConfiguration } from '@/hooks/useTrackingConfiguration'
import type { 
  CampaignTrackingOverview, 
  TrackingAnalyticsSummary,
  GeographicInsight,
  DeviceInsight 
} from '@/types/email-tracking'

interface CampaignTrackingDashboardProps {
  campaignId?: string
  showGlobalMetrics?: boolean
  className?: string
}

function MetricCard({ 
  icon: Icon, 
  title, 
  value, 
  change, 
  changeType, 
  subtitle 
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string | number
  change?: string | number
  changeType?: 'positive' | 'negative' | 'neutral'
  subtitle?: string
}) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = () => {
    switch (changeType) {
      case 'positive': return <TrendingUp className="h-3 w-3" />
      case 'negative': return <TrendingDown className="h-3 w-3" />
      default: return null
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Icon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 ${getChangeColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{change}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TrackingHealthIndicator({ status }: { status: 'healthy' | 'warning' | 'error' | 'unknown' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-100',
          label: 'Healthy'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600 bg-yellow-100',
          label: 'Warning'
        }
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-600 bg-red-100',
          label: 'Issues'
        }
      default:
        return {
          icon: Activity,
          color: 'text-gray-600 bg-gray-100',
          label: 'Unknown'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${config.color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}

function LocationInsight({ locations }: { locations: GeographicInsight[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900 flex items-center">
        <Globe className="h-4 w-4 mr-2" />
        Top Locations
      </h4>
      <div className="space-y-2">
        {locations.slice(0, 5).map((location, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{location.name}</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-purple-600 h-1 rounded-full"
                  style={{ width: `${location.percentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 w-8">
                {Math.round(location.percentage)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeviceInsight({ devices }: { devices: DeviceInsight[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900 flex items-center">
        <Smartphone className="h-4 w-4 mr-2" />
        Device Breakdown
      </h4>
      <div className="space-y-2">
        {devices.slice(0, 3).map((device, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">{device.device_type}</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full"
                  style={{ width: `${device.percentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 w-8">
                {Math.round(device.percentage)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CampaignTrackingDashboard({
  campaignId,
  showGlobalMetrics = false,
  className
}: CampaignTrackingDashboardProps) {
  const {
    getCampaignTrackingStatus,
    campaignTrackingStatuses,
    getRealtimeMetrics,
    isLoading,
    error
  } = useTrackingConfiguration()

  const [realtimeMetrics, setRealtimeMetrics] = React.useState<any>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  // Load data on mount and set up refresh interval
  React.useEffect(() => {
    const loadData = async () => {
      if (campaignId) {
        try {
          await getCampaignTrackingStatus(campaignId)
          const metrics = await getRealtimeMetrics(campaignId)
          setRealtimeMetrics(metrics)
          setLastUpdated(new Date())
        } catch (error) {
          console.error('Failed to load tracking data:', error)
        }
      }
    }

    loadData()

    // Set up refresh interval for real-time updates
    const interval = setInterval(loadData, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [campaignId, getCampaignTrackingStatus, getRealtimeMetrics])

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Tracking Data Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const trackingStatus = campaignId ? campaignTrackingStatuses[campaignId] : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {campaignId ? 'Campaign' : 'Global'} Tracking Overview
          </h3>
          {lastUpdated && (
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <Clock className="h-4 w-4 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {trackingStatus && (
          <div className="flex items-center space-x-3">
            <TrackingHealthIndicator status={trackingStatus.trackingHealth} />
            {trackingStatus.isTrackingActive && (
              <Badge className="bg-green-100 text-green-800">
                <Zap className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Eye}
          title="Open Rate"
          value={`${trackingStatus?.openRate.toFixed(1) || 0}%`}
          change={12.5}
          changeType="positive"
          subtitle={`${trackingStatus?.totalEvents || 0} total events`}
        />
        
        <MetricCard
          icon={MousePointer}
          title="Click Rate"
          value={`${trackingStatus?.clickRate.toFixed(1) || 0}%`}
          change={-2.3}
          changeType="negative"
          subtitle="Last 24 hours"
        />
        
        <MetricCard
          icon={Reply}
          title="Reply Rate"
          value={`${trackingStatus?.replyRate.toFixed(1) || 0}%`}
          change={8.1}
          changeType="positive"
          subtitle="Positive sentiment: 75%"
        />
        
        <MetricCard
          icon={TrendingDown}
          title="Bounce Rate"
          value={`${trackingStatus?.bounceRate.toFixed(1) || 0}%`}
          change={-1.2}
          changeType="positive"
          subtitle="Health score: Good"
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Geographic Distribution</span>
            </CardTitle>
            <CardDescription>
              Email engagement by location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocationInsight locations={[
              { name: 'United States', count: 150, percentage: 35 },
              { name: 'Canada', count: 80, percentage: 20 },
              { name: 'United Kingdom', count: 60, percentage: 15 },
              { name: 'Germany', count: 50, percentage: 12 },
              { name: 'Australia', count: 40, percentage: 10 }
            ]} />
          </CardContent>
        </Card>

        {/* Device Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Device Analytics</span>
            </CardTitle>
            <CardDescription>
              How recipients engage by device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceInsight devices={[
              { device_type: 'mobile', count: 200, percentage: 60 },
              { device_type: 'desktop', count: 100, percentage: 30 },
              { device_type: 'tablet', count: 33, percentage: 10 }
            ]} />
          </CardContent>
        </Card>
      </div>

      {/* Tracking Issues */}
      {trackingStatus?.trackingErrors && trackingStatus.trackingErrors.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Tracking Issues</span>
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Issues that may affect tracking accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trackingStatus.trackingErrors.map((error, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-yellow-800">{error}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Detailed Analytics
        </Button>
        <Button variant="outline" size="sm">
          Export Report
        </Button>
        <Button variant="outline" size="sm">
          Configure Tracking
        </Button>
      </div>
    </div>
  )
}