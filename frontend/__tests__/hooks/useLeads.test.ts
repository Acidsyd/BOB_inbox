/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useLeads, useLeadStats } from '@/hooks/useLeads'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/context'

// Mock dependencies
jest.mock('@/lib/api')

const mockApi = api as jest.Mocked<typeof api>

// Sample test data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  organizationId: 'org-1'
}

const mockLeadsResponse = {
  leads: [
    {
      id: '1',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Acme Corp',
      job_title: 'CEO',
      phone: '+1-555-0123',
      linkedin_url: null,
      status: 'active',
      data: {},
      campaign_id: 'campaign-1',
      campaign_name: 'Q1 Campaign',
      organization_id: 'org-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      list_name: 'Test List',
      extended_fields: {},
      emails_sent: 5,
      emails_opened: 3,
      replies: 1,
      last_activity: '2024-01-01T12:00:00Z'
    }
  ],
  total: 1,
  page: 1,
  limit: 50,
  totalPages: 1,
  filters: {},
  sorting: {
    sortBy: 'created_at',
    sortOrder: 'desc'
  }
}

const mockStatsResponse = {
  summary: {
    total_leads: 100,
    active_leads: 80,
    inactive_leads: 10,
    bounced_leads: 5,
    unsubscribed_leads: 3,
    responded_leads: 2,
    leads_with_email: 95,
    leads_with_phone: 60,
    leads_with_linkedin: 40,
    leads_added_last_week: 10,
    leads_added_last_month: 25
  },
  campaignDistribution: [
    { campaign_name: 'Q1 Campaign', lead_count: 50 },
    { campaign_name: 'Q2 Campaign', lead_count: 30 }
  ]
}

describe('useLeads Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock useAuth to return our test user
    ;(useAuth as jest.MockedFunction<typeof useAuth>).mockReturnValue({
      user: mockUser,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    })
  })

  describe('Data Fetching', () => {
    test('fetches leads successfully', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockLeadsResponse })

      const { result } = renderHook(() => useLeads())

      // Initially loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.leads).toEqual([])

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.leads).toEqual(mockLeadsResponse.leads)
      expect(result.current.pagination.total).toBe(1)
      expect(result.current.pagination.totalPages).toBe(1)
      expect(result.current.error).toBeNull()
    })

    test('handles API error', async () => {
      const errorMessage = 'Failed to fetch leads'
      mockApi.get.mockRejectedValueOnce({ 
        response: { data: { error: errorMessage } } 
      })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.leads).toEqual([])
    })

    test('handles network error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'))

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network Error')
    })

    test('does not fetch when user is not available', async () => {
      ;(useAuth as jest.MockedFunction<typeof useAuth>).mockReturnValue({
        user: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        isLoading: false
      })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApi.get).not.toHaveBeenCalled()
      expect(result.current.leads).toEqual([])
    })

    test('constructs correct API URL with parameters', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockLeadsResponse })

      const initialParams = {
        page: 2,
        limit: 25,
        filters: {
          search: 'john',
          status: 'active' as const,
          campaignId: 'campaign-1'
        },
        sorting: {
          sortBy: 'email' as const,
          sortOrder: 'asc' as const
        }
      }

      renderHook(() => useLeads(initialParams))

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalled()
      })

      const callArgs = mockApi.get.mock.calls[0][0] as string
      expect(callArgs).toContain('page=2')
      expect(callArgs).toContain('limit=25')
      expect(callArgs).toContain('search=john')
      expect(callArgs).toContain('status=active')
      expect(callArgs).toContain('campaignId=campaign-1')
      expect(callArgs).toContain('sortBy=email')
      expect(callArgs).toContain('sortOrder=asc')
    })
  })

  describe('Pagination', () => {
    test('setPage updates page and triggers refetch', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: { ...mockLeadsResponse, page: 2 } })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPage(2)
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2)
      })

      const secondCall = mockApi.get.mock.calls[1][0] as string
      expect(secondCall).toContain('page=2')
    })

    test('setLimit updates limit, resets page to 1, and triggers refetch', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: { ...mockLeadsResponse, limit: 100 } })

      const { result } = renderHook(() => useLeads({ page: 5 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setLimit(100)
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2)
      })

      const secondCall = mockApi.get.mock.calls[1][0] as string
      expect(secondCall).toContain('limit=100')
      expect(secondCall).toContain('page=1')
    })
  })

  describe('Filtering', () => {
    test('setFilters updates filters, resets page to 1, and triggers refetch', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })

      const { result } = renderHook(() => useLeads({ page: 3 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setFilters({ search: 'test', status: 'active' })
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2)
      })

      const secondCall = mockApi.get.mock.calls[1][0] as string
      expect(secondCall).toContain('search=test')
      expect(secondCall).toContain('status=active')
      expect(secondCall).toContain('page=1')
    })

    test('clearFilters clears filters, resets page to 1, and triggers refetch', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })

      const initialFilters = { search: 'test', status: 'active' as const }
      const { result } = renderHook(() => useLeads({ 
        page: 3, 
        filters: initialFilters 
      }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.clearFilters()
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2)
      })

      const secondCall = mockApi.get.mock.calls[1][0] as string
      expect(secondCall).not.toContain('search=')
      expect(secondCall).not.toContain('status=')
      expect(secondCall).toContain('page=1')
    })
  })

  describe('Sorting', () => {
    test('setSorting updates sorting and triggers refetch', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setSorting({ sortBy: 'email', sortOrder: 'asc' })
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2)
      })

      const secondCall = mockApi.get.mock.calls[1][0] as string
      expect(secondCall).toContain('sortBy=email')
      expect(secondCall).toContain('sortOrder=asc')
    })
  })

  describe('Bulk Operations', () => {
    test('bulkUpdate performs update and optimistically updates state', async () => {
      const bulkUpdateResponse = {
        updated: 1,
        requested: 1,
        leads: [{
          id: '1',
          status: 'inactive',
          campaign_id: null,
          updated_at: '2024-01-01T13:00:00Z'
        }]
      }

      mockApi.get.mockResolvedValueOnce({ data: mockLeadsResponse })
      mockApi.put.mockResolvedValueOnce({ data: bulkUpdateResponse })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let bulkResult: any
      await act(async () => {
        bulkResult = await result.current.bulkUpdate({
          leadIds: ['1'],
          updates: { status: 'inactive' }
        })
      })

      expect(mockApi.put).toHaveBeenCalledWith('/leads/bulk/update', {
        leadIds: ['1'],
        updates: { status: 'inactive' }
      })

      expect(bulkResult).toEqual(bulkUpdateResponse)
      expect(result.current.leads[0].status).toBe('inactive')
    })

    test('bulkUpdate handles errors', async () => {
      const errorMessage = 'Bulk update failed'
      mockApi.get.mockResolvedValueOnce({ data: mockLeadsResponse })
      mockApi.put.mockRejectedValueOnce({ 
        response: { data: { error: errorMessage } } 
      })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let bulkResult: any
      await act(async () => {
        bulkResult = await result.current.bulkUpdate({
          leadIds: ['1'],
          updates: { status: 'inactive' }
        })
      })

      expect(bulkResult).toBeNull()
      expect(result.current.error).toBe(errorMessage)
    })

    test('bulkUpdate does nothing when no leadIds provided', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockLeadsResponse })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let bulkResult: any
      await act(async () => {
        bulkResult = await result.current.bulkUpdate({
          leadIds: [],
          updates: { status: 'inactive' }
        })
      })

      expect(mockApi.put).not.toHaveBeenCalled()
      expect(bulkResult).toBeNull()
    })

    test('tracks bulkUpdating state', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockLeadsResponse })
      mockApi.put.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { updated: 1, requested: 1, leads: [] } }), 100))
      )

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isBulkUpdating).toBe(false)

      act(() => {
        result.current.bulkUpdate({
          leadIds: ['1'],
          updates: { status: 'inactive' }
        })
      })

      expect(result.current.isBulkUpdating).toBe(true)

      await waitFor(() => {
        expect(result.current.isBulkUpdating).toBe(false)
      })
    })
  })

  describe('Refetch', () => {
    test('refetch triggers new API call', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: { ...mockLeadsResponse, total: 2 } })

      const { result } = renderHook(() => useLeads())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.pagination.total).toBe(1)

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockApi.get).toHaveBeenCalledTimes(2)
      expect(result.current.pagination.total).toBe(2)
    })
  })

  describe('Initial Parameters', () => {
    test('applies initial parameters correctly', async () => {
      const initialParams = {
        page: 2,
        limit: 25,
        filters: { search: 'test' },
        sorting: { sortBy: 'email' as const, sortOrder: 'asc' as const }
      }

      mockApi.get.mockResolvedValueOnce({ data: mockLeadsResponse })

      const { result } = renderHook(() => useLeads(initialParams))

      expect(result.current.pagination.page).toBe(2)
      expect(result.current.pagination.limit).toBe(25)
      expect(result.current.filters).toEqual({ search: 'test' })
      expect(result.current.sorting).toEqual({ sortBy: 'email', sortOrder: 'asc' })
    })
  })
})

describe('useLeadStats Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock useAuth to return our test user
    ;(useAuth as jest.MockedFunction<typeof useAuth>).mockReturnValue({
      user: mockUser,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    })
  })

  test('fetches stats successfully', async () => {
    mockApi.get.mockResolvedValueOnce({ data: mockStatsResponse })

    const { result } = renderHook(() => useLeadStats())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.stats).toBeNull()

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stats).toEqual(mockStatsResponse)
    expect(result.current.error).toBeNull()
    expect(mockApi.get).toHaveBeenCalledWith('/leads/stats/summary')
  })

  test('handles stats API error', async () => {
    const errorMessage = 'Failed to load stats'
    mockApi.get.mockRejectedValueOnce({ 
      response: { data: { error: errorMessage } } 
    })

    const { result } = renderHook(() => useLeadStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe(errorMessage)
    expect(result.current.stats).toBeNull()
  })

  test('does not fetch when user is not available', async () => {
    ;(useAuth as jest.MockedFunction<typeof useAuth>).mockReturnValue({
      user: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    })

    const { result } = renderHook(() => useLeadStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApi.get).not.toHaveBeenCalled()
    expect(result.current.stats).toBeNull()
  })

  test('refetch triggers new API call', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: mockStatsResponse })
      .mockResolvedValueOnce({ data: { ...mockStatsResponse, summary: { ...mockStatsResponse.summary, total_leads: 200 } } })

    const { result } = renderHook(() => useLeadStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stats?.summary.total_leads).toBe(100)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockApi.get).toHaveBeenCalledTimes(2)
    expect(result.current.stats?.summary.total_leads).toBe(200)
  })
})