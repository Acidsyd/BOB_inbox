'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth/context'
import { 
  Lead, 
  LeadsResponse, 
  LeadFilters, 
  LeadSorting, 
  UseLeadsParams,
  BulkUpdateRequest,
  BulkUpdateResponse,
  LeadStats
} from '../types/leads'

/**
 * Return type for useLeads hook
 */
interface UseLeadsReturn {
  /** Array of leads from current query */
  leads: Lead[]
  /** Whether data is currently loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Pagination information */
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  /** Current filters applied */
  filters: LeadFilters
  /** Current sorting configuration */
  sorting: LeadSorting
  /** Function to refetch data */
  refetch: () => Promise<void>
  /** Function to change page */
  setPage: (page: number) => void
  /** Function to change items per page */
  setLimit: (limit: number) => void
  /** Function to update filters */
  setFilters: (filters: Partial<LeadFilters>) => void
  /** Function to update sorting */
  setSorting: (sorting: Partial<LeadSorting>) => void
  /** Function to clear all filters */
  clearFilters: () => void
  /** Function to perform bulk updates */
  bulkUpdate: (request: BulkUpdateRequest) => Promise<BulkUpdateResponse | null>
  /** Whether bulk update is in progress */
  isBulkUpdating: boolean
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50
const DEFAULT_SORTING: LeadSorting = {
  sortBy: 'created_at',
  sortOrder: 'desc'
}

/**
 * Custom hook for managing leads data with pagination, filtering, and sorting
 * Includes optimized debouncing, error handling, and cleanup
 */
export function useLeads(initialParams: UseLeadsParams = {}): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  
  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // State for pagination, filters, and sorting
  const [page, setPageState] = useState(initialParams.page || DEFAULT_PAGE)
  const [limit, setLimitState] = useState(initialParams.limit || DEFAULT_LIMIT)
  const [filters, setFiltersState] = useState<LeadFilters>(initialParams.filters || {})
  const [sorting, setSortingState] = useState<LeadSorting>(initialParams.sorting || DEFAULT_SORTING)
  
  // Pagination info from API response
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const pagination = useMemo(() => ({
    page,
    limit,
    total,
    totalPages
  }), [page, limit, total, totalPages])

  const fetchLeads = useCallback(async (showLoading = true) => {
    if (!user?.organizationId) {
      setIsLoading(false)
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      params.append('sortBy', sorting.sortBy)
      params.append('sortOrder', sorting.sortOrder)

      // Add filters
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.campaignId) params.append('campaignId', filters.campaignId)
      if (filters.leadListId) params.append('leadListId', filters.leadListId)
      if (filters.hasEmail !== undefined) params.append('hasEmail', filters.hasEmail.toString())
      if (filters.hasPhone !== undefined) params.append('hasPhone', filters.hasPhone.toString())
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await api.get(`/leads?${params.toString()}`, {
        signal: abortController.signal
      })
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return
      }
      
      const data: LeadsResponse = response.data

      setLeads(data.leads)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      
    } catch (err: any) {
      // Don't set error for aborted requests
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        return
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load leads'
      setError(errorMessage)
      console.error('Error fetching leads:', err)
    } finally {
      if (showLoading && !abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [user?.organizationId, page, limit, filters, sorting])

  const refetch = useCallback(async () => {
    await fetchLeads(true)
  }, [fetchLeads])

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage)
  }, [])

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit)
    setPageState(1) // Reset to first page when changing limit
  }, [])

  const setFilters = useCallback((newFilters: Partial<LeadFilters>) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    setFiltersState(prev => ({ ...prev, ...newFilters }))
    setPageState(1) // Reset to first page when filtering
  }, [])

  const setSorting = useCallback((newSorting: Partial<LeadSorting>) => {
    setSortingState(prev => ({ ...prev, ...newSorting }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState({})
    setPageState(1)
  }, [])

  const bulkUpdate = useCallback(async (request: BulkUpdateRequest): Promise<BulkUpdateResponse | null> => {
    if (!user?.organizationId || request.leadIds.length === 0) {
      return null
    }

    setIsBulkUpdating(true)
    try {
      const response = await api.put('/leads/bulk/update', request)
      const result: BulkUpdateResponse = response.data

      // Optimistically update the local state
      setLeads(prev => prev.map(lead => {
        if (request.leadIds.includes(lead.id)) {
          const updatedLead = result.leads.find(updated => updated.id === lead.id)
          if (updatedLead) {
            return {
              ...lead,
              status: updatedLead.status,
              campaign_id: updatedLead.campaign_id,
              updated_at: updatedLead.updated_at
            }
          }
        }
        return lead
      }))

      return result
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update leads'
      setError(errorMessage)
      console.error('Error in bulk update:', err)
      return null
    } finally {
      setIsBulkUpdating(false)
    }
  }, [user?.organizationId])

  // Fetch data when dependencies change
  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    leads,
    isLoading,
    error,
    pagination,
    filters,
    sorting,
    refetch,
    setPage,
    setLimit,
    setFilters,
    setSorting,
    clearFilters,
    bulkUpdate,
    isBulkUpdating
  }
}

/**
 * Hook for fetching lead statistics with proper cleanup
 */
export function useLeadStats() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user?.organizationId) {
      setIsLoading(false)
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await api.get('/leads/stats/summary', {
        signal: abortController.signal
      })
      
      if (!abortController.signal.aborted) {
        setStats(response.data)
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        return
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load lead statistics'
      setError(errorMessage)
      console.error('Error fetching lead stats:', err)
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [user?.organizationId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  }
}