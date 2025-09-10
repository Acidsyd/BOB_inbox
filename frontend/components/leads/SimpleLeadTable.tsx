'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Building,
  Calendar,
  User,
  X,
  Trash2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Lead {
  id: string
  email: string
  first_name?: string
  last_name?: string
  company?: string
  phone?: string
  status: 'active' | 'inactive' | 'bounced' | 'unsubscribed' | 'responded'
  created_at: string
  data?: any // Custom fields stored as JSON
  added_at: string
  source: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface SimpleLeadTableProps {
  leads: Lead[]
  pagination: Pagination
  isLoading?: boolean
  searchTerm?: string
  onSearchChange?: (search: string) => void
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  onDeleteLead?: (leadId: string) => void
  deletingLeadId?: string | null
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200', 
  bounced: 'bg-red-100 text-red-800 border-red-200',
  unsubscribed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  responded: 'bg-blue-100 text-blue-800 border-blue-200'
}

const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  bounced: 'Bounced',
  unsubscribed: 'Unsubscribed',
  responded: 'Responded'
}

export default function SimpleLeadTable({ 
  leads, 
  pagination, 
  isLoading = false,
  searchTerm = '',
  onSearchChange,
  onPageChange,
  onLimitChange,
  onDeleteLead,
  deletingLeadId
}: SimpleLeadTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
    }
  }, [debounceTimeout])

  // Reset searching state when loading changes
  useEffect(() => {
    if (!isLoading) {
      setIsSearching(false)
    }
  }, [isLoading])

  const handleSearchChange = (value: string) => {
    setLocalSearchTerm(value)
    
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    
    if (onSearchChange) {
      setIsSearching(true)
      
      // Set new timeout for debounced search
      const newTimeoutId = setTimeout(() => {
        onSearchChange(value)
        setIsSearching(false)
      }, 500) // 500ms delay for better UX
      
      setDebounceTimeout(newTimeoutId)
    }
  }

  const handleClearSearch = () => {
    setLocalSearchTerm('')
    setIsSearching(false)
    
    // Clear any pending search timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      setDebounceTimeout(null)
    }
    
    if (onSearchChange) {
      onSearchChange('')
    }
  }

  const formatName = (lead: Lead) => {
    const parts = []
    if (lead.first_name) parts.push(lead.first_name)
    if (lead.last_name) parts.push(lead.last_name)
    return parts.length > 0 ? parts.join(' ') : 'No name'
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString.trim() === '') return '-'
    
    try {
      // Handle various date formats
      const date = new Date(dateString)
      if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
        console.warn('Invalid date string:', dateString)
        return '-'
      }
      
      // Additional validation: check if the date is reasonable (between 1900 and 2100)
      const year = date.getFullYear()
      if (year < 1900 || year > 2100) {
        console.warn('Date out of reasonable range:', dateString, 'Year:', year)
        return '-'
      }
      
      return format(date, 'MMM dd, yyyy')
    } catch (error) {
      console.warn('Date formatting error:', error, 'for date:', dateString)
      return '-'
    }
  }

  const getCustomFields = (lead: Lead) => {
    if (!lead.data?.custom_fields) return []
    
    return Object.entries(lead.data.custom_fields)
      .filter(([key, value]) => value && key !== 'imported_from')
      .slice(0, 3) // Show max 3 custom fields
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (leads.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No matching leads' : 'No leads in this list'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'This lead list is empty. Import a CSV file to add leads.'
            }
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={handleClearSearch}>
              Clear Search
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {onSearchChange && (
        <div className="relative max-w-md">
          {isSearching ? (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          )}
          <Input
            placeholder="Search leads by name, email, or company..."
            value={localSearchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
          {localSearchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Custom Fields</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{formatName(lead)}</div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-1" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-1" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {lead.company ? (
                      <div className="flex items-center">
                        <Building className="h-3 w-3 mr-1 text-gray-400" />
                        {lead.company}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge className={statusColors[lead.status]}>
                      {statusLabels[lead.status]}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {getCustomFields(lead).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium text-gray-700">{key}:</span>{' '}
                          <span className="text-gray-600">
                            {String(value).length > 20 
                              ? `${String(value).substring(0, 20)}...` 
                              : String(value)
                            }
                          </span>
                        </div>
                      ))}
                      {getCustomFields(lead).length === 0 && (
                        <span className="text-gray-400 text-xs">No custom fields</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(lead.added_at)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      via {lead.source ? lead.source.replace('_', ' ') : 'manual'}
                    </div>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell>
                    {onDeleteLead && (
                      <AlertDialog>
                        <AlertDialogTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingLeadId === lead.id}
                            className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                            title={deletingLeadId === lead.id ? "Deleting..." : "Delete lead"}
                          >
                            {deletingLeadId === lead.id ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-6 w-6" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{formatName(lead)}" ({lead.email})? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingLeadId === lead.id}>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDeleteLead(lead.id)}
                              disabled={deletingLeadId === lead.id}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {deletingLeadId === lead.id ? 'Deleting...' : 'Delete Lead'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-t">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} leads
          </div>
          
          <div className="flex items-center gap-2">
            {onLimitChange && (
              <Select
                value={pagination.limit.toString()}
                onValueChange={(value) => onLimitChange(parseInt(value))}
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
            )}
            
            {onPageChange && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>
                
                <span className="text-sm px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}