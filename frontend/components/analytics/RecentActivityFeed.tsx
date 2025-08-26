'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  MousePointer, 
  Reply, 
  Mail, 
  XCircle, 
  CheckCircle,
  Clock,
  User,
  ExternalLink,
  Filter,
  RefreshCw
} from 'lucide-react';
import { EmailTrackingEvent } from '@/types/email-tracking';

interface RecentActivityFeedProps {
  activities: EmailTrackingEvent[];
  limit?: number;
  showFilters?: boolean;
  onActivityClick?: (activity: EmailTrackingEvent) => void;
  onRefresh?: () => void;
  isLive?: boolean;
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  limit = 10,
  showFilters = true,
  onActivityClick,
  onRefresh,
  isLive = false
}) => {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(limit);

  // Filter activities
  const filteredActivities = activities.filter(activity => 
    eventTypeFilter === 'all' || activity.event_type === eventTypeFilter
  ).slice(0, visibleCount);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'open':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'click':
        return <MousePointer className="w-4 h-4 text-green-600" />;
      case 'reply':
        return <Reply className="w-4 h-4 text-purple-600" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'bounce':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'sent':
        return <Mail className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'click':
        return 'bg-green-100 text-green-800';
      case 'reply':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'bounce':
        return 'bg-red-100 text-red-800';
      case 'sent':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventDescription = (activity: EmailTrackingEvent) => {
    const time = new Date(activity.created_at).toLocaleTimeString();
    
    switch (activity.event_type) {
      case 'open':
        return {
          title: 'Email Opened',
          description: `Opened at ${time}`,
          details: activity.device_type ? `on ${activity.device_type}` : undefined
        };
      case 'click':
        return {
          title: 'Link Clicked',
          description: `Clicked at ${time}`,
          details: activity.clicked_url ? `URL: ${activity.clicked_url.slice(0, 50)}...` : undefined
        };
      case 'reply':
        return {
          title: 'Reply Received',
          description: `Replied at ${time}`,
          details: activity.reply_sentiment ? `Sentiment: ${activity.reply_sentiment}` : undefined
        };
      case 'delivered':
        return {
          title: 'Email Delivered',
          description: `Delivered at ${time}`,
          details: undefined
        };
      case 'bounce':
        return {
          title: 'Email Bounced',
          description: `Bounced at ${time}`,
          details: activity.event_data?.bounce_reason || undefined
        };
      case 'sent':
        return {
          title: 'Email Sent',
          description: `Sent at ${time}`,
          details: undefined
        };
      default:
        return {
          title: 'Unknown Event',
          description: `Occurred at ${time}`,
          details: undefined
        };
    }
  };

  const getLocationInfo = (activity: EmailTrackingEvent) => {
    if (activity.city && activity.country_code) {
      return `${activity.city}, ${activity.country_code}`;
    }
    if (activity.country_code) {
      return activity.country_code;
    }
    return null;
  };

  const eventTypes = ['all', 'open', 'click', 'reply', 'delivered', 'bounce', 'sent'];
  const eventCounts = eventTypes.reduce((acc, type) => {
    acc[type] = type === 'all' 
      ? activities.length 
      : activities.filter(a => a.event_type === type).length;
    return acc;
  }, {} as Record<string, number>);

  if (!activities.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No recent activity</p>
            <p className="text-gray-400 text-sm">Activity will appear as emails are sent and engaged with</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">LIVE</span>
            </div>
          )}
          <span className="text-sm text-gray-600">
            Showing {filteredActivities.length} of {activities.length} events
          </span>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {eventTypes.map((type) => (
            <Button
              key={type}
              variant={eventTypeFilter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEventTypeFilter(type)}
              className="h-7 whitespace-nowrap"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
              {eventCounts[type] > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {eventCounts[type]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity, index) => {
              const eventInfo = formatEventDescription(activity);
              const location = getLocationInfo(activity);
              
              return (
                <div 
                  key={`${activity.id}-${index}`}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    onActivityClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onActivityClick?.(activity)}
                >
                  <div className="flex items-start gap-3">
                    {/* Event Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getEventIcon(activity.event_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {eventInfo.title}
                          </h4>
                          <Badge className={getEventColor(activity.event_type)}>
                            {activity.event_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        {eventInfo.description}
                      </p>

                      {/* Additional Details */}
                      {(eventInfo.details || location || activity.email_subject) && (
                        <div className="mt-2 space-y-1">
                          {activity.email_subject && (
                            <div className="text-xs text-gray-500">
                              <strong>Subject:</strong> {activity.email_subject.slice(0, 60)}
                              {activity.email_subject.length > 60 ? '...' : ''}
                            </div>
                          )}
                          {eventInfo.details && (
                            <div className="text-xs text-gray-500">
                              {eventInfo.details}
                            </div>
                          )}
                          {location && (
                            <div className="text-xs text-gray-500">
                              <strong>Location:</strong> {location}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Device and Client Info */}
                      {(activity.device_type || activity.email_client || activity.browser_name) && (
                        <div className="flex gap-2 mt-2">
                          {activity.device_type && (
                            <Badge variant="outline" className="text-xs">
                              {activity.device_type}
                            </Badge>
                          )}
                          {activity.email_client && (
                            <Badge variant="outline" className="text-xs">
                              {activity.email_client}
                            </Badge>
                          )}
                          {activity.browser_name && (
                            <Badge variant="outline" className="text-xs">
                              {activity.browser_name}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {onActivityClick && (
                      <div className="flex-shrink-0">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {visibleCount < activities.length && (
            <div className="p-4 border-t border-gray-100">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setVisibleCount(prev => prev + limit)}
                className="w-full"
              >
                Load More ({activities.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {eventCounts.open}
                </div>
                <div className="text-xs text-gray-600">Opens</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {eventCounts.click}
                </div>
                <div className="text-xs text-gray-600">Clicks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4 text-purple-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {eventCounts.reply}
                </div>
                <div className="text-xs text-gray-600">Replies</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {eventCounts.bounce}
                </div>
                <div className="text-xs text-gray-600">Bounces</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecentActivityFeed;