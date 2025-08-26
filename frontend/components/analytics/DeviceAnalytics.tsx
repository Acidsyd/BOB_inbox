'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Mail, 
  Chrome,
  Safari,
  Globe,
  TrendingUp,
  Eye,
  MousePointer,
  Reply,
  Filter,
  Download,
  BarChart3
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
  Line
} from 'recharts';
import { DeviceInsight, EmailClientInsight } from '@/types/email-tracking';

interface DeviceAnalyticsProps {
  data?: {
    types: DeviceInsight[];
    emailClients: EmailClientInsight[];
    browsers?: Array<{
      name: string;
      count: number;
      percentage: number;
      engagement: {
        opens: number;
        clicks: number;
        replies: number;
      };
    }>;
    operatingSystems?: Array<{
      name: string;
      count: number;
      percentage: number;
      versions: Array<{
        version: string;
        count: number;
      }>;
    }>;
    trends?: Array<{
      date: string;
      mobile: number;
      desktop: number;
      tablet: number;
    }>;
  };
  timeRange: string;
}

type ViewType = 'devices' | 'clients' | 'browsers' | 'os' | 'trends';
type ChartType = 'pie' | 'bar' | 'line';

const DeviceAnalytics: React.FC<DeviceAnalyticsProps> = ({
  data,
  timeRange
}) => {
  const [activeView, setActiveView] = useState<ViewType>('devices');
  const [chartType, setChartType] = useState<ChartType>('pie');

  // Color palette for charts
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'];

  // Mock data if no data provided
  const mockData = {
    types: [
      { device_type: 'mobile', count: 342, percentage: 56.2 },
      { device_type: 'desktop', count: 198, percentage: 32.5 },
      { device_type: 'tablet', count: 69, percentage: 11.3 }
    ],
    emailClients: [
      { client_name: 'Gmail', count: 287, percentage: 47.1 },
      { client_name: 'Outlook', count: 156, percentage: 25.6 },
      { client_name: 'Apple Mail', count: 89, percentage: 14.6 },
      { client_name: 'Yahoo Mail', count: 43, percentage: 7.1 },
      { client_name: 'Thunderbird', count: 21, percentage: 3.4 },
      { client_name: 'Others', count: 13, percentage: 2.2 }
    ],
    browsers: [
      { name: 'Chrome', count: 234, percentage: 38.4, engagement: { opens: 189, clicks: 45, replies: 18 } },
      { name: 'Safari', count: 167, percentage: 27.4, engagement: { opens: 134, clicks: 32, replies: 12 } },
      { name: 'Firefox', count: 89, percentage: 14.6, engagement: { opens: 67, clicks: 16, replies: 8 } },
      { name: 'Edge', count: 67, percentage: 11.0, engagement: { opens: 52, clicks: 12, replies: 5 } },
      { name: 'Opera', count: 32, percentage: 5.2, engagement: { opens: 24, clicks: 6, replies: 2 } },
      { name: 'Others', count: 20, percentage: 3.4, engagement: { opens: 15, clicks: 3, replies: 1 } }
    ],
    operatingSystems: [
      { 
        name: 'iOS', 
        count: 198, 
        percentage: 32.5, 
        versions: [
          { version: '16.x', count: 89 },
          { version: '15.x', count: 67 },
          { version: '14.x', count: 42 }
        ]
      },
      { 
        name: 'Windows', 
        count: 176, 
        percentage: 28.9, 
        versions: [
          { version: '11', count: 98 },
          { version: '10', count: 78 }
        ]
      },
      { 
        name: 'Android', 
        count: 134, 
        percentage: 22.0, 
        versions: [
          { version: '13', count: 56 },
          { version: '12', count: 43 },
          { version: '11', count: 35 }
        ]
      },
      { 
        name: 'macOS', 
        count: 89, 
        percentage: 14.6, 
        versions: [
          { version: 'Ventura', count: 45 },
          { version: 'Monterey', count: 32 },
          { version: 'Big Sur', count: 12 }
        ]
      },
      { name: 'Others', count: 12, percentage: 2.0, versions: [] }
    ],
    trends: [
      { date: '2024-01-01', mobile: 45, desktop: 35, tablet: 20 },
      { date: '2024-01-02', mobile: 48, desktop: 33, tablet: 19 },
      { date: '2024-01-03', mobile: 52, desktop: 30, tablet: 18 },
      { date: '2024-01-04', mobile: 54, desktop: 28, tablet: 18 },
      { date: '2024-01-05', mobile: 56, desktop: 28, tablet: 16 }
    ]
  };

  const displayData = data || mockData;

  // Device type icons
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  // Email client icons
  const getEmailClientIcon = (clientName: string) => {
    switch (clientName.toLowerCase()) {
      case 'gmail':
        return <Mail className="w-5 h-5 text-red-500" />;
      case 'outlook':
        return <Mail className="w-5 h-5 text-blue-500" />;
      case 'apple mail':
        return <Mail className="w-5 h-5 text-gray-500" />;
      default:
        return <Mail className="w-5 h-5" />;
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
              <span>{entry.name || entry.dataKey}</span>
            </div>
            <span className="font-medium">
              {typeof entry.value === 'number' ? 
                `${entry.value.toLocaleString()}${entry.payload?.percentage ? ` (${entry.payload.percentage.toFixed(1)}%)` : ''}` : 
                entry.value
              }
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
        { key: 'devices' as ViewType, label: 'Devices', icon: Smartphone },
        { key: 'clients' as ViewType, label: 'Email Clients', icon: Mail },
        { key: 'browsers' as ViewType, label: 'Browsers', icon: Chrome },
        { key: 'os' as ViewType, label: 'OS', icon: Monitor },
        { key: 'trends' as ViewType, label: 'Trends', icon: TrendingUp }
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

  // Chart type selector
  const ChartTypeSelector = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {[
        { key: 'pie' as ChartType, icon: BarChart3 },
        { key: 'bar' as ChartType, icon: BarChart3 },
        { key: 'line' as ChartType, icon: TrendingUp }
      ].map(({ key, icon: Icon }) => (
        <Button
          key={key}
          variant={chartType === key ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setChartType(key)}
          className="h-8 px-2"
        >
          <Icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );

  // Render device distribution chart
  const renderDeviceChart = () => {
    let chartData: any[] = [];
    
    switch (activeView) {
      case 'devices':
        chartData = displayData.types.map(item => ({
          name: item.device_type.charAt(0).toUpperCase() + item.device_type.slice(1),
          value: item.count,
          percentage: item.percentage
        }));
        break;
      case 'clients':
        chartData = displayData.emailClients.map(item => ({
          name: item.client_name,
          value: item.count,
          percentage: item.percentage
        }));
        break;
      case 'browsers':
        if (displayData.browsers) {
          chartData = displayData.browsers.map(item => ({
            name: item.name,
            value: item.count,
            percentage: item.percentage
          }));
        }
        break;
      case 'os':
        if (displayData.operatingSystems) {
          chartData = displayData.operatingSystems.map(item => ({
            name: item.name,
            value: item.count,
            percentage: item.percentage
          }));
        }
        break;
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill="#3B82F6" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  // Render trends chart
  const renderTrendsChart = () => {
    if (!displayData.trends) return null;

    const trendsData = displayData.trends.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trendsData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="mobile" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="Mobile"
          />
          <Line 
            type="monotone" 
            dataKey="desktop" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Desktop"
          />
          <Line 
            type="monotone" 
            dataKey="tablet" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            name="Tablet"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render detailed list
  const renderDetailedList = () => {
    let items: any[] = [];
    let titleText = '';

    switch (activeView) {
      case 'devices':
        items = displayData.types.map(item => ({
          name: item.device_type.charAt(0).toUpperCase() + item.device_type.slice(1),
          count: item.count,
          percentage: item.percentage,
          icon: getDeviceIcon(item.device_type)
        }));
        titleText = 'Device Types';
        break;
      case 'clients':
        items = displayData.emailClients.map(item => ({
          name: item.client_name,
          count: item.count,
          percentage: item.percentage,
          icon: getEmailClientIcon(item.client_name)
        }));
        titleText = 'Email Clients';
        break;
      case 'browsers':
        if (displayData.browsers) {
          items = displayData.browsers.map(item => ({
            name: item.name,
            count: item.count,
            percentage: item.percentage,
            engagement: item.engagement,
            icon: <Chrome className="w-5 h-5" />
          }));
        }
        titleText = 'Browsers';
        break;
      case 'os':
        if (displayData.operatingSystems) {
          items = displayData.operatingSystems.map(item => ({
            name: item.name,
            count: item.count,
            percentage: item.percentage,
            versions: item.versions,
            icon: <Monitor className="w-5 h-5" />
          }));
        }
        titleText = 'Operating Systems';
        break;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeView === 'devices' && <Smartphone className="w-5 h-5" />}
            {activeView === 'clients' && <Mail className="w-5 h-5" />}
            {activeView === 'browsers' && <Chrome className="w-5 h-5" />}
            {activeView === 'os' && <Monitor className="w-5 h-5" />}
            {titleText}
          </CardTitle>
          <CardDescription>
            Breakdown by {activeView}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    {item.versions && item.versions.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {item.versions.slice(0, 3).map((version: any, vIndex: number) => (
                          <Badge key={vIndex} variant="outline" className="text-xs">
                            {version.version}: {version.count}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {item.engagement && (
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-blue-600">{item.engagement.opens}o</span>
                        <span className="text-xs text-green-600">{item.engagement.clicks}c</span>
                        <span className="text-xs text-purple-600">{item.engagement.replies}r</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {item.count.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.percentage.toFixed(1)}%
                  </div>
                  <div className="w-20 mt-2">
                    <Progress value={item.percentage} className="h-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Device & Platform Analytics</h3>
          <p className="text-gray-600">Understand how your audience engages across different devices and platforms</p>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector />
          {activeView !== 'trends' && <ChartTypeSelector />}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {activeView === 'trends' ? 'Device Usage Trends' : `${activeView.charAt(0).toUpperCase() + activeView.slice(1)} Distribution`}
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
            <CardDescription>
              {activeView === 'trends' 
                ? `Device usage patterns over ${timeRange}` 
                : `Engagement breakdown by ${activeView}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeView === 'trends' ? renderTrendsChart() : renderDeviceChart()}
          </CardContent>
        </Card>

        {/* Detailed List */}
        {activeView !== 'trends' && renderDetailedList()}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Smartphone className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {displayData.types.find(t => t.device_type === 'mobile')?.percentage.toFixed(1) || '0.0'}%
            </div>
            <div className="text-sm text-gray-600">Mobile Usage</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Monitor className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {displayData.types.find(t => t.device_type === 'desktop')?.percentage.toFixed(1) || '0.0'}%
            </div>
            <div className="text-sm text-gray-600">Desktop Usage</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Tablet className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {displayData.types.find(t => t.device_type === 'tablet')?.percentage.toFixed(1) || '0.0'}%
            </div>
            <div className="text-sm text-gray-600">Tablet Usage</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Mail className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{displayData.emailClients.length}</div>
            <div className="text-sm text-gray-600">Email Clients</div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Insights */}
      {activeView === 'browsers' && displayData.browsers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Browser Engagement Analysis
            </CardTitle>
            <CardDescription>
              Detailed engagement metrics by browser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={displayData.browsers.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="engagement.opens" fill="#3B82F6" name="Opens" />
                <Bar dataKey="engagement.clicks" fill="#10B981" name="Clicks" />
                <Bar dataKey="engagement.replies" fill="#8B5CF6" name="Replies" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeviceAnalytics;