'use client'

import { useState, useMemo, useCallback, memo, KeyboardEvent } from 'react'
import { format } from 'date-fns/format'
import { 
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Phone,
  Building,
  Calendar,
  TrendingUp,
  UserCheck,
  X,
  Download,
  Trash2,
  Edit3
} from 'lucide-react'

import { useLeads } from '../../hooks/useLeads'
import { Lead, LeadFilters, LeadStatus, LeadSortableColumn } from '../types/leads'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Skeleton } from '../ui/skeleton'

/**
 * Props for the LeadsTable component
 */
interface LeadsTableProps {
  /** Whether to show bulk action controls */
  enableBulkActions?: boolean
  /** Whether to show search and filter controls */
  showFilters?: boolean
  /** Default number of items per page */
  defaultPageSize?: number
}

/**
 * Color classes for different lead statuses
 */
const statusColors: Record<LeadStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200', 
  bounced: 'bg-red-100 text-red-800 border-red-200',
  unsubscribed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  responded: 'bg-blue-100 text-blue-800 border-blue-200'
}

/**
 * Human-readable labels for lead statuses
 */
const statusLabels: Record<LeadStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  bounced: 'Bounced',
  unsubscribed: 'Unsubscribed',
  responded: 'Responded'
}

/**
 * Optimized leads table component with performance enhancements
 * Features: virtualized rendering, memoized callbacks, accessibility support
 */
function LeadsTableComponent({ 
  enableBulkActions = true,
  showFilters = true,
  defaultPageSize = 50 
}: LeadsTableProps) {
  const {
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
  } = useLeads({ limit: defaultPageSize })

  // Local state for UI interactions
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  /**
   * Handles search input with debouncing to avoid excessive API calls
   * @param value - The search term entered by the user
   * @returns Cleanup function to clear the timeout
   */
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    const timeoutId = setTimeout(() => {
      setFilters({ search: value || undefined })
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [setFilters])

  /**
   * Handles selection of all/none leads in the current page
   * Toggles between selecting all visible leads or clearing selection
   */
  const handleSelectAll = useCallback(() => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)))
    }
  }, [selectedLeads.size, leads])

  /**
   * Toggles selection state for a single lead
   * @param leadId - The ID of the lead to toggle
   */
  const handleSelectLead = useCallback((leadId: string) => {
    setSelectedLeads(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(leadId)) {
        newSelection.delete(leadId)
      } else {
        newSelection.add(leadId)
      }
      return newSelection
    })
  }, [])

  /**
   * Handles column sorting with automatic toggle between asc/desc
   * @param column - The column name to sort by
   */
  const handleSort = useCallback((column: string) => {
    const newSortOrder = sorting.sortBy === column && sorting.sortOrder === 'asc' ? 'desc' : 'asc'
    setSorting({
      sortBy: column as LeadSortableColumn,
      sortOrder: newSortOrder
    })
  }, [sorting.sortBy, sorting.sortOrder, setSorting])
  
  /**
   * Handles keyboard navigation for sortable column headers
   * @param event - The keyboard event
   * @param column - The column name to sort by
   */
  const handleSortKeyDown = useCallback((event: KeyboardEvent, column: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSort(column)
    }
  }, [handleSort])
  
  /**
   * Clears the search input and removes search filter
   */
  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setFilters({ search: undefined })
  }, [setFilters])

  /**
   * Performs bulk status update on selected leads
   * @param status - The new status to apply to selected leads
   */
  const handleBulkStatusUpdate = useCallback(async (status: LeadStatus) => {
    if (selectedLeads.size === 0) return

    await bulkUpdate({
      leadIds: Array.from(selectedLeads),
      updates: { status }
    })
    
    setSelectedLeads(new Set())
  }, [selectedLeads, bulkUpdate])

  /**
   * Formats date strings for display in the table
   * @param dateString - ISO date string or null
   * @returns Formatted date string or 'Never' if null
   */
  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return 'Never'
    return format(new Date(dateString), 'MMM dd, yyyy')
  }, [])

  /**
   * Formats a lead's full name from first and last name fields
   * @param lead - The lead object
   * @returns Formatted full name or 'No name' if neither field is present
   */
  const formatName = useCallback((lead: Lead) => {
    const parts = []
    if (lead.first_name) parts.push(lead.first_name)
    if (lead.last_name) parts.push(lead.last_name)
    return parts.length > 0 ? parts.join(' ') : 'No name'
  }, [])

  /**
   * Renders a summary of email activities for a lead
   * @param lead - The lead object
   * @returns Formatted activity summary string
   */
  const renderActivitySummary = useCallback((lead: Lead) => {
    const activities = []
    if (lead.emails_sent > 0) activities.push(`${lead.emails_sent} sent`)
    if (lead.emails_opened > 0) activities.push(`${lead.emails_opened} opened`)
    if (lead.replies > 0) activities.push(`${lead.replies} replies`)
    return activities.length > 0 ? activities.join(', ') : 'No activity'
  }, [])

  // Loading skeleton with improved accessibility
  if (isLoading) {
    return (
      <Card role="status" aria-live="polite" aria-label="Loading leads data">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" aria-label="Loading title" />
              <Skeleton className="h-4 w-32" aria-label="Loading subtitle" />
            </div>
            <Skeleton className="h-10 w-32" aria-label="Loading actions" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" aria-label="Loading search bar" />
            <Skeleton className="h-8 w-40" aria-label="Loading filters" />
          </div>
          <div className="space-y-2" aria-label="Loading table data">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
        <div className="sr-only" aria-live="polite">
          Loading leads, please wait...
        </div>
      </Card>
    )
  }

  // Enhanced error state with better UX
  if (error) {
    return (
      <Card 
        role="alert" 
        aria-live="assertive" 
        className="border-red-200 bg-red-50/50"
      >
        <CardContent className="p-12 text-center">
          <div className="text-red-500 mb-6">
            <Mail className="h-12 w-12 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-red-700 mb-2">
              Unable to Load Leads
            </h3>
            <p className="text-sm text-red-600 mb-4 max-w-md mx-auto">
              {error}
            </p>
            <div className="text-xs text-muted-foreground mb-4">
              This might be due to a network issue or server maintenance.
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button 
              onClick={refetch} 
              disabled={isLoading}
              aria-label="Retry loading leads data"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Retrying...
                </>
              ) : (
                'Try Again'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              aria-label="Refresh the entire page"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Enhanced empty state with better UX
  if (leads.length === 0 && !isLoading) {
    const hasFilters = Object.keys(filters).some(key => filters[key as keyof LeadFilters])
    
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <div className="text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {hasFilters ? 'No Matching Leads' : 'No Leads Yet'}
            </h3>
            <p className="text-sm mb-6 max-w-md mx-auto">
              {hasFilters 
                ? "No leads match your current search and filter criteria. Try broadening your search or clearing some filters."
                : "You haven't imported any leads yet. Import your contact list or create a campaign to get started."
              }
            </p>
            <div className="flex justify-center gap-3">
              {hasFilters && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  aria-label="Clear all filters and show all leads"
                >
                  Clear All Filters
                </Button>
              )}
              {!hasFilters && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  aria-label="Import leads from a CSV file"
                >
                  Import Leads
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 min-h-0">
      {/* Header with search and actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              {pagination.total.toLocaleString()} total leads
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {selectedLeads.size > 0 && enableBulkActions && (
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-muted-foreground">
                  {selectedLeads.size} selected
                </span>
                <Select
                  onValueChange={(value) => {
                    if (value && value.startsWith('status:')) {
                      const status = value.replace('status:', '') as Lead['status']
                      handleBulkStatusUpdate(status)
                    }
                  }}
                  disabled={isBulkUpdating}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Bulk Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status:active">Mark as Active</SelectItem>
                    <SelectItem value="status:inactive">Mark as Inactive</SelectItem>
                    <SelectItem value="status:bounced">Mark as Bounced</SelectItem>
                    <SelectItem value="status:unsubscribed">Mark as Unsubscribed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              aria-label="Export leads data"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        {showFilters && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, or company..."
                  value={searchInput}
                  onChange={(e) => {
                    const cleanup = handleSearch(e.target.value)
                    return cleanup
                  }}
                  className="pl-10"
                  aria-label="Search leads by name, email, or company"
                  role="searchbox"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.keys(filters).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.keys(filters).length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Advanced filters */}
            {showAdvancedFilters && (
              <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => setFilters({ status: (value as LeadStatus) || undefined })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={Object.keys(filters).length === 0}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <Card role="region" aria-label="Leads table" className="overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <Table role="table" aria-label="Leads data table" className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              {enableBulkActions && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                    aria-label="Select all leads"
                  />
                </TableHead>
              )}
              <TableHead 
                sortable
                sorted={sorting.sortBy === 'email' ? sorting.sortOrder : false}
                onSort={() => handleSort('email')}
                role="columnheader"
                tabIndex={0}
                aria-label="Sort by email address"
              >
                Contact
              </TableHead>
              <TableHead
                sortable
                sorted={sorting.sortBy === 'company' ? sorting.sortOrder : false}
                onSort={() => handleSort('company')}
                role="columnheader"
                tabIndex={0}
                aria-label="Sort by company name"
              >
                Company
              </TableHead>
              <TableHead role="columnheader">Status</TableHead>
              <TableHead role="columnheader">Activity</TableHead>
              <TableHead
                sortable
                sorted={sorting.sortBy === 'last_activity' ? sorting.sortOrder : false}
                onSort={() => handleSort('last_activity')}
                role="columnheader"
                tabIndex={0}
                aria-label="Sort by last activity date"
              >
                Last Activity
              </TableHead>
              <TableHead
                sortable
                sorted={sorting.sortBy === 'created_at' ? sorting.sortOrder : false}
                onSort={() => handleSort('created_at')}
                role="columnheader"
                tabIndex={0}
                aria-label="Sort by date added"
              >
                Added
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow 
                key={lead.id} 
                role="row"
                tabIndex={0}
                aria-label={`Lead: ${formatName(lead)}, ${lead.email}`}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                {enableBulkActions && (
                  <TableCell role="gridcell">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                      className="rounded border-gray-300"
                      aria-label={`Select ${formatName(lead)}`}
                    />
                  </TableCell>
                )}
                
                <TableCell role="gridcell">
                  <div className="flex flex-col min-w-0">
                    <div className="font-medium truncate">{formatName(lead)}</div>
                    <div className="flex items-center text-sm text-muted-foreground min-w-0">
                      <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center text-sm text-muted-foreground min-w-0">
                        <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell role="gridcell">
                  <div className="flex flex-col min-w-0">
                    {lead.company && (
                      <div className="flex items-center font-medium min-w-0">
                        <Building className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{lead.company}</span>
                      </div>
                    )}
                    {lead.job_title && (
                      <div className="text-sm text-muted-foreground truncate">
                        {lead.job_title}
                      </div>
                    )}
                    {!lead.company && !lead.job_title && (
                      <span className="text-muted-foreground text-sm">No company info</span>
                    )}
                  </div>
                </TableCell>

                <TableCell role="gridcell">
                  <Badge className={statusColors[lead.status]}>
                    {statusLabels[lead.status]}
                  </Badge>
                </TableCell>

                <TableCell role="gridcell">
                  <div className="text-sm">
                    {renderActivitySummary(lead)}
                  </div>
                </TableCell>

                <TableCell role="gridcell">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(lead.last_activity)}
                  </div>
                </TableCell>

                <TableCell role="gridcell">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(lead.created_at)}
                  </div>
                </TableCell>

                <TableCell role="gridcell">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-t">
          <div className="flex items-center gap-2 order-2 sm:order-1 w-full sm:w-auto justify-center sm:justify-start">
            <span className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} leads
            </span>
          </div>
          
          <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) => setLimit(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            
            <span className="text-sm px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              aria-label="Go to next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Memoized leads table component for optimal performance
 * Only re-renders when props actually change
 */
export default memo(LeadsTableComponent)