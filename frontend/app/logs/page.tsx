'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  CalendarIcon, 
  DownloadIcon, 
  SearchIcon, 
  FilterIcon,
  ClockIcon,
  UserIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MailIcon,
  ActivityIcon,
  RefreshCwIcon
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

interface LogEntry {
  log_type: 'email' | 'system';
  log_id: string;
  organization_id: string;
  user_id?: string;
  activity_type: string;
  title: string;
  description: string;
  resource_id?: string;
  resource_type?: string;
  details: any;
  event_source: string;
  correlation_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  success: boolean;
  error_message?: string;
  duration_ms?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface LogFilters {
  type?: 'email' | 'system';
  category?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  search?: string;
  resourceType?: string;
  activityType?: string;
  success?: boolean;
}

interface LogStats {
  timeframe: string;
  emailActivity: Array<{
    activity_type: string;
    count: number;
    day: string;
  }>;
  systemActivity: Array<{
    activity_category: string;
    activity_type: string;
    success: boolean;
    count: number;
    avg_duration: number;
    day: string;
  }>;
  topUsers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    activity_count: number;
  }>;
  errors: Array<{
    activity_type: string;
    error_code: string;
    count: number;
    last_occurrence: string;
  }>;
}

const ActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters and pagination
  const [filters, setFilters] = useState<LogFilters>({});
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    emailActivityTypes: string[];
    systemActivityTypes: string[];
    activityCategories: string[];
    resourceTypes: string[];
    users: Array<{ id: string; first_name: string; last_name: string; email: string }>;
  }>({
    emailActivityTypes: [],
    systemActivityTypes: [],
    activityCategories: [],
    resourceTypes: [],
    users: []
  });

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load logs with current filters
  const loadLogs = async (resetPage = false) => {
    if (resetPage) setPage(1);
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: resetPage ? '1' : page.toString(),
        limit: limit.toString(),
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      // Add filters to query
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/logs?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setTotal(data.pagination.total);
      } else {
        console.error('Failed to load logs:', data.error);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await fetch('/api/logs/stats?timeframe=7d');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/logs/filters');
      const data = await response.json();
      
      if (response.ok) {
        setFilterOptions(data);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  // Export logs
  const exportLogs = async (format: 'csv' | 'json' = 'csv') => {
    setExporting(true);
    try {
      const response = await fetch('/api/logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          ...filters,
          includeDetails: true
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // In production, this would trigger a file download
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: format === 'csv' ? 'text/csv' : 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-logs-${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
    } finally {
      setExporting(false);
    }
  };

  // Refresh logs
  const refreshLogs = async () => {
    setRefreshing(true);
    await loadLogs();
    await loadStats();
    setRefreshing(false);
  };

  // Auto-refresh handler
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 30000); // 30 seconds
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh]);

  // Load initial data
  useEffect(() => {
    loadLogs();
    loadStats();
    loadFilterOptions();
  }, [page, filters]);

  // Update filters and reload
  const updateFilter = (key: keyof LogFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    if (value === '' || value === undefined || value === 'all') {
      delete newFilters[key];
    }
    setFilters(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Get activity type icon
  const getActivityIcon = (type: string, logType: string) => {
    if (logType === 'email') {
      return <MailIcon className="w-4 h-4" />;
    }
    
    switch (type) {
      case 'user_login':
      case 'user_logout':
        return <UserIcon className="w-4 h-4" />;
      case 'error_occurred':
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return <ActivityIcon className="w-4 h-4" />;
    }
  };

  // Get status color
  const getStatusColor = (success: boolean, logType: string) => {
    if (logType === 'email') return 'bg-blue-100 text-blue-800';
    return success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  // Pagination
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-gray-600 mt-1">
            Monitor all system activities, email events, and user actions
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
          </Button>
          
          <Button variant="outline" onClick={refreshLogs} disabled={refreshing}>
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => exportLogs('csv')} disabled={exporting}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <MailIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {stats.emailActivity.reduce((sum, item) => sum + item.count, 0)}
                  </p>
                  <p className="text-xs text-gray-500">Email Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <ActivityIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {stats.systemActivity.filter(item => item.success).reduce((sum, item) => sum + item.count, 0)}
                  </p>
                  <p className="text-xs text-gray-500">System Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">
                    {stats.errors.reduce((sum, item) => sum + item.count, 0)}
                  </p>
                  <p className="text-xs text-gray-500">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold">{stats.topUsers.length}</p>
                  <p className="text-xs text-gray-500">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FilterIcon className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Log Type</label>
              <Select 
                value={filters.type || 'all'} 
                onValueChange={(value) => updateFilter('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Activity Type</label>
              <Select 
                value={filters.activityType || 'all'} 
                onValueChange={(value) => updateFilter('activityType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All activities</SelectItem>
                  {[...filterOptions.emailActivityTypes, ...filterOptions.systemActivityTypes]
                    .filter((type, index, arr) => arr.indexOf(type) === index)
                    .map(type => (
                      <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">User</label>
              <Select 
                value={filters.userId || 'all'} 
                onValueChange={(value) => updateFilter('userId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {filterOptions.users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                type="text"
                placeholder="Search logs..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              {Object.keys(filters).length > 0 && (
                <span>{Object.keys(filters).length} filter(s) active</span>
              )}
            </div>
            
            {Object.keys(filters).length > 0 && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <p className="text-sm text-gray-500">
            Showing {logs.length} of {total.toLocaleString()} entries
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCwIcon className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ActivityIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No activity logs found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={`${log.log_type}-${log.log_id}`}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-full ${getStatusColor(log.success, log.log_type)}`}>
                        {getActivityIcon(log.activity_type, log.log_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {log.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {log.log_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {log.activity_type.replace('_', ' ')}
                          </Badge>
                          {!log.success && (
                            <Badge variant="destructive" className="text-xs">
                              Error
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {log.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
                          </div>
                          
                          {log.user && (
                            <div className="flex items-center">
                              <UserIcon className="w-3 h-3 mr-1" />
                              {log.user.name || log.user.email}
                            </div>
                          )}
                          
                          {log.duration_ms && (
                            <div className="flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {log.duration_ms}ms
                            </div>
                          )}
                          
                          {log.resource_type && (
                            <div className="flex items-center">
                              <span>{log.resource_type}</span>
                            </div>
                          )}
                        </div>
                        
                        {log.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogPage;