'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  MapPin, 
  Users, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Reply,
  Filter,
  Download
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
  Legend
} from 'recharts';
import { GeographicInsight } from '@/types/email-tracking';

interface GeographicAnalyticsProps {
  data?: {
    countries: GeographicInsight[];
    regions: GeographicInsight[];
    cities?: Array<{
      name: string;
      country: string;
      count: number;
      percentage: number;
      engagement: {
        opens: number;
        clicks: number;
        replies: number;
      };
    }>;
    timezones?: Array<{
      timezone: string;
      count: number;
      bestEngagementTime: string;
      openRate: number;
    }>;
  };
  timeRange: string;
}

type ViewType = 'countries' | 'regions' | 'cities' | 'timezones';
type MetricType = 'opens' | 'clicks' | 'replies' | 'all';

const GeographicAnalytics: React.FC<GeographicAnalyticsProps> = ({
  data,
  timeRange
}) => {
  const [activeView, setActiveView] = useState<ViewType>('countries');
  const [activeMetric, setActiveMetric] = useState<MetricType>('all');

  // Color palette for charts
  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'];

  // Mock data if no data provided
  const mockData = {
    countries: [
      { name: 'United States', count: 245, percentage: 45.2 },
      { name: 'United Kingdom', count: 89, percentage: 16.4 },
      { name: 'Canada', count: 67, percentage: 12.3 },
      { name: 'Australia', count: 43, percentage: 7.9 },
      { name: 'Germany', count: 38, percentage: 7.0 },
      { name: 'France', count: 28, percentage: 5.2 },
      { name: 'Netherlands', count: 18, percentage: 3.3 },
      { name: 'Others', count: 14, percentage: 2.7 }
    ],
    regions: [
      { name: 'North America', count: 312, percentage: 57.5 },
      { name: 'Europe', count: 156, percentage: 28.8 },
      { name: 'Asia Pacific', count: 52, percentage: 9.6 },
      { name: 'Others', count: 22, percentage: 4.1 }
    ],
    cities: [
      { name: 'New York', country: 'United States', count: 67, percentage: 12.3, engagement: { opens: 45, clicks: 12, replies: 5 } },
      { name: 'London', country: 'United Kingdom', count: 52, percentage: 9.6, engagement: { opens: 38, clicks: 8, replies: 3 } },
      { name: 'Toronto', country: 'Canada', count: 34, percentage: 6.3, engagement: { opens: 28, clicks: 6, replies: 2 } },
      { name: 'San Francisco', country: 'United States', count: 31, percentage: 5.7, engagement: { opens: 24, clicks: 7, replies: 4 } },
      { name: 'Sydney', country: 'Australia', count: 25, percentage: 4.6, engagement: { opens: 18, clicks: 4, replies: 2 } }
    ],
    timezones: [
      { timezone: 'EST (UTC-5)', count: 156, bestEngagementTime: '10:00 AM', openRate: 24.5 },
      { timezone: 'PST (UTC-8)', count: 98, bestEngagementTime: '2:00 PM', openRate: 22.1 },
      { timezone: 'GMT (UTC+0)', count: 89, bestEngagementTime: '9:00 AM', openRate: 26.3 },
      { timezone: 'CET (UTC+1)', count: 67, bestEngagementTime: '11:00 AM', openRate: 21.8 },
      { timezone: 'AEST (UTC+10)', count: 43, bestEngagementTime: '8:00 AM', openRate: 23.7 }
    ]
  };

  const displayData = data || mockData;

  // Custom tooltip for charts
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
              {entry.value.toLocaleString()} ({entry.payload.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render country/region distribution pie chart
  const renderDistributionChart = () => {
    const chartData = activeView === 'countries' ? displayData.countries : displayData.regions;
    const topData = chartData.slice(0, 6);
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={topData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="count"
            label={({ name, percentage }) => `${name}: ${percentage}%`}
            labelLine={false}
          >
            {topData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Render engagement by location bar chart
  const renderEngagementChart = () => {
    if (!displayData.cities) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={displayData.cities.slice(0, 5)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="engagement.opens" fill="#3B82F6" name="Opens" radius={[2, 2, 0, 0]} />
          <Bar dataKey="engagement.clicks" fill="#10B981" name="Clicks" radius={[2, 2, 0, 0]} />
          <Bar dataKey="engagement.replies" fill="#8B5CF6" name="Replies" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // View selector
  const ViewSelector = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {[
        { key: 'countries' as ViewType, label: 'Countries', icon: Globe },
        { key: 'regions' as ViewType, label: 'Regions', icon: MapPin },
        { key: 'cities' as ViewType, label: 'Cities', icon: Users },
        { key: 'timezones' as ViewType, label: 'Timezones', icon: TrendingUp }
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

  // Top locations list
  const renderTopLocationsList = () => {
    let locations: any[] = [];
    let titleText = '';

    switch (activeView) {
      case 'countries':
        locations = displayData.countries;
        titleText = 'Top Countries';
        break;
      case 'regions':
        locations = displayData.regions;
        titleText = 'Top Regions';
        break;
      case 'cities':
        locations = displayData.cities || [];
        titleText = 'Top Cities';
        break;
      case 'timezones':
        locations = displayData.timezones || [];
        titleText = 'Top Timezones';
        break;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5" />
            {titleText}
          </CardTitle>
          <CardDescription>
            Engagement breakdown by {activeView}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locations.slice(0, 10).map((location, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{location.name}</h4>
                    {activeView === 'cities' && (
                      <p className="text-sm text-gray-500">{location.country}</p>
                    )}
                    {activeView === 'timezones' && (
                      <p className="text-sm text-gray-500">Best time: {location.bestEngagementTime}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {location.count.toLocaleString()}
                    </span>
                    {activeView === 'timezones' ? (
                      <Badge variant="secondary">
                        {location.openRate}% open rate
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {location.percentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  {activeView === 'cities' && location.engagement && (
                    <div className="flex gap-1 mt-1">
                      <span className="text-xs text-blue-600">{location.engagement.opens}o</span>
                      <span className="text-xs text-green-600">{location.engagement.clicks}c</span>
                      <span className="text-xs text-purple-600">{location.engagement.replies}r</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // World map placeholder (simplified representation)
  const renderWorldMap = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Engagement Heatmap
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Map
          </Button>
        </CardTitle>
        <CardDescription>
          Global distribution of email engagement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-b from-blue-50 to-green-50 rounded-lg p-8 text-center">
          <Globe className="w-24 h-24 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive World Map</h3>
          <p className="text-gray-600 mb-4">
            Visualize engagement patterns across different countries and regions
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span>High Engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span>Medium Engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span>Low Engagement</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Timezone analysis
  const renderTimezoneAnalysis = () => {
    if (!displayData.timezones) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Timezone Performance
          </CardTitle>
          <CardDescription>
            Best engagement times across different timezones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayData.timezones.map((tz, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{tz.timezone}</h4>
                  <p className="text-sm text-gray-600">Best engagement: {tz.bestEngagementTime}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{tz.count}</div>
                  <div className="text-sm text-gray-600">{tz.openRate}% open rate</div>
                </div>
                <div className="w-24">
                  <Progress value={tz.openRate} className="h-2" />
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
          <h3 className="text-xl font-semibold text-gray-900">Geographic Analytics</h3>
          <p className="text-gray-600">Track engagement patterns across different locations</p>
        </div>
        <ViewSelector />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Chart */}
        {(activeView === 'countries' || activeView === 'regions') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {activeView === 'countries' ? 'Country' : 'Region'} Distribution
              </CardTitle>
              <CardDescription>
                Percentage breakdown of engagement by {activeView}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDistributionChart()}
            </CardContent>
          </Card>
        )}

        {/* Engagement by Cities */}
        {activeView === 'cities' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                City Engagement Breakdown
              </CardTitle>
              <CardDescription>
                Opens, clicks, and replies by top cities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderEngagementChart()}
            </CardContent>
          </Card>
        )}

        {/* Top Locations List */}
        {renderTopLocationsList()}
      </div>

      {/* Additional Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* World Map */}
        {(activeView === 'countries' || activeView === 'regions') && renderWorldMap()}

        {/* Timezone Analysis */}
        {activeView === 'timezones' && renderTimezoneAnalysis()}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{displayData.countries.length}</div>
            <div className="text-sm text-gray-600">Countries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{displayData.regions.length}</div>
            <div className="text-sm text-gray-600">Regions</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{displayData.cities?.length || 0}</div>
            <div className="text-sm text-gray-600">Cities</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{displayData.timezones?.length || 0}</div>
            <div className="text-sm text-gray-600">Timezones</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GeographicAnalytics;