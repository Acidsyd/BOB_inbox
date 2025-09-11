'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Trash2, Upload, Users } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import ProtectedRoute from '../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../components/layout/AppLayout'
import SimpleLeadTable from '../../../../components/leads/SimpleLeadTable'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
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
} from '../../../../components/ui/alert-dialog'

interface Lead {
  id: string
  email: string
  first_name?: string
  last_name?: string
  company?: string
  phone?: string
  status: 'active' | 'inactive' | 'bounced' | 'unsubscribed' | 'responded'
  created_at: string
  data?: any
  added_at: string
  source: string
}

interface LeadList {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function LeadListViewContent() {
  const params = useParams()
  const router = useRouter()
  const listId = params.id as string

  const [leadList, setLeadList] = useState<LeadList | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null)

  // Fetch lead list and leads
  const fetchData = async (page = 1, limit = 50, search = '') => {
    try {
      setIsLoading(true)
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      })

      const response = await fetch(`/api/leads/lists/${listId}?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Lead list not found')
        }
        throw new Error('Failed to fetch lead list')
      }

      const data = await response.json()
      setLeadList(data.leadList)
      setLeads(data.leads)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete lead list
  const handleDeleteList = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/leads/lists/${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete lead list')
      }

      // Navigate back to lists
      router.push('/leads/lists')
    } catch (error) {
      console.error('Error deleting lead list:', error)
      alert('Failed to delete lead list')
    } finally {
      setIsDeleting(false)
    }
  }

  // Delete individual lead
  const handleDeleteLead = async (leadId: string) => {
    setDeletingLeadId(leadId)
    try {
      const response = await fetch(`/api/leads/lists/${listId}/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete lead')
      }

      // Optimistically remove the lead from the current list
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId))
      
      // Update pagination count
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
        totalPages: Math.ceil((prev.total - 1) / prev.limit)
      }))

      console.log('✅ Lead deleted successfully')
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead')
      // Refresh data to ensure consistency
      fetchData(pagination.page, pagination.limit, searchTerm)
    } finally {
      setDeletingLeadId(null)
    }
  }

  // Handle search
  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    fetchData(1, pagination.limit, search)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchData(page, pagination.limit, searchTerm)
  }

  // Handle limit change
  const handleLimitChange = (limit: number) => {
    fetchData(1, limit, searchTerm)
  }

  useEffect(() => {
    if (listId) {
      fetchData()
    }
  }, [listId])

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Lead List</h3>
              <p className="text-sm">{error}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button onClick={() => fetchData()}>Try Again</Button>
              <Link href="/leads/lists">
                <Button variant="outline">Back to Lists</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/leads/lists">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lists
              </Button>
            </Link>
          </div>
          
          {leadList && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{leadList.name}</h1>
              {leadList.description && (
                <p className="text-gray-600 mt-1">{leadList.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">
                  {pagination.total} leads
                </Badge>
                <span className="text-sm text-gray-500">
                  Created {new Date(leadList.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete List
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Lead List</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{leadList?.name}"? 
                  This will permanently remove the list and all {pagination.total} leads in it. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteList}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Deleting...' : 'Delete List'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Card */}
      {!isLoading && leadList && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pagination.total}
              </div>
              <div className="text-sm text-gray-600">Total Leads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(lead => lead.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {leads.filter(lead => lead.status === 'responded').length}
              </div>
              <div className="text-sm text-gray-600">Responded</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {leads.filter(lead => lead.status === 'bounced').length}
              </div>
              <div className="text-sm text-gray-600">Bounced</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Table */}
      <SimpleLeadTable
        leads={leads}
        pagination={pagination}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onDeleteLead={handleDeleteLead}
        deletingLeadId={deletingLeadId}
      />
    </div>
  )
}

export default function LeadListViewPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <LeadListViewContent />
      </AppLayout>
    </ProtectedRoute>
  )
}