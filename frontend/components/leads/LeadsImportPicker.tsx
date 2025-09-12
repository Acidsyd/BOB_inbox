'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LeadImport, 
  LeadImportsApiResponse, 
  LeadsImportPickerProps,
  ImportStatus 
} from '../types/spreadsheet';
import { cn } from '../../lib/utils';
import { 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Calendar,
  BarChart3,
  Download,
  Eye,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const LeadsImportPicker: React.FC<LeadsImportPickerProps> = ({
  onImportSelected,
  selectedImportId,
  organizationId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ImportStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'import_name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  
  // Fetch imports
  const {
    data: importsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lead-imports', organizationId, { searchTerm, statusFilter, sortBy, sortOrder, page }],
    queryFn: async (): Promise<LeadImportsApiResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder
      });
      
      if (searchTerm) {
        params.set('search', searchTerm);
      }
      
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      
      const response = await fetch(`/api/lead-imports?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 10000, // Refetch every 10 seconds for status updates
  });
  
  const imports = importsData?.imports || [];
  const totalCount = importsData?.total || 0;
  const hasNextPage = page < (importsData?.totalPages || 1);
  
  // Get status badge props
  const getStatusBadge = useCallback((status: ImportStatus) => {
    switch (status) {
      case 'pending':
        return { 
          icon: Clock, 
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Pending'
        };
      case 'processing':
        return { 
          icon: RefreshCw, 
          className: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
          label: 'Processing'
        };
      case 'completed':
        return { 
          icon: CheckCircle, 
          className: 'bg-green-100 text-green-800 border-green-200',
          label: 'Completed'
        };
      case 'failed':
        return { 
          icon: XCircle, 
          className: 'bg-red-100 text-red-800 border-red-200',
          label: 'Failed'
        };
      case 'cancelled':
        return { 
          icon: AlertCircle, 
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Cancelled'
        };
      default:
        return { 
          icon: Clock, 
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          label: status
        };
    }
  }, []);
  
  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);
  
  // Format date
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);
  
  // Handle import selection
  const handleImportClick = useCallback((importData: LeadImport) => {
    onImportSelected(importData.id);
  }, [onImportSelected]);
  
  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page
  }, []);
  
  // Handle filter change
  const handleStatusFilter = useCallback((status: ImportStatus | 'all') => {
    setStatusFilter(status);
    setPage(1); // Reset to first page
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Lead Imports</h3>
          <p className="text-sm text-gray-600">
            Select a lead import to view in the spreadsheet
          </p>
        </div>
        <Button onClick={() => refetch()} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search imports by name or filename..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value as ImportStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            {/* Sort */}
            <div className="flex items-center gap-2">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'created_at' | 'updated_at' | 'import_name');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="import_name-asc">Name A-Z</option>
                <option value="import_name-desc">Name Z-A</option>
                <option value="updated_at-desc">Recently Updated</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-gray-600">Total Imports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {imports.filter(imp => imp.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {imports.filter(imp => imp.status === 'processing').length}
                </p>
                <p className="text-sm text-gray-600">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">
                  {imports.filter(imp => imp.status === 'failed').length}
                </p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Import List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Loading imports...</span>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Imports</h3>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : imports.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Imports Found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No imports match your current filters. Try adjusting your search or filters.' 
                  : 'Get started by importing your first lead list.'
                }
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Import Leads
              </Button>
            </CardContent>
          </Card>
        ) : (
          imports.map((importData) => {
            const statusBadge = getStatusBadge(importData.status);
            const StatusIcon = statusBadge.icon;
            const isSelected = selectedImportId === importData.id;
            
            return (
              <Card 
                key={importData.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  isSelected && "ring-2 ring-purple-500 bg-purple-50"
                )}
                onClick={() => handleImportClick(importData)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {importData.importName}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">
                            {importData.fileName} • {formatFileSize(importData.fileSize)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Stats Row */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          <span>
                            {importData.status === 'completed' 
                              ? `${importData.leadsImported} leads imported`
                              : importData.status === 'processing'
                              ? `${Math.round(importData.progressPercentage || 0)}% complete`
                              : `${importData.leadsTotal || 0} leads total`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(importData.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* Progress bar for processing imports */}
                      {importData.status === 'processing' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${importData.progressPercentage || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Error message for failed imports */}
                      {importData.status === 'failed' && importData.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          {importData.errorMessage}
                        </div>
                      )}
                    </div>
                    
                    {/* Status and Actions */}
                    <div className="flex items-center gap-3 ml-4">
                      <Badge className={statusBadge.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusBadge.label}
                      </Badge>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show actions menu
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Results Summary for completed imports */}
                  {importData.status === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-lg font-semibold text-green-600">
                            {importData.leadsImported}
                          </p>
                          <p className="text-xs text-gray-500">Imported</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-yellow-600">
                            {importData.leadsSkipped}
                          </p>
                          <p className="text-xs text-gray-500">Skipped</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-red-600">
                            {importData.leadsFailed}
                          </p>
                          <p className="text-xs text-gray-500">Failed</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-600">
                            {importData.leadsTotal}
                          </p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      {/* Pagination */}
      {hasNextPage && (
        <div className="flex justify-center pt-6">
          <Button 
            onClick={() => setPage(prev => prev + 1)}
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default LeadsImportPicker;