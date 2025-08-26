'use client'

import React, { useState } from 'react'
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
  X
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
  onLimitChange
}: SimpleLeadTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  const handleSearchChange = (value: string) => {
    setLocalSearchTerm(value)
    if (onSearchChange) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        onSearchChange(value)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }

  const handleClearSearch = () => {
    setLocalSearchTerm('')
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads by name, email, or company..."
            value={localSearchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
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
                      via {lead.source.replace('_', ' ')}
                    </div>
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