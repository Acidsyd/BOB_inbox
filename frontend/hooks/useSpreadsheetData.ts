'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Lead, 
  LeadsApiResponse, 
  FilterConfig, 
  SortConfig, 
  SpreadsheetError 
} from '@/types/spreadsheet';
import { applyFilters, applySorting } from '@/lib/spreadsheetUtils';

interface UseSpreadsheetDataProps {
  organizationId: string;
  initialFilters?: FilterConfig;
  initialSort?: SortConfig;
  pageSize?: number;
  enableRealTime?: boolean;
}

interface UseSpreadsheetDataReturn {
  // Data
  leads: Lead[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: SpreadsheetError | null;
  
  // Pagination
  hasNextPage: boolean;
  loadMore: () => void;
  
  // Filtering and Sorting
  filters: FilterConfig;
  sorting?: SortConfig;
  setFilters: (filters: FilterConfig) => void;
  setSorting: (sorting: SortConfig) => void;
  clearFilters: () => void;
  
  // Data Mutations
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  createLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  bulkUpdateLeads: (leadIds: string[], updates: any) => Promise<void>;
  
  // Refresh
  refresh: () => void;
  
  // Performance metrics
  lastLoadTime: number;
  filteredCount: number;
}

export const useSpreadsheetData = ({
  organizationId,
  initialFilters = { activeFilters: [], quickFilters: [], searchTerm: '' },
  initialSort,
  pageSize = 1000,
  enableRealTime = false
}: UseSpreadsheetDataProps): UseSpreadsheetDataReturn => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterConfig>(initialFilters);
  const [sorting, setSorting] = useState<SortConfig | undefined>(initialSort);
  const [error, setError] = useState<SpreadsheetError | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  const loadStartTime = useRef<number>(0);
  
  // Build query parameters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      page: '1'
    });
    
    // Add search term
    if (filters.searchTerm) {
      params.set('search', filters.searchTerm);
    }
    
    // Add column filters
    filters.activeFilters.forEach((filter, index) => {
      params.set(`filter[${index}][column]`, filter.columnId);
      params.set(`filter[${index}][operator]`, filter.operator);
      params.set(`filter[${index}][value]`, String(filter.value));
      if (filter.values) {
        params.set(`filter[${index}][values]`, JSON.stringify(filter.values));
      }
    });
    
    // Add sorting
    if (sorting) {
      params.set('sortBy', sorting.columnId);
      params.set('sortOrder', sorting.direction);
    }
    
    return params.toString();
  }, [filters, sorting, pageSize]);
  
  // Main data query
  const {
    data: queryData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['spreadsheet-leads', organizationId, buildQueryParams()],
    queryFn: async (): Promise<LeadsApiResponse> => {
      loadStartTime.current = performance.now();
      
      try {
        const response = await fetch(`/api/leads?${buildQueryParams()}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Record load time
        setLastLoadTime(performance.now() - loadStartTime.current);
        
        return data;
      } catch (error) {
        const spreadsheetError: SpreadsheetError = {
          type: 'network',
          message: error instanceof Error ? error.message : 'Failed to fetch leads',
          details: error,
          recoverable: true,
          timestamp: new Date()
        };
        
        setError(spreadsheetError);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: (failureCount, error) => {
      // Retry network errors up to 3 times
      if (failureCount < 3 && error instanceof Error) {
        return true;
      }
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: string; updates: Partial<Lead> }) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (updatedLead) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ['spreadsheet-leads', organizationId, buildQueryParams()],
        (oldData: LeadsApiResponse | undefined) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            leads: oldData.leads.map(lead => 
              lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
            )
          };
        }
      );
      
      // Clear any errors
      setError(null);
    },
    onError: (error) => {
      const spreadsheetError: SpreadsheetError = {
        type: 'data',
        message: error instanceof Error ? error.message : 'Failed to update lead',
        details: error,
        recoverable: true,
        timestamp: new Date()
      };
      setError(spreadsheetError);
    },
  });
  
  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lead),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create lead: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['spreadsheet-leads', organizationId]
      });
      setError(null);
    },
    onError: (error) => {
      const spreadsheetError: SpreadsheetError = {
        type: 'data',
        message: error instanceof Error ? error.message : 'Failed to create lead',
        details: error,
        recoverable: true,
        timestamp: new Date()
      };
      setError(spreadsheetError);
    },
  });
  
  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete lead: ${response.status}`);
      }
      
      return { id: leadId };
    },
    onSuccess: (deletedLead) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ['spreadsheet-leads', organizationId, buildQueryParams()],
        (oldData: LeadsApiResponse | undefined) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            leads: oldData.leads.filter(lead => lead.id !== deletedLead.id),
            total: oldData.total - 1
          };
        }
      );
      setError(null);
    },
    onError: (error) => {
      const spreadsheetError: SpreadsheetError = {
        type: 'data',
        message: error instanceof Error ? error.message : 'Failed to delete lead',
        details: error,
        recoverable: true,
        timestamp: new Date()
      };
      setError(spreadsheetError);
    },
  });
  
  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ leadIds, updates }: { leadIds: string[]; updates: any }) => {
      const response = await fetch('/api/leads/bulk/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds, updates }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to bulk update leads: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['spreadsheet-leads', organizationId]
      });
      setError(null);
    },
    onError: (error) => {
      const spreadsheetError: SpreadsheetError = {
        type: 'data',
        message: error instanceof Error ? error.message : 'Failed to bulk update leads',
        details: error,
        recoverable: true,
        timestamp: new Date()
      };
      setError(spreadsheetError);
    },
  });
  
  // Real-time updates via WebSocket
  useEffect(() => {
    if (!enableRealTime) return;
    
    const ws = new WebSocket(`ws://localhost:3001/ws/leads?org=${organizationId}`);
    
    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        
        if (update.type === 'lead_updated' || update.type === 'lead_created') {
          queryClient.setQueryData(
            ['spreadsheet-leads', organizationId, buildQueryParams()],
            (oldData: LeadsApiResponse | undefined) => {
              if (!oldData) return oldData;
              
              const existingLeadIndex = oldData.leads.findIndex(
                lead => lead.id === update.data.id
              );
              
              if (existingLeadIndex >= 0) {
                // Update existing lead
                const updatedLeads = [...oldData.leads];
                updatedLeads[existingLeadIndex] = { ...updatedLeads[existingLeadIndex], ...update.data };
                return { ...oldData, leads: updatedLeads };
              } else if (update.type === 'lead_created') {
                // Add new lead
                return {
                  ...oldData,
                  leads: [update.data, ...oldData.leads],
                  total: oldData.total + 1
                };
              }
              
              return oldData;
            }
          );
        } else if (update.type === 'lead_deleted') {
          queryClient.setQueryData(
            ['spreadsheet-leads', organizationId, buildQueryParams()],
            (oldData: LeadsApiResponse | undefined) => {
              if (!oldData) return oldData;
              
              return {
                ...oldData,
                leads: oldData.leads.filter(lead => lead.id !== update.data.id),
                total: oldData.total - 1
              };
            }
          );
        }
      } catch (error) {
        console.error('Error processing real-time update:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      const spreadsheetError: SpreadsheetError = {
        type: 'network',
        message: 'Real-time connection error',
        details: error,
        recoverable: true,
        timestamp: new Date()
      };
      setError(spreadsheetError);
    };
    
    return () => {
      ws.close();
    };
  }, [enableRealTime, organizationId, buildQueryParams, queryClient]);
  
  // Clear network errors when query succeeds
  useEffect(() => {
    if (!isError && error?.type === 'network') {
      setError(null);
    }
  }, [isError, error]);
  
  // Memoized return values
  const leads = queryData?.leads || [];
  const totalCount = queryData?.total || 0;
  const filteredCount = leads.length;
  
  const clearFilters = useCallback(() => {
    setFilters({ activeFilters: [], quickFilters: [], searchTerm: '' });
  }, []);
  
  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    await updateLeadMutation.mutateAsync({ leadId, updates });
  }, [updateLeadMutation]);
  
  const createLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createLeadMutation.mutateAsync(lead);
  }, [createLeadMutation]);
  
  const deleteLead = useCallback(async (leadId: string) => {
    await deleteLeadMutation.mutateAsync(leadId);
  }, [deleteLeadMutation]);
  
  const bulkUpdateLeads = useCallback(async (leadIds: string[], updates: any) => {
    await bulkUpdateMutation.mutateAsync({ leadIds, updates });
  }, [bulkUpdateMutation]);
  
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);
  
  const loadMore = useCallback(() => {
    // For now, load more is handled by increasing page size
    // In a real implementation, you'd implement pagination
    console.log('Load more functionality would be implemented here');
  }, []);
  
  return {
    // Data
    leads,
    totalCount,
    isLoading: isLoading || updateLeadMutation.isPending || createLeadMutation.isPending,
    isLoadingMore: false, // Would be implemented with pagination
    error,
    
    // Pagination
    hasNextPage: false, // Would be implemented with pagination
    loadMore,
    
    // Filtering and Sorting
    filters,
    sorting,
    setFilters,
    setSorting,
    clearFilters,
    
    // Data Mutations
    updateLead,
    createLead,
    deleteLead,
    bulkUpdateLeads,
    
    // Refresh
    refresh,
    
    // Performance metrics
    lastLoadTime,
    filteredCount
  };
};