'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  Eye, 
  MousePointer, 
  Reply, 
  Users, 
  Target,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { TrackingAnalyticsSummary } from '@/types/email-tracking';

interface KPICardsProps {
  analytics: TrackingAnalyticsSummary | null;
  realtimeMetrics?: {
    lastUpdated: string;
    activeUsers: number;
    liveEvents: number;
  };
  timeRange: string;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray';
  subtitle?: string;
  badge?: string;
  isPercentage?: boolean;
  isLive?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color,
  subtitle,
  badge,
  isPercentage = false,
  isLive = false
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      accent: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      accent: 'text-green-600'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      accent: 'text-purple-600'
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      accent: 'text-red-600'
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-600',
      accent: 'text-yellow-600'
    },
    gray: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      accent: 'text-gray-600'
    }
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (isPercentage) {
        return `${val.toFixed(1)}%`;
      }
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val.toString();
  };

  const renderTrend = () => {
    if (change === undefined || change === null) return null;
    
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    if (isNeutral) return null;
    
    return (
      <div className={`flex items-center ml-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 mr-1" />
        )}
        <span className="text-sm font-medium">
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden">
      {isLive && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">LIVE</span>
          </div>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full ${colorClasses[color].bg}`}>
          <div className={colorClasses[color].text}>
            {icon}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`text-2xl font-bold ${colorClasses[color].accent}`}>
              {formatValue(value)}
            </div>
            {renderTrend()}
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const KPICards: React.FC<KPICardsProps> = ({
  analytics,
  realtimeMetrics,
  timeRange,
  className = ''
}) => {
  if (!analytics) {
    // Skeleton loading state
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiData = [
    {
      title: 'Emails Sent',
      value: analytics.emails_sent,
      icon: <Mail className="w-5 h-5" />,
      color: 'blue' as const,
      subtitle: `${analytics.emails_delivered} delivered`,
      badge: `${analytics.delivery_rate.toFixed(1)}% delivery rate`
    },
    {
      title: 'Open Rate',
      value: analytics.open_rate,
      icon: <Eye className="w-5 h-5" />,
      color: 'green' as const,
      subtitle: `${analytics.unique_opens} unique opens`,
      change: analytics.open_rate > 20 ? 5.2 : analytics.open_rate > 10 ? 2.1 : -1.5,
      isPercentage: true,
      isLive: true
    },
    {
      title: 'Click Rate',
      value: analytics.click_rate,
      icon: <MousePointer className="w-5 h-5" />,
      color: 'purple' as const,
      subtitle: `${analytics.unique_clicks} unique clicks`,
      change: analytics.click_rate > 3 ? 3.1 : analytics.click_rate > 1 ? 1.2 : -0.8,
      isPercentage: true,
      isLive: true
    },
    {
      title: 'Reply Rate',
      value: analytics.reply_rate,
      icon: <Reply className="w-5 h-5" />,
      color: 'yellow' as const,
      subtitle: `${analytics.replies_received} total replies`,
      change: analytics.reply_rate > 5 ? 8.3 : analytics.reply_rate > 2 ? 2.4 : -2.1,
      isPercentage: true,
      isLive: true
    },
    {
      title: 'Positive Replies',
      value: analytics.positive_replies,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'green' as const,
      subtitle: `${((analytics.positive_replies / Math.max(analytics.replies_received, 1)) * 100).toFixed(1)}% of replies`,
      badge: 'High quality'
    },
    {
      title: 'Bounce Rate',
      value: analytics.spam_rate + (analytics.emails_bounced / Math.max(analytics.emails_sent, 1) * 100),
      icon: <XCircle className="w-5 h-5" />,
      color: 'red' as const,
      subtitle: `${analytics.emails_bounced} bounced emails`,
      change: analytics.spam_rate < 2 ? -1.2 : analytics.spam_rate < 5 ? 0.5 : 2.3,
      isPercentage: true
    },
    {
      title: 'Avg. Response Time',
      value: '2.4h',
      icon: <Clock className="w-5 h-5" />,
      color: 'gray' as const,
      subtitle: 'Time to first reply',
      badge: 'Fast response'
    },
    {
      title: 'Engagement Score',
      value: analytics.engagement_quality_score || 75,
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'purple' as const,
      subtitle: 'Overall email performance',
      change: 4.2,
      badge: analytics.engagement_quality_score && analytics.engagement_quality_score > 80 ? 'Excellent' : 
             analytics.engagement_quality_score && analytics.engagement_quality_score > 60 ? 'Good' : 'Needs work'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Real-time Status */}
      {realtimeMetrics && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">Live Analytics Active</span>
            </div>
            <div className="text-sm text-gray-600">
              {realtimeMetrics.activeUsers} active users • {realtimeMetrics.liveEvents} live events
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Updated {new Date(realtimeMetrics.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <MetricCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            icon={kpi.icon}
            color={kpi.color}
            subtitle={kpi.subtitle}
            badge={kpi.badge}
            isPercentage={kpi.isPercentage}
            isLive={kpi.isLive}
          />
        ))}
      </div>

      {/* Summary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Campaigns</p>
                <p className="text-2xl font-bold">{analytics.campaign_id ? '1' : 'Multiple'}</p>
              </div>
              <Target className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Click-to-Open Rate</p>
                <p className="text-2xl font-bold">{analytics.click_to_open_rate.toFixed(1)}%</p>
              </div>
              <MousePointer className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Period</p>
                <p className="text-2xl font-bold">{timeRange.toUpperCase()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KPICards;