'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Mail,
  Server,
  Eye,
  Activity,
  BarChart3,
  RefreshCw
} from 'lucide-react';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DeliverabilityData {
  deliveryRate: number;
  bounceRate: number;
  spamRate: number;
  reputationScore: number;
  trends: Array<{
    date: string;
    deliveryRate: number;
    bounceRate: number;
    spamRate: number;
    reputationScore: number;
  }>;
  providers?: Array<{
    provider: string;
    deliveryRate: number;
    bounceRate: number;
    reputation: number;
    volume: number;
  }>;
  domains?: Array<{
    domain: string;
    deliveryRate: number;
    bounceRate: number;
    reputation: number;
    issues: string[];
  }>;
  bounceTypes?: Array<{
    type: 'hard' | 'soft';
    count: number;
    percentage: number;
    reasons: string[];
  }>;
}

interface DeliverabilityMonitorProps {
  data?: DeliverabilityData;
  timeRange: string;
  onRefresh?: () => void;
}

const DeliverabilityMonitor: React.FC<DeliverabilityMonitorProps> = ({
  data,
  timeRange,
  onRefresh
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'providers' | 'domains'>('overview');

  // Mock data if no data provided
  const mockData: DeliverabilityData = {
    deliveryRate: 94.2,
    bounceRate: 3.1,
    spamRate: 2.7,
    reputationScore: 87,
    trends: [
      { date: '2024-01-01', deliveryRate: 92.1, bounceRate: 4.2, spamRate: 3.7, reputationScore: 83 },
      { date: '2024-01-02', deliveryRate: 93.5, bounceRate: 3.8, spamRate: 2.7, reputationScore: 85 },
      { date: '2024-01-03', deliveryRate: 94.2, bounceRate: 3.1, spamRate: 2.7, reputationScore: 87 },
      { date: '2024-01-04', deliveryRate: 93.8, bounceRate: 3.5, spamRate: 2.7, reputationScore: 86 },
      { date: '2024-01-05', deliveryRate: 94.2, bounceRate: 3.1, spamRate: 2.7, reputationScore: 87 }
    ],
    providers: [
      { provider: 'Gmail', deliveryRate: 96.2, bounceRate: 2.1, reputation: 89, volume: 1250 },
      { provider: 'Outlook', deliveryRate: 92.8, bounceRate: 4.2, reputation: 85, volume: 890 },
      { provider: 'Yahoo', deliveryRate: 91.5, bounceRate: 5.1, reputation: 82, volume: 456 },
      { provider: 'Apple', deliveryRate: 94.7, bounceRate: 3.2, reputation: 88, volume: 234 }
    ],
    domains: [
      { domain: 'gmail.com', deliveryRate: 96.2, bounceRate: 2.1, reputation: 89, issues: [] },
      { domain: 'outlook.com', deliveryRate: 89.1, bounceRate: 6.8, reputation: 78, issues: ['High bounce rate', 'IP reputation'] },
      { domain: 'yahoo.com', deliveryRate: 91.5, bounceRate: 5.1, reputation: 82, issues: ['Domain reputation'] },
      { domain: 'company.com', deliveryRate: 87.3, bounceRate: 8.2, reputation: 75, issues: ['DKIM issues', 'SPF misconfiguration'] }
    ],
    bounceTypes: [
      { type: 'soft', count: 156, percentage: 67.2, reasons: ['Mailbox full', 'Temporary server issues', 'Rate limiting'] },
      { type: 'hard', count: 76, percentage: 32.8, reasons: ['Invalid email', 'Domain not found', 'User unknown'] }
    ]
  };

  const displayData = data || mockData;

  const colors = {
    delivery: '#10B981',
    bounce: '#EF4444',
    spam: '#F59E0B',
    reputation: '#3B82F6'
  };

  // Get health status based on metrics
  const getHealthStatus = () => {
    const { deliveryRate, bounceRate, spamRate, reputationScore } = displayData;
    
    if (deliveryRate >= 95 && bounceRate <= 2 && spamRate <= 1 && reputationScore >= 85) {
      return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    } else if (deliveryRate >= 90 && bounceRate <= 5 && spamRate <= 3 && reputationScore >= 75) {
      return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    } else if (deliveryRate >= 85 && bounceRate <= 8 && spamRate <= 5 && reputationScore >= 65) {
      return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    } else {
      return { status: 'poor', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    }
  };

  const healthStatus = getHealthStatus();

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
              {entry.value.toFixed(1)}%
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
        { key: 'overview' as const, label: 'Overview', icon: Activity },
        { key: 'trends' as const, label: 'Trends', icon: TrendingUp },
        { key: 'providers' as const, label: 'Providers', icon: Server },
        { key: 'domains' as const, label: 'Domains', icon: Mail }
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

  // Render trends chart
  const renderTrendsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={displayData.trends}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="deliveryRate" 
          stroke={colors.delivery} 
          strokeWidth={2}
          name="Delivery Rate"
        />
        <Line 
          type="monotone" 
          dataKey="bounceRate" 
          stroke={colors.bounce} 
          strokeWidth={2}
          name="Bounce Rate"
        />
        <Line 
          type="monotone" 
          dataKey="spamRate" 
          stroke={colors.spam} 
          strokeWidth={2}
          name="Spam Rate"
        />
        <Line 
          type="monotone" 
          dataKey="reputationScore" 
          stroke={colors.reputation} 
          strokeWidth={2}
          name="Reputation Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Deliverability Monitor</h3>
          <p className="text-gray-600">Track your sender reputation and email deliverability</p>
        </div>
        <div className="flex items-center gap-4">
          <ViewSelector />
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Health Status Alert */}
      <Alert className={`${healthStatus.bg} ${healthStatus.border}`}>
        <Shield className={`h-4 w-4 ${healthStatus.color}`} />
        <AlertDescription className={healthStatus.color}>
          <strong>Deliverability Status: {healthStatus.status.charAt(0).toUpperCase() + healthStatus.status.slice(1)}</strong>
          {healthStatus.status === 'excellent' && ' - Your email deliverability is performing exceptionally well.'}
          {healthStatus.status === 'good' && ' - Your email deliverability is performing well with room for minor improvements.'}
          {healthStatus.status === 'fair' && ' - Your email deliverability needs attention to prevent further issues.'}
          {healthStatus.status === 'poor' && ' - Your email deliverability requires immediate action to avoid being blocked.'}
        </AlertDescription>
      </Alert>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Metrics */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Deliverability Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Delivery Rate</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      displayData.deliveryRate >= 95 ? 'text-green-600' :
                      displayData.deliveryRate >= 90 ? 'text-blue-600' :
                      displayData.deliveryRate >= 85 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {displayData.deliveryRate.toFixed(1)}%
                    </div>
                    <Progress value={displayData.deliveryRate} className="w-20 h-2 mt-1" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Bounce Rate</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      displayData.bounceRate <= 2 ? 'text-green-600' :
                      displayData.bounceRate <= 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {displayData.bounceRate.toFixed(1)}%
                    </div>
                    <Progress value={displayData.bounceRate * 10} className="w-20 h-2 mt-1" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium">Spam Rate</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      displayData.spamRate <= 1 ? 'text-green-600' :
                      displayData.spamRate <= 3 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {displayData.spamRate.toFixed(1)}%
                    </div>
                    <Progress value={displayData.spamRate * 10} className="w-20 h-2 mt-1" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Reputation Score</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      displayData.reputationScore >= 85 ? 'text-green-600' :
                      displayData.reputationScore >= 75 ? 'text-blue-600' :
                      displayData.reputationScore >= 65 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {displayData.reputationScore}/100
                    </div>
                    <Progress value={displayData.reputationScore} className="w-20 h-2 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bounce Types */}
            {displayData.bounceTypes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bounce Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {displayData.bounceTypes.map((bounceType, index) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <XCircle className={`w-4 h-4 ${bounceType.type === 'hard' ? 'text-red-600' : 'text-yellow-600'}`} />
                            <span className="font-medium capitalize">{bounceType.type} Bounces</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{bounceType.count}</div>
                            <div className="text-xs text-gray-500">{bounceType.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <strong>Common reasons:</strong> {bounceType.reasons.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deliverability Trends</CardTitle>
              <CardDescription>
                Track your deliverability metrics over {timeRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTrendsChart()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Tab */}
      {activeView === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle>Deliverability Trends</CardTitle>
            <CardDescription>
              Historical deliverability performance over {timeRange}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderTrendsChart()}
          </CardContent>
        </Card>
      )}

      {/* Providers Tab */}
      {activeView === 'providers' && displayData.providers && (
        <Card>
          <CardHeader>
            <CardTitle>Provider Performance</CardTitle>
            <CardDescription>
              Deliverability performance by email provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayData.providers.map((provider, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{provider.provider}</h4>
                    <p className="text-sm text-gray-600">{provider.volume.toLocaleString()} emails sent</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-right">
                    <div>
                      <div className={`text-sm font-semibold ${
                        provider.deliveryRate >= 95 ? 'text-green-600' :
                        provider.deliveryRate >= 90 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {provider.deliveryRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Delivery</div>
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${
                        provider.bounceRate <= 2 ? 'text-green-600' :
                        provider.bounceRate <= 5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {provider.bounceRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Bounce</div>
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${
                        provider.reputation >= 85 ? 'text-green-600' :
                        provider.reputation >= 75 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {provider.reputation}/100
                      </div>
                      <div className="text-xs text-gray-500">Reputation</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domains Tab */}
      {activeView === 'domains' && displayData.domains && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Health</CardTitle>
            <CardDescription>
              Deliverability performance and issues by domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayData.domains.map((domain, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{domain.domain}</h4>
                      {domain.issues.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {domain.issues.map((issue, issueIndex) => (
                            <Badge key={issueIndex} variant="outline" className="text-xs">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right">
                      <div>
                        <div className={`text-sm font-semibold ${
                          domain.deliveryRate >= 95 ? 'text-green-600' :
                          domain.deliveryRate >= 90 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {domain.deliveryRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Delivery</div>
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${
                          domain.bounceRate <= 2 ? 'text-green-600' :
                          domain.bounceRate <= 5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {domain.bounceRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Bounce</div>
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${
                          domain.reputation >= 85 ? 'text-green-600' :
                          domain.reputation >= 75 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {domain.reputation}/100
                        </div>
                        <div className="text-xs text-gray-500">Reputation</div>
                      </div>
                    </div>
                  </div>
                  {domain.issues.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      No issues detected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliverabilityMonitor;