'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Search, Filter } from 'lucide-react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import LeadListCard from '@/components/leads/LeadListCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

interface LeadList {
  id: string
  name: string
  description: string
  totalLeads: number
  activeLeads: number
  createdAt: string
  updatedAt: string
  lastLeadAdded?: string
}

function LeadListsContent() {
  const router = useRouter()
  const [leadLists, setLeadLists] = useState<LeadList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch lead lists
  const fetchLeadLists = async () => {
    try {
      console.log('🚀 Starting fetchLeadLists...');
      
      const response = await api.get('/leads/lists')
      console.log('📋 Frontend received data:', response.data)
      console.log('📊 Data type:', typeof response.data, 'Array?', Array.isArray(response.data), 'Length:', response.data?.length);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Setting leadLists with', response.data.length, 'items');
        setLeadLists(response.data)
      } else {
        console.log('❌ No valid data received:', response.data);
        setLeadLists([])
      }
    } catch (error) {
      console.error('❌ Error fetching lead lists:', error)
      setError('Failed to load lead lists')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete lead list
  const handleDeleteList = async (listId: string) => {
    try {
      await api.delete(`/leads/lists/${listId}`)
      
      // Remove from local state
      setLeadLists(prev => prev.filter(list => list.id !== listId))
    } catch (error) {
      console.error('Error deleting lead list:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchLeadLists()
  }, [])

  // Filter lead lists based on search term
  const filteredLeadLists = leadLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (list.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Debug logging - CRITICAL for user debugging
  console.log('🔍 === LEADS LIST DEBUG INFO ===')
  console.log('  - leadLists array:', leadLists)
  console.log('  - leadLists length:', leadLists.length)
  console.log('  - searchTerm:', `"${searchTerm}"`)
  console.log('  - filteredLeadLists length:', filteredLeadLists.length)
  console.log('  - filteredLeadLists sample:', filteredLeadLists[0])
  console.log('  - isLoading:', isLoading)
  console.log('  - error:', error)
  console.log('  - Will show "No lead lists yet"?', filteredLeadLists.length === 0 && !isLoading && !error)
  console.log('🔍 ===============================')

  // Calculate stats
  const totalLeads = leadLists.reduce((sum, list) => sum + list.totalLeads, 0)
  const totalActiveLists = leadLists.filter(list => list.totalLeads > 0).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Lists</h1>
          <p className="text-gray-600 mt-1">
            Organize and manage your imported leads
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/leads/lists/upload')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
          <Button onClick={() => router.push('/leads/lists/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New List
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {leadLists.length}
              </div>
              <div className="text-sm text-gray-600">Total Lists</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600">
                {totalLeads.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Leads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {totalActiveLists}
              </div>
              <div className="text-sm text-gray-600">Active Lists</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search lead lists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">
              <Filter className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Unable to Load Lead Lists</h3>
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={fetchLeadLists}>Try Again</Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <div className="flex items-center px-4 py-2.5 gap-4">
                <div className="min-w-0 flex-1 max-w-sm">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex items-center gap-6">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-24" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredLeadLists.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            {searchTerm ? (
              <>
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No matching lead lists
                </h3>
                <p className="text-gray-500 mb-6">
                  No lead lists match your search for "{searchTerm}"
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No lead lists yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Get started by uploading a CSV file or creating a new lead list
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => router.push('/leads/lists/upload')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/leads/lists/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 28rem)' }}>
          {filteredLeadLists.map((leadList) => (
            <LeadListCard
              key={leadList.id}
              leadList={leadList}
              onDelete={handleDeleteList}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LeadListsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <LeadListsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}