'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Reply, 
  Mail,
  BarChart3,
  Activity,
  Calendar
} from 'lucide-react';

interface EngagementChartProps {
  data?: Array<{
    date: string;
    opens: number;
    clicks: number;
    replies: number;
    bounces: number;
    sent?: number;
    delivered?: number;
  }>;
  timeRange: string;
  detailed?: boolean;
  height?: number;
}

type ChartType = 'line' | 'area' | 'bar';
type MetricType = 'all' | 'opens' | 'clicks' | 'replies' | 'rates';

const EngagementChart: React.FC<EngagementChartProps> = ({
  data = [],
  timeRange,
  detailed = false,
  height = 300
}) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [activeMetric, setActiveMetric] = useState<MetricType>('all');
  const [showRates, setShowRates] = useState(false);

  // Process data to include rates
  const processedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(timeRange === '90d' ? { year: '2-digit' } : {})
    }),
    openRate: item.delivered ? (item.opens / item.delivered) * 100 : 0,
    clickRate: item.delivered ? (item.clicks / item.delivered) * 100 : 0,
    replyRate: item.delivered ? (item.replies / item.delivered) * 100 : 0,
    bounceRate: item.sent ? (item.bounces / item.sent) * 100 : 0
  }));

  const colors = {
    opens: '#3B82F6',
    clicks: '#10B981', 
    replies: '#8B5CF6',
    bounces: '#EF4444',
    sent: '#6B7280',
    delivered: '#059669'
  };

  const rateColors = {
    openRate: '#3B82F6',
    clickRate: '#10B981',
    replyRate: '#8B5CF6', 
    bounceRate: '#EF4444'
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize">{entry.dataKey.replace(/([A-Z])/g, ' $1')}</span>
            </div>
            <span className="font-medium">
              {entry.dataKey.includes('Rate') ? 
                `${entry.value.toFixed(1)}%` : 
                entry.value.toLocaleString()
              }
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Chart type selector
  const ChartTypeSelector = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {(['line', 'area', 'bar'] as ChartType[]).map((type) => (
        <Button
          key={type}
          variant={chartType === type ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setChartType(type)}
          className="h-8"
        >
          {type === 'line' && <Activity className="w-4 h-4" />}
          {type === 'area' && <TrendingUp className="w-4 h-4" />}
          {type === 'bar' && <BarChart3 className="w-4 h-4" />}
        </Button>
      ))}
    </div>
  );

  // Metric selector
  const MetricSelector = () => (
    <div className="flex items-center gap-2">
      {[
        { key: 'all' as MetricType, label: 'All Metrics', icon: BarChart3 },
        { key: 'opens' as MetricType, label: 'Opens', icon: Eye },
        { key: 'clicks' as MetricType, label: 'Clicks', icon: MousePointer },
        { key: 'replies' as MetricType, label: 'Replies', icon: Reply }
      ].map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={activeMetric === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveMetric(key)}
          className="h-8"
        >
          <Icon className="w-4 h-4 mr-1" />
          {label}
        </Button>
      ))}
    </div>
  );

  // Chart statistics
  const getStatistics = () => {
    if (!processedData.length) return null;

    const totalOpens = processedData.reduce((sum, item) => sum + item.opens, 0);
    const totalClicks = processedData.reduce((sum, item) => sum + item.clicks, 0);
    const totalReplies = processedData.reduce((sum, item) => sum + item.replies, 0);
    const avgOpenRate = processedData.reduce((sum, item) => sum + item.openRate, 0) / processedData.length;
    const avgClickRate = processedData.reduce((sum, item) => sum + item.clickRate, 0) / processedData.length;

    return {
      totalOpens,
      totalClicks,
      totalReplies,
      avgOpenRate,
      avgClickRate
    };
  };

  const stats = getStatistics();

  // Render chart based on type
  const renderChart = () => {
    if (!processedData.length) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No engagement data available</p>
            <p className="text-gray-400 text-sm">Data will appear once campaigns start receiving engagement</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      data: processedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const renderLines = () => {
      if (showRates) {
        return (
          <>
            {(activeMetric === 'all' || activeMetric === 'opens') && (
              <Line
                type="monotone"
                dataKey="openRate"
                stroke={rateColors.openRate}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {(activeMetric === 'all' || activeMetric === 'clicks') && (
              <Line
                type="monotone"
                dataKey="clickRate"
                stroke={rateColors.clickRate}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {(activeMetric === 'all' || activeMetric === 'replies') && (
              <Line
                type="monotone"
                dataKey="replyRate"
                stroke={rateColors.replyRate}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
          </>
        );
      }

      return (
        <>
          {(activeMetric === 'all' || activeMetric === 'opens') && (
            <Line
              type="monotone"
              dataKey="opens"
              stroke={colors.opens}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          {(activeMetric === 'all' || activeMetric === 'clicks') && (
            <Line
              type="monotone"
              dataKey="clicks"
              stroke={colors.clicks}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
          {(activeMetric === 'all' || activeMetric === 'replies') && (
            <Line
              type="monotone"
              dataKey="replies"
              stroke={colors.replies}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
        </>
      );
    };

    const renderAreas = () => {
      if (showRates) {
        return (
          <>
            {(activeMetric === 'all' || activeMetric === 'opens') && (
              <Area
                type="monotone"
                dataKey="openRate"
                stackId="1"
                stroke={rateColors.openRate}
                fill={rateColors.openRate}
                fillOpacity={0.6}
              />
            )}
            {(activeMetric === 'all' || activeMetric === 'clicks') && (
              <Area
                type="monotone"
                dataKey="clickRate"
                stackId="1"
                stroke={rateColors.clickRate}
                fill={rateColors.clickRate}
                fillOpacity={0.6}
              />
            )}
            {(activeMetric === 'all' || activeMetric === 'replies') && (
              <Area
                type="monotone"
                dataKey="replyRate"
                stackId="1"
                stroke={rateColors.replyRate}
                fill={rateColors.replyRate}
                fillOpacity={0.6}
              />
            )}
          </>
        );
      }

      return (
        <>
          {(activeMetric === 'all' || activeMetric === 'opens') && (
            <Area
              type="monotone"
              dataKey="opens"
              stackId="1"
              stroke={colors.opens}
              fill={colors.opens}
              fillOpacity={0.6}
            />
          )}
          {(activeMetric === 'all' || activeMetric === 'clicks') && (
            <Area
              type="monotone"
              dataKey="clicks"
              stackId="1"
              stroke={colors.clicks}
              fill={colors.clicks}
              fillOpacity={0.6}
            />
          )}
          {(activeMetric === 'all' || activeMetric === 'replies') && (
            <Area
              type="monotone"
              dataKey="replies"
              stackId="1"
              stroke={colors.replies}
              fill={colors.replies}
              fillOpacity={0.6}
            />
          )}
        </>
      );
    };

    const renderBars = () => {
      const dataKey = showRates ? 
        (activeMetric === 'opens' ? 'openRate' : 
         activeMetric === 'clicks' ? 'clickRate' : 
         activeMetric === 'replies' ? 'replyRate' : 'openRate') :
        (activeMetric === 'opens' ? 'opens' : 
         activeMetric === 'clicks' ? 'clicks' : 
         activeMetric === 'replies' ? 'replies' : 'opens');

      const color = showRates ? 
        (activeMetric === 'opens' ? rateColors.openRate : 
         activeMetric === 'clicks' ? rateColors.clickRate : 
         activeMetric === 'replies' ? rateColors.replyRate : rateColors.openRate) :
        (activeMetric === 'opens' ? colors.opens : 
         activeMetric === 'clicks' ? colors.clicks : 
         activeMetric === 'replies' ? colors.replies : colors.opens);

      return <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />;
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              stroke="#666"
              tickFormatter={(value) => showRates ? `${value}%` : value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {renderLines()}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              stroke="#666"
              tickFormatter={(value) => showRates ? `${value}%` : value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {renderAreas()}
            {detailed && <Brush dataKey="date" height={30} stroke={colors.opens} />}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              stroke="#666"
              tickFormatter={(value) => showRates ? `${value}%` : value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {renderBars()}
          </BarChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <ChartTypeSelector />
          {detailed && <MetricSelector />}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showRates ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRates(!showRates)}
          >
            {showRates ? 'Show Counts' : 'Show Rates'}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Eye className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-xs font-medium">Total Opens</span>
              </div>
              <p className="text-lg font-bold text-blue-600">{stats.totalOpens.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{stats.avgOpenRate.toFixed(1)}% avg rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <MousePointer className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-xs font-medium">Total Clicks</span>
              </div>
              <p className="text-lg font-bold text-green-600">{stats.totalClicks.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{stats.avgClickRate.toFixed(1)}% avg rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Reply className="w-4 h-4 text-purple-600 mr-1" />
                <span className="text-xs font-medium">Total Replies</span>
              </div>
              <p className="text-lg font-bold text-purple-600">{stats.totalReplies.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default EngagementChart;