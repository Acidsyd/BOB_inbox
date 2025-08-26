'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  Reply, 
  Mail,
  Calendar,
  Users,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  openRate: number;
  clickRate: number;
  replyRate: number;
  sentCount: number;
  deliveredCount?: number;
  bounceRate?: number;
  unsubscribeRate?: number;
  createdAt?: string;
  lastActivity?: string;
  tags?: string[];
}

interface CampaignPerformanceTableProps {
  campaigns: Campaign[];
  timeRange: string;
  onCampaignClick?: (campaignId: string) => void;
}

type SortField = 'name' | 'openRate' | 'clickRate' | 'replyRate' | 'sentCount' | 'status';
type SortDirection = 'asc' | 'desc';

const CampaignPerformanceTable: React.FC<CampaignPerformanceTableProps> = ({
  campaigns,
  timeRange,
  onCampaignClick
}) => {
  const [sortField, setSortField] = useState<SortField>('openRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sort campaigns
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'name') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'desc') {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });

  // Filter campaigns by status
  const filteredCampaigns = sortedCampaigns.filter(campaign => 
    statusFilter === 'all' || campaign.status === statusFilter
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (rate: number, type: 'open' | 'click' | 'reply') => {
    const thresholds = {
      open: { good: 25, fair: 15 },
      click: { good: 3, fair: 1 },
      reply: { good: 5, fair: 2 }
    };

    const threshold = thresholds[type];
    
    if (rate >= threshold.good) return 'text-green-600';
    if (rate >= threshold.fair) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium justify-start hover:bg-transparent"
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (!campaigns.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No campaigns found</p>
            <p className="text-gray-400 text-sm">Create your first campaign to see performance data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter by status:</span>
          <div className="flex items-center gap-1">
            {['all', 'active', 'paused', 'completed', 'draft'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="h-7"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {filteredCampaigns.length} campaigns
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {campaigns.filter(c => c.status === 'active').length}
                </div>
                <div className="text-xs text-gray-600">Active Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {(campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Avg Open Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-purple-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {(campaigns.reduce((sum, c) => sum + c.clickRate, 0) / campaigns.length).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Avg Click Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4 text-yellow-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {(campaigns.reduce((sum, c) => sum + c.replyRate, 0) / campaigns.length).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Avg Reply Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <SortButton field="name">Campaign</SortButton>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <SortButton field="status">Status</SortButton>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <SortButton field="sentCount">Sent</SortButton>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <SortButton field="openRate">Open Rate</SortButton>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <SortButton field="clickRate">Click Rate</SortButton>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <SortButton field="replyRate">Reply Rate</SortButton>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Performance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 max-w-48 truncate">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {campaign.id}
                        </div>
                        {campaign.tags && campaign.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {campaign.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {campaign.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{campaign.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(campaign.sentCount)}
                      </div>
                      {campaign.deliveredCount && (
                        <div className="text-xs text-gray-500">
                          {formatNumber(campaign.deliveredCount)} delivered
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className={`text-sm font-medium ${getPerformanceColor(campaign.openRate, 'open')}`}>
                        {campaign.openRate.toFixed(1)}%
                      </div>
                      <div className="w-16 mt-1">
                        <Progress value={Math.min(campaign.openRate, 100)} className="h-1" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`text-sm font-medium ${getPerformanceColor(campaign.clickRate, 'click')}`}>
                        {campaign.clickRate.toFixed(1)}%
                      </div>
                      <div className="w-16 mt-1">
                        <Progress value={Math.min(campaign.clickRate * 10, 100)} className="h-1" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`text-sm font-medium ${getPerformanceColor(campaign.replyRate, 'reply')}`}>
                        {campaign.replyRate.toFixed(1)}%
                      </div>
                      <div className="w-16 mt-1">
                        <Progress value={Math.min(campaign.replyRate * 5, 100)} className="h-1" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {campaign.openRate >= 25 && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                        {campaign.clickRate >= 3 && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                        {campaign.replyRate >= 5 && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                        <span className="text-xs text-gray-500 ml-1">
                          {[
                            campaign.openRate >= 25,
                            campaign.clickRate >= 3,
                            campaign.replyRate >= 5
                          ].filter(Boolean).length}/3
                        </span>
                      </div>
                      {campaign.lastActivity && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last: {new Date(campaign.lastActivity).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCampaignClick?.(campaign.id)}
                        className="h-8"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Insights</CardTitle>
          <CardDescription>
            Key observations from your campaign performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Top Performer</span>
              </div>
              {filteredCampaigns.length > 0 && (
                <div>
                  <p className="text-sm text-green-800">
                    <strong>{filteredCampaigns[0].name}</strong> has the highest {sortField === 'openRate' ? 'open' : sortField === 'clickRate' ? 'click' : 'reply'} rate at{' '}
                    <strong>
                      {sortField === 'openRate' ? filteredCampaigns[0].openRate.toFixed(1) :
                       sortField === 'clickRate' ? filteredCampaigns[0].clickRate.toFixed(1) :
                       filteredCampaigns[0].replyRate.toFixed(1)}%
                    </strong>
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Volume Leader</span>
              </div>
              {filteredCampaigns.length > 0 && (
                <div>
                  <p className="text-sm text-blue-800">
                    Total of <strong>{formatNumber(campaigns.reduce((sum, c) => sum + c.sentCount, 0))}</strong> emails sent across all campaigns
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignPerformanceTable;