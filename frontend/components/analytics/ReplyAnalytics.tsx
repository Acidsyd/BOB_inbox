'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Reply, 
  ThumbsUp, 
  ThumbsDown, 
  Meh, 
  Clock, 
  User,
  TrendingUp,
  MessageCircle,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface ReplyAnalyticsData {
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
  responseTime?: {
    average: number;
    median: number;
    distribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
  };
  topReplies?: Array<{
    id: string;
    subject: string;
    content: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'ooo';
    category: string;
    receivedAt: string;
    leadName?: string;
    leadEmail?: string;
  }>;
}

interface ReplyAnalyticsProps {
  data?: ReplyAnalyticsData;
  timeRange: string;
  onReplyClick?: (replyId: string) => void;
}

const ReplyAnalytics: React.FC<ReplyAnalyticsProps> = ({
  data,
  timeRange,
  onReplyClick
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'sentiment' | 'categories' | 'timeline' | 'responses'>('overview');

  // Mock data if no data provided
  const mockData: ReplyAnalyticsData = {
    sentiment: {
      positive: 145,
      negative: 32,
      neutral: 89,
      ooo: 23
    },
    categories: [
      { category: 'Interested', count: 87, percentage: 30.1 },
      { category: 'Not Interested', count: 65, percentage: 22.5 },
      { category: 'Question', count: 43, percentage: 14.9 },
      { category: 'Meeting Request', count: 38, percentage: 13.1 },
      { category: 'Out of Office', count: 23, percentage: 8.0 },
      { category: 'Referral', count: 18, percentage: 6.2 },
      { category: 'Objection', count: 15, percentage: 5.2 }
    ],
    timeline: [
      { date: '2024-01-01', replies: 23, sentiment: 0.3 },
      { date: '2024-01-02', replies: 34, sentiment: 0.2 },
      { date: '2024-01-03', replies: 45, sentiment: 0.4 },
      { date: '2024-01-04', replies: 38, sentiment: 0.1 },
      { date: '2024-01-05', replies: 52, sentiment: 0.5 }
    ],
    responseTime: {
      average: 4.2,
      median: 2.1,
      distribution: [
        { range: '< 1 hour', count: 34, percentage: 11.8 },
        { range: '1-6 hours', count: 89, percentage: 30.8 },
        { range: '6-24 hours', count: 76, percentage: 26.3 },
        { range: '1-3 days', count: 54, percentage: 18.7 },
        { range: '> 3 days', count: 36, percentage: 12.4 }
      ]
    },
    topReplies: [
      {
        id: '1',
        subject: 'Re: Partnership Opportunity',
        content: 'Thanks for reaching out! This looks interesting. Can we schedule a call next week?',
        sentiment: 'positive',
        category: 'Meeting Request',
        receivedAt: '2024-01-05T10:30:00Z',
        leadName: 'John Smith',
        leadEmail: 'john@company.com'
      },
      {
        id: '2',
        subject: 'Re: Product Demo',
        content: 'Not interested at this time, but please keep us in mind for the future.',
        sentiment: 'negative',
        category: 'Not Interested',
        receivedAt: '2024-01-05T09:15:00Z',
        leadName: 'Sarah Johnson',
        leadEmail: 'sarah@business.com'
      }
    ]
  };

  const displayData = data || mockData;

  const colors = {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
    ooo: '#F59E0B'
  };

  // Calculate total replies
  const totalReplies = Object.values(displayData.sentiment).reduce((sum, count) => sum + count, 0);

  // Get sentiment icon
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <ThumbsDown className="w-4 h-4 text-red-600" />;
      case 'neutral':
        return <Meh className="w-4 h-4 text-gray-600" />;
      case 'ooo':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      case 'ooo':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-medium">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // View selector
  const ViewSelector = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {[
        { key: 'overview' as const, label: 'Overview', icon: TrendingUp },
        { key: 'sentiment' as const, label: 'Sentiment', icon: ThumbsUp },
        { key: 'categories' as const, label: 'Categories', icon: MessageCircle },
        { key: 'timeline' as const, label: 'Timeline', icon: Clock },
        { key: 'responses' as const, label: 'Responses', icon: Reply }
      ].map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={activeView === key ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView(key)}
          className="h-8"
        >
          <Icon className="w-4 h-4 mr-1" />
          {label}
        </Button>
      ))}
    </div>
  );

  // Render sentiment pie chart
  const renderSentimentChart = () => {
    const sentimentData = Object.entries(displayData.sentiment).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      percentage: (value / totalReplies) * 100,
      color: colors[key as keyof typeof colors]
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={sentimentData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
            labelLine={false}
          >
            {sentimentData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Render categories bar chart
  const renderCategoriesChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={displayData.categories}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="category" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  // Render timeline chart
  const renderTimelineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={displayData.timeline}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="replies" 
          stroke="#3B82F6" 
          fill="#3B82F6" 
          fillOpacity={0.6}
          name="Replies"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Reply Analytics</h3>
          <p className="text-gray-600">Analyze reply patterns, sentiment, and response times</p>
        </div>
        <ViewSelector />
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reply Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {totalReplies.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Replies</div>
                </div>

                <div className="space-y-3">
                  {Object.entries(displayData.sentiment).map(([sentiment, count]) => (
                    <div key={sentiment} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(sentiment)}
                        <span className="text-sm font-medium capitalize">{sentiment}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{count}</div>
                        <div className="text-xs text-gray-500">
                          {((count / totalReplies) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            {displayData.responseTime && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average</span>
                      <span className="font-semibold">{displayData.responseTime.average}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Median</span>
                      <span className="font-semibold">{displayData.responseTime.median}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sentiment Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sentiment Distribution</CardTitle>
              <CardDescription>
                Breakdown of reply sentiment over {timeRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSentimentChart()}
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reply Categories</CardTitle>
              <CardDescription>
                Top reply categories and their distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayData.categories.slice(0, 6).map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{category.category}</div>
                      <div className="w-32 mt-1">
                        <Progress value={category.percentage} className="h-2" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{category.count}</div>
                      <div className="text-xs text-gray-500">
                        {category.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sentiment Tab */}
      {activeView === 'sentiment' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of reply sentiment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderSentimentChart()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentiment Metrics</CardTitle>
              <CardDescription>
                Key sentiment indicators and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(displayData.sentiment).map(([sentiment, count]) => (
                  <div key={sentiment} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(sentiment)}
                        <span className="font-medium capitalize">{sentiment} Replies</span>
                      </div>
                      <Badge className={getSentimentColor(sentiment)}>
                        {count} ({((count / totalReplies) * 100).toFixed(1)}%)
                      </Badge>
                    </div>
                    <Progress 
                      value={(count / totalReplies) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categories Tab */}
      {activeView === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle>Reply Categories</CardTitle>
            <CardDescription>
              Distribution of reply types and categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderCategoriesChart()}
          </CardContent>
        </Card>
      )}

      {/* Timeline Tab */}
      {activeView === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Reply Timeline</CardTitle>
            <CardDescription>
              Reply volume and sentiment trends over {timeRange}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderTimelineChart()}
          </CardContent>
        </Card>
      )}

      {/* Responses Tab */}
      {activeView === 'responses' && displayData.topReplies && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Replies</CardTitle>
              <CardDescription>
                Latest replies received from your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayData.topReplies.map((reply) => (
                  <div 
                    key={reply.id}
                    className={`p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
                      onReplyClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onReplyClick?.(reply.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(reply.sentiment)}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {reply.subject}
                          </h4>
                          <p className="text-xs text-gray-600">
                            From {reply.leadName} ({reply.leadEmail})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSentimentColor(reply.sentiment)}>
                          {reply.category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.receivedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Response Time Distribution */}
          {displayData.responseTime && (
            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>
                  How quickly leads respond to your emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displayData.responseTime.distribution.map((timeRange, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{timeRange.range}</div>
                        <div className="w-32 mt-1">
                          <Progress value={timeRange.percentage} className="h-2" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{timeRange.count}</div>
                        <div className="text-xs text-gray-500">
                          {timeRange.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ThumbsUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {((displayData.sentiment.positive / totalReplies) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Positive Sentiment</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{displayData.categories.length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {displayData.responseTime?.average.toFixed(1) || '0.0'}h
            </div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Reply className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{totalReplies}</div>
            <div className="text-sm text-gray-600">Total Replies</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReplyAnalytics;