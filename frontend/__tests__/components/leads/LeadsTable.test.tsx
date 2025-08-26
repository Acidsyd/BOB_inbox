/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LeadsTable from '@/components/leads/LeadsTable'
import { useLeads } from '@/hooks/useLeads'
import { Lead } from '@/types/leads'

// Mock the useLeads hook
jest.mock('@/hooks/useLeads')
const mockUseLeads = useLeads as jest.MockedFunction<typeof useLeads>

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (date === null || date === undefined) return 'Never'
    return 'Jan 01, 2024'
  })
}))

// Sample test data
const mockLeads: Lead[] = [
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
]

const mockPagination = {
  page: 1,
  limit: 50,
  total: 2,
  totalPages: 1
}

const defaultMockReturnValue = {
  leads: mockLeads,
  isLoading: false,
  error: null,
  pagination: mockPagination,
  filters: {},
  sorting: { sortBy: 'created_at' as const, sortOrder: 'desc' as const },
  refetch: jest.fn(),
  setPage: jest.fn(),
  setLimit: jest.fn(),
  setFilters: jest.fn(),
  setSorting: jest.fn(),
  clearFilters: jest.fn(),
  bulkUpdate: jest.fn(),
  isBulkUpdating: false
}

// Test wrapper component
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

describe('LeadsTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLeads.mockReturnValue(defaultMockReturnValue)
  })

  describe('Rendering Tests', () => {
    test('renders table with leads data', () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      // Check if table header is present
      expect(screen.getByText('Leads')).toBeInTheDocument()
      expect(screen.getByText('2 total leads')).toBeInTheDocument()

      // Check if lead data is rendered
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()

      // Check company information
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('CEO')).toBeInTheDocument()
      expect(screen.getByText('Tech Solutions')).toBeInTheDocument()
      expect(screen.getByText('CTO')).toBeInTheDocument()
    })

    test('renders loading skeleton when loading', () => {
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        isLoading: true,
        leads: []
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      // Check for skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    test('renders error state when error occurs', () => {
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        error: 'Failed to load leads',
        leads: []
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('Error Loading Leads')).toBeInTheDocument()
      expect(screen.getByText('Failed to load leads')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    test('renders empty state when no leads', () => {
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        leads: [],
        pagination: { ...mockPagination, total: 0 }
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('No Leads Found')).toBeInTheDocument()
      expect(screen.getByText('Get started by importing your first leads or creating a campaign.')).toBeInTheDocument()
    })

    test('renders empty state with filter message when filters applied', () => {
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        leads: [],
        filters: { status: 'active' },
        pagination: { ...mockPagination, total: 0 }
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('Try adjusting your filters or search terms.')).toBeInTheDocument()
      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    test('renders search input and handles search', async () => {
      const setFiltersMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        setFilters: setFiltersMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('Search leads by name, email, or company...')
      expect(searchInput).toBeInTheDocument()

      await userEvent.type(searchInput, 'john')

      // Wait for debounce timeout
      await waitFor(() => {
        expect(setFiltersMock).toHaveBeenCalledWith({ search: 'john' })
      }, { timeout: 1000 })
    })

    test('clears search when X button clicked', async () => {
      const setFiltersMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        setFilters: setFiltersMock,
        filters: { search: 'john' }
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const searchInput = screen.getByDisplayValue('john')
      expect(searchInput).toBeInTheDocument()

      // Type something to show the X button
      await userEvent.type(searchInput, 'test')

      const clearButton = screen.getByRole('button', { name: /clear search/i })
      await userEvent.click(clearButton)

      expect(setFiltersMock).toHaveBeenCalledWith({ search: undefined })
    })
  })

  describe('Filtering Functionality', () => {
    test('opens and closes advanced filters', async () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const filtersButton = screen.getByText('Filters')
      await userEvent.click(filtersButton)

      // Check if filter dropdown appears
      expect(screen.getByText('All Status')).toBeInTheDocument()
    })

    test('applies status filter', async () => {
      const setFiltersMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        setFilters: setFiltersMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      // Open filters
      const filtersButton = screen.getByText('Filters')
      await userEvent.click(filtersButton)

      // Select status filter
      const statusSelect = screen.getByDisplayValue('All Status')
      await userEvent.click(statusSelect)
      
      const activeOption = screen.getByText('Active')
      await userEvent.click(activeOption)

      expect(setFiltersMock).toHaveBeenCalledWith({ status: 'active' })
    })

    test('clears all filters', async () => {
      const clearFiltersMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        filters: { status: 'active', search: 'test' },
        clearFilters: clearFiltersMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      // Open filters
      const filtersButton = screen.getByText('Filters')
      await userEvent.click(filtersButton)

      const clearAllButton = screen.getByText('Clear All')
      await userEvent.click(clearAllButton)

      expect(clearFiltersMock).toHaveBeenCalled()
    })
  })

  describe('Sorting Functionality', () => {
    test('handles column sorting', async () => {
      const setSortingMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        setSorting: setSortingMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const contactHeader = screen.getByText('Contact')
      await userEvent.click(contactHeader)

      expect(setSortingMock).toHaveBeenCalledWith({
        sortBy: 'email',
        sortOrder: 'asc'
      })
    })

    test('reverses sort order on second click', async () => {
      const setSortingMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        sorting: { sortBy: 'email', sortOrder: 'asc' },
        setSorting: setSortingMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const contactHeader = screen.getByText('Contact')
      await userEvent.click(contactHeader)

      expect(setSortingMock).toHaveBeenCalledWith({
        sortBy: 'email',
        sortOrder: 'desc'
      })
    })
  })

  describe('Bulk Actions', () => {
    test('enables bulk actions by default', () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      // Check for checkboxes in header and rows
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0) // Header + row checkboxes
    })

    test('disables bulk actions when prop is false', () => {
      render(
        <TestWrapper>
          <LeadsTable enableBulkActions={false} />
        </TestWrapper>
      )

      const checkboxes = screen.queryAllByRole('checkbox')
      expect(checkboxes).toHaveLength(0)
    })

    test('selects individual leads', async () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const firstRowCheckbox = checkboxes[1] // Skip header checkbox

      await userEvent.click(firstRowCheckbox)

      expect(firstRowCheckbox).toBeChecked()
    })

    test('selects all leads when header checkbox clicked', async () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const checkboxes = screen.getAllByRole('checkbox')
      const headerCheckbox = checkboxes[0]

      await userEvent.click(headerCheckbox)

      expect(headerCheckbox).toBeChecked()
    })

    test('performs bulk status update', async () => {
      const bulkUpdateMock = jest.fn().mockResolvedValue({ 
        updated: 1, 
        requested: 1, 
        leads: [{ id: '1', status: 'inactive', campaign_id: null, updated_at: new Date().toISOString() }]
      })
      
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        bulkUpdate: bulkUpdateMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      // Select a lead
      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[1])

      // Open bulk actions dropdown
      const bulkActionsSelect = screen.getByDisplayValue('Bulk Actions')
      await userEvent.click(bulkActionsSelect)

      const inactiveOption = screen.getByText('Mark as Inactive')
      await userEvent.click(inactiveOption)

      await waitFor(() => {
        expect(bulkUpdateMock).toHaveBeenCalledWith({
          leadIds: ['1'],
          updates: { status: 'inactive' }
        })
      })
    })
  })

  describe('Pagination', () => {
    test('displays pagination information', () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('Showing 1 to 2 of 2 leads')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    })

    test('handles page size change', async () => {
      const setLimitMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        setLimit: setLimitMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const pageSizeSelect = screen.getByDisplayValue('50 per page')
      await userEvent.click(pageSizeSelect)

      const option100 = screen.getByText('100 per page')
      await userEvent.click(option100)

      expect(setLimitMock).toHaveBeenCalledWith(100)
    })

    test('handles page navigation', async () => {
      const setPageMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        pagination: { page: 1, limit: 50, total: 150, totalPages: 3 },
        setPage: setPageMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const nextButton = screen.getByText('Next')
      await userEvent.click(nextButton)

      expect(setPageMock).toHaveBeenCalledWith(2)
    })

    test('disables pagination buttons appropriately', () => {
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        pagination: { page: 1, limit: 50, total: 50, totalPages: 1 }
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const prevButton = screen.getByText('Previous')
      const nextButton = screen.getByText('Next')

      expect(prevButton).toBeDisabled()
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Data Display', () => {
    test('formats names correctly', () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    test('shows "No name" when name fields are empty', () => {
      const leadWithoutName = {
        ...mockLeads[0],
        first_name: null,
        last_name: null
      }

      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        leads: [leadWithoutName]
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('No name')).toBeInTheDocument()
    })

    test('displays status badges with correct styling', () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Responded')).toBeInTheDocument()
    })

    test('shows activity summary', () => {
      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('5 sent, 3 opened, 1 replies')).toBeInTheDocument()
      expect(screen.getByText('2 sent, 2 opened, 2 replies')).toBeInTheDocument()
    })

    test('shows "No activity" when no email activity', () => {
      const leadWithoutActivity = {
        ...mockLeads[0],
        emails_sent: 0,
        emails_opened: 0,
        replies: 0
      }

      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        leads: [leadWithoutActivity]
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      expect(screen.getByText('No activity')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('shows retry button on error', async () => {
      const refetchMock = jest.fn()
      mockUseLeads.mockReturnValue({
        ...defaultMockReturnValue,
        error: 'Network error',
        leads: [],
        refetch: refetchMock
      })

      render(
        <TestWrapper>
          <LeadsTable />
        </TestWrapper>
      )

      const retryButton = screen.getByText('Try Again')
      await userEvent.click(retryButton)

      expect(refetchMock).toHaveBeenCalled()
    })
  })

  describe('Props Configuration', () => {
    test('hides filters when showFilters is false', () => {
      render(
        <TestWrapper>
          <LeadsTable showFilters={false} />
        </TestWrapper>
      )

      expect(screen.queryByPlaceholderText('Search leads by name, email, or company...')).not.toBeInTheDocument()
      expect(screen.queryByText('Filters')).not.toBeInTheDocument()
    })

    test('uses custom default page size', () => {
      render(
        <TestWrapper>
          <LeadsTable defaultPageSize={25} />
        </TestWrapper>
      )

      expect(mockUseLeads).toHaveBeenCalledWith({ limit: 25 })
    })
  })
})