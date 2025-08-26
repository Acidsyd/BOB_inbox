/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/context'
import { api } from '@/lib/api'
import LeadsPage from '@/app/leads/page'

// Mock dependencies
jest.mock('@/lib/auth/context')
jest.mock('@/lib/api')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}))

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockApi = api as jest.Mocked<typeof api>

// Mock components are no longer needed since ClayStyleSpreadsheet was removed

// Sample test data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'admin',
  organizationId: 'org-1'
}

const mockLeadsResponse = {
  leads: [
    {
      id: '1',
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Acme Corp',
      job_title: 'CEO',
      phone: '+1-555-0123',
      linkedin_url: 'https://linkedin.com/in/johndoe',
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
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      company: 'Tech Solutions',
      job_title: 'CTO',
      phone: null,
      linkedin_url: null,
      status: 'responded',
      data: {},
      campaign_id: null,
      campaign_name: null,
      organization_id: 'org-1',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      list_name: 'Test List',
      extended_fields: {},
      emails_sent: 2,
      emails_opened: 2,
      replies: 2,
      last_activity: '2024-01-02T12:00:00Z'
    }
  ],
  total: 2,
  page: 1,
  limit: 50,
  totalPages: 1,
  filters: {},
  sorting: {
    sortBy: 'created_at',
    sortOrder: 'desc'
  }
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Leads Page End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    })

    mockApi.get.mockResolvedValue({ data: mockLeadsResponse })
  })

  describe('Page Load and Initial Render', () => {
    test('loads page with leads table', async () => {
      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      // Check page structure
      expect(screen.getByText('Leads Management')).toBeInTheDocument()
      expect(screen.getByText('Manage your leads, import new data, and track performance')).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Leads')).toBeInTheDocument()
        expect(screen.getByText('2 total leads')).toBeInTheDocument()
      })

      // Check leads data is displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
    })

    test('shows loading state initially', async () => {
      // Mock delayed API response
      mockApi.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: mockLeadsResponse }), 100))
      )

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      // Should show loading skeletons
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })
  })

  // View Mode Switching tests removed - now only using simple table view

  describe('Search and Filter Integration', () => {
    test('search functionality triggers API call', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: { ...mockLeadsResponse, leads: [mockLeadsResponse.leads[0]] } })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search leads by name, email, or company...')
      await userEvent.type(searchInput, 'john')

      // Wait for debounce and API call
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('search=john')
        )
      }, { timeout: 1000 })
    })

    test('status filter integration', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: { ...mockLeadsResponse, leads: [mockLeadsResponse.leads[0]] } })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Leads')).toBeInTheDocument()
      })

      // Open filters
      const filtersButton = screen.getByText('Filters')
      await userEvent.click(filtersButton)

      // Select status filter
      const statusSelect = screen.getByDisplayValue('All Status')
      await userEvent.click(statusSelect)
      
      const activeOption = screen.getByText('Active')
      await userEvent.click(activeOption)

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('status=active')
        )
      })
    })

    test('clear filters functionality', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Leads')).toBeInTheDocument()
      })

      // Apply a filter first
      const filtersButton = screen.getByText('Filters')
      await userEvent.click(filtersButton)

      const statusSelect = screen.getByDisplayValue('All Status')
      await userEvent.click(statusSelect)
      const activeOption = screen.getByText('Active')
      await userEvent.click(activeOption)

      // Clear filters
      const clearButton = screen.getByText('Clear All')
      await userEvent.click(clearButton)

      await waitFor(() => {
        const lastCall = mockApi.get.mock.calls[mockApi.get.mock.calls.length - 1][0]
        expect(lastCall).not.toContain('status=')
      })
    })
  })

  describe('Sorting Integration', () => {
    test('column sorting triggers API call', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Contact')).toBeInTheDocument()
      })

      const contactHeader = screen.getByText('Contact')
      await userEvent.click(contactHeader)

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=email')
        )
      })
    })

    test('multiple clicks reverse sort order', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: mockLeadsResponse })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Contact')).toBeInTheDocument()
      })

      const contactHeader = screen.getByText('Contact')
      
      // First click - should sort ascending
      await userEvent.click(contactHeader)
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('sortOrder=asc')
        )
      })

      // Second click - should sort descending
      await userEvent.click(contactHeader)
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('sortOrder=desc')
        )
      })
    })
  })

  describe('Pagination Integration', () => {
    test('page size change triggers API call', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ data: { ...mockLeadsResponse, limit: 100 } })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Leads')).toBeInTheDocument()
      })

      const pageSizeSelect = screen.getByDisplayValue('50 per page')
      await userEvent.click(pageSizeSelect)

      const option100 = screen.getByText('100 per page')
      await userEvent.click(option100)

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('limit=100')
        )
      })
    })

    test('page navigation with multiple pages', async () => {
      const multiPageResponse = {
        ...mockLeadsResponse,
        total: 150,
        totalPages: 3
      }

      mockApi.get
        .mockResolvedValueOnce({ data: multiPageResponse })
        .mockResolvedValueOnce({ data: { ...multiPageResponse, page: 2 } })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      })

      const nextButton = screen.getByText('Next')
      await userEvent.click(nextButton)

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        )
      })
    })
  })

  describe('Bulk Actions Integration', () => {
    test('bulk status update performs API call', async () => {
      const bulkUpdateResponse = {
        updated: 1,
        requested: 1,
        leads: [{ 
          id: '1', 
          status: 'inactive', 
          campaign_id: null, 
          updated_at: new Date().toISOString() 
        }]
      }

      mockApi.get.mockResolvedValue({ data: mockLeadsResponse })
      mockApi.put.mockResolvedValue({ data: bulkUpdateResponse })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Select a lead
      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[1]) // Skip header checkbox

      // Perform bulk action
      const bulkActionsSelect = screen.getByDisplayValue('Bulk Actions')
      await userEvent.click(bulkActionsSelect)

      const inactiveOption = screen.getByText('Mark as Inactive')
      await userEvent.click(inactiveOption)

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/leads/bulk/update', {
          leadIds: ['1'],
          updates: { status: 'inactive' }
        })
      })
    })

    test('select all functionality', async () => {
      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      const checkboxes = screen.getAllByRole('checkbox')
      const headerCheckbox = checkboxes[0]

      // Select all
      await userEvent.click(headerCheckbox)

      expect(headerCheckbox).toBeChecked()
      expect(checkboxes[1]).toBeChecked()
      expect(checkboxes[2]).toBeChecked()

      // Should show bulk actions
      expect(screen.getByText('2 selected')).toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    test('displays API error to user', async () => {
      mockApi.get.mockRejectedValue({
        response: { data: { error: 'Database connection failed' } }
      })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Error Loading Leads')).toBeInTheDocument()
        expect(screen.getByText('Database connection failed')).toBeInTheDocument()
      })
    })

    test('retry functionality after error', async () => {
      mockApi.get
        .mockRejectedValueOnce({ response: { data: { error: 'Network error' } } })
        .mockResolvedValueOnce({ data: mockLeadsResponse })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Error Loading Leads')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Try Again')
      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State Handling', () => {
    test('shows empty state when no leads', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          ...mockLeadsResponse,
          leads: [],
          total: 0
        }
      })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('No Leads Found')).toBeInTheDocument()
        expect(screen.getByText('Get started by importing your first leads or creating a campaign.')).toBeInTheDocument()
      })
    })

    test('shows filtered empty state', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({
          data: {
            ...mockLeadsResponse,
            leads: [],
            total: 0
          }
        })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Apply filter that returns no results
      const searchInput = screen.getByPlaceholderText('Search leads by name, email, or company...')
      await userEvent.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText('Try adjusting your filters or search terms.')).toBeInTheDocument()
        expect(screen.getByText('Clear Filters')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Integration', () => {
    test('handles unauthenticated user', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        isLoading: false
      })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      // Should not make API calls when user is null
      await waitFor(() => {
        expect(mockApi.get).not.toHaveBeenCalled()
      })
    })

    test('waits for authentication to complete', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        isLoading: true
      })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      // Should show loading or not make API calls yet
      expect(mockApi.get).not.toHaveBeenCalled()
    })
  })

  describe('Real-time Updates Simulation', () => {
    test('refetches data when explicitly triggered', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: mockLeadsResponse })
        .mockResolvedValueOnce({ 
          data: { 
            ...mockLeadsResponse, 
            total: 3,
            leads: [...mockLeadsResponse.leads, {
              id: '3',
              email: 'new@example.com',
              first_name: 'New',
              last_name: 'Lead',
              status: 'active',
              organization_id: 'org-1',
              created_at: '2024-01-03T00:00:00Z',
              updated_at: '2024-01-03T00:00:00Z'
            }]
          }
        })

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('2 total leads')).toBeInTheDocument()
      })

      // Simulate a refetch (this would happen through real-time updates in production)
      // For now, we can trigger it through error state and retry
      mockApi.get.mockRejectedValueOnce(new Error('Force refetch'))
      
      // Trigger error to show retry button
      fireEvent.error(window) // Simulate error to trigger retry

      await waitFor(() => {
        expect(screen.getByText('3 total leads')).toBeInTheDocument()
        expect(screen.getByText('new@example.com')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Integration', () => {
    test('handles large datasets efficiently', async () => {
      const largeDataset = {
        ...mockLeadsResponse,
        total: 10000,
        totalPages: 200,
        leads: Array.from({ length: 50 }, (_, i) => ({
          ...mockLeadsResponse.leads[0],
          id: `lead-${i}`,
          email: `lead${i}@example.com`,
          first_name: `Lead${i}`,
          last_name: 'Test'
        }))
      }

      mockApi.get.mockResolvedValue({ data: largeDataset })

      const startTime = Date.now()

      render(
        <TestWrapper>
          <LeadsPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('10,000 total leads')).toBeInTheDocument()
      })

      const endTime = Date.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (this is a soft requirement for testing)
      expect(renderTime).toBeLessThan(5000) // 5 seconds max for render
    })
  })
})