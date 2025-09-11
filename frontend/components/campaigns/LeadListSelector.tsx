'use client'

import React, { useState, useEffect } from 'react'
import { Search, Users, Calendar, AlertCircle, Database, FileText, CheckCircle, Loader2, Copy, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
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

interface LeadListSelectorProps {
  selectedListId?: string
  onListSelect: (listId: string, list: LeadList, filteredCount?: number) => void
  onClearSelection: () => void
  className?: string
}

interface DuplicateDetail {
  email: string
  existingInLists: {
    listId: string
    listName: string
  }[]
}

interface DuplicateCheckResult {
  total: number
  existingInDatabase: number
  duplicateDetails: DuplicateDetail[]
  emails: string[]
}

interface LeadPreview {
  id: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
}

export default function LeadListSelector({ 
  selectedListId, 
  onListSelect, 
  onClearSelection, 
  className = '' 
}: LeadListSelectorProps) {
  const [leadLists, setLeadLists] = useState<LeadList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewData, setPreviewData] = useState<LeadPreview[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [selectedList, setSelectedList] = useState<LeadList | null>(null)
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [duplicateResults, setDuplicateResults] = useState<DuplicateCheckResult | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [filteredLeadCount, setFilteredLeadCount] = useState<number | null>(null)

  // Fetch lead lists
  const fetchLeadLists = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/leads/lists')
      
      // The backend returns an array directly
      const lists = Array.isArray(response.data) ? response.data : []
      setLeadLists(lists)
    } catch (error) {
      console.error('Error fetching lead lists:', error)
      setError('Failed to load lead lists')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch preview data for selected list
  const fetchPreviewData = async (listId: string) => {
    try {
      setIsLoadingPreview(true)
      const response = await api.get(`/leads/lists/${listId}?limit=3`)
      
      const data = response.data
      setPreviewData(data.leads ? data.leads.slice(0, 3) : [])
    } catch (error) {
      console.error('Error fetching preview data:', error)
      setPreviewData([])
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Check for duplicates in other campaigns
  const checkForDuplicates = async () => {
    if (!selectedList) return

    try {
      setIsCheckingDuplicates(true)
      
      // Fetch all leads from selected list
      const response = await api.get(`/leads/lists/${selectedList.id}`)
      const leads = response.data.leads || []
      const emails = leads.map(lead => lead.email)
      
      if (emails.length === 0) {
        alert('No leads found in this list')
        return
      }

      // Check for duplicates
      const duplicateResponse = await api.post('/leads/check-duplicates', { emails })
      const results: DuplicateCheckResult = duplicateResponse.data
      
      setDuplicateResults(results)
      setShowDuplicateModal(true)
      
    } catch (error) {
      console.error('Error checking duplicates:', error)
      alert('Failed to check for duplicates. Please try again.')
    } finally {
      setIsCheckingDuplicates(false)
    }
  }

  useEffect(() => {
    fetchLeadLists()
  }, [])

  // Handle list selection
  const handleListSelect = (list: LeadList) => {
    setSelectedList(list)
    setFilteredLeadCount(null) // Reset filtered count
    setDuplicateResults(null) // Reset duplicate results
    onListSelect(list.id, list)
    fetchPreviewData(list.id)
  }

  // Handle clearing selection
  const handleClearSelection = () => {
    setSelectedList(null)
    setPreviewData([])
    setFilteredLeadCount(null)
    setDuplicateResults(null)
    onClearSelection()
  }

  // Handle duplicate choice - Continue with all leads
  const handleContinueWithAll = () => {
    setShowDuplicateModal(false)
    // Keep original count
    setFilteredLeadCount(null)
    if (selectedList) {
      onListSelect(selectedList.id, selectedList, selectedList.activeLeads)
    }
  }

  // Handle duplicate choice - Skip duplicates
  const handleSkipDuplicates = () => {
    setShowDuplicateModal(false)
    if (selectedList && duplicateResults) {
      const newCount = selectedList.activeLeads - duplicateResults.existingInDatabase
      setFilteredLeadCount(newCount)
      onListSelect(selectedList.id, selectedList, newCount)
    }
  }

  // Close duplicate modal without changes
  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false)
  }

  // Filter lead lists
  const filteredLeadLists = leadLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get health status for a list
  const getHealthStatus = (list: LeadList) => {
    if (list.totalLeads === 0) {
      return { color: 'gray', label: 'Empty', icon: AlertCircle }
    }
    
    const activePercentage = (list.activeLeads / list.totalLeads) * 100
    
    if (activePercentage >= 80) {
      return { color: 'green', label: 'Healthy', icon: CheckCircle }
    } else if (activePercentage >= 50) {
      return { color: 'yellow', label: 'Fair', icon: Users }
    } else {
      return { color: 'red', label: 'Needs Attention', icon: AlertCircle }
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to Load Lead Lists</h3>
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={fetchLeadLists}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Lead List</h3>
        <p className="text-gray-500 mb-4">
          Choose which lead list to use for this campaign
        </p>
      </div>

      {/* Selected List Summary (if selected) */}
      {selectedList && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base text-blue-900">
                    Selected: {selectedList.name}
                  </CardTitle>
                  {selectedList.description && (
                    <p className="text-sm text-blue-700 mt-1">
                      {selectedList.description}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                Change Selection
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedList.totalLeads.toLocaleString()}
                </div>
                <div className="text-xs text-blue-700">Total Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredLeadCount !== null ? filteredLeadCount.toLocaleString() : selectedList.activeLeads.toLocaleString()}
                </div>
                <div className="text-xs text-green-700">
                  Active Leads {filteredLeadCount !== null && `(${duplicateResults?.existingInDatabase || 0} duplicates skipped)`}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(((filteredLeadCount !== null ? filteredLeadCount : selectedList.activeLeads) / selectedList.totalLeads) * 100) || 0}%
                </div>
                <div className="text-xs text-purple-700">Active Rate</div>
              </div>
            </div>

            {/* Duplicate Check Button */}
            <div className="border-t border-blue-200 pt-4 mb-4">
              <Button 
                onClick={checkForDuplicates}
                disabled={isCheckingDuplicates}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                {isCheckingDuplicates ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking duplicates...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Check for Duplicates
                  </>
                )}
              </Button>
              {duplicateResults && (
                <div className="text-xs text-blue-600 mt-2 text-center">
                  {duplicateResults.existingInDatabase > 0 
                    ? `✓ Found ${duplicateResults.existingInDatabase} duplicates in other campaigns`
                    : '✓ No duplicates found'
                  }
                </div>
              )}
            </div>

            {/* Preview Data */}
            <div className="border-t border-blue-200 pt-4">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Preview (first 3 leads):
              </div>
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading preview...</span>
                </div>
              ) : previewData.length > 0 ? (
                <div className="space-y-2">
                  {previewData.map((lead, index) => (
                    <div key={lead.id} className="flex items-center gap-4 text-sm text-blue-800 bg-blue-100 rounded p-2">
                      <span className="font-medium">{lead.email}</span>
                      {lead.firstName && <span>{lead.firstName}</span>}
                      {lead.lastName && <span>{lead.lastName}</span>}
                      {lead.company && <span className="text-blue-600">({lead.company})</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-600">No preview data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {!selectedList && (
        <>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search lead lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lead Lists Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
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
                ) : leadLists.length === 0 ? (
                  <>
                    <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No lead lists yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                      You need to create or upload lead lists before creating campaigns.
                    </p>
                    <div className="flex justify-center gap-3">
                      <Link href="/leads/lists/upload">
                        <Button>
                          <FileText className="h-4 w-4 mr-2" />
                          Upload CSV
                        </Button>
                      </Link>
                      <Link href="/leads/lists/new">
                        <Button variant="outline">
                          <Database className="h-4 w-4 mr-2" />
                          Create List
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeadLists.map((list) => {
                const healthStatus = getHealthStatus(list)
                const HealthIcon = healthStatus.icon

                return (
                  <Card 
                    key={list.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200"
                    onClick={() => handleListSelect(list)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg font-medium truncate">
                            {list.name}
                          </CardTitle>
                          {list.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {list.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">
                              {list.totalLeads.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-600">Total Leads</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {list.activeLeads.toLocaleString()}
                            </div>
                            <div className="text-xs text-blue-700">Active</div>
                          </div>
                        </div>

                        {/* Health Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HealthIcon className={`h-4 w-4 ${
                              healthStatus.color === 'green' ? 'text-green-500' :
                              healthStatus.color === 'yellow' ? 'text-yellow-500' :
                              healthStatus.color === 'red' ? 'text-red-500' :
                              'text-gray-500'
                            }`} />
                            <span className={`text-sm font-medium ${
                              healthStatus.color === 'green' ? 'text-green-700' :
                              healthStatus.color === 'yellow' ? 'text-yellow-700' :
                              healthStatus.color === 'red' ? 'text-red-700' :
                              'text-gray-700'
                            }`}>
                              {healthStatus.label}
                            </span>
                          </div>
                          
                          {list.totalLeads > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {Math.round((list.activeLeads / list.totalLeads) * 100)}% Active
                            </Badge>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Created {formatDistanceToNow(new Date(list.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Duplicate Check Results Modal */}
      {showDuplicateModal && duplicateResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Duplicate Check Results</h3>
              <Button variant="ghost" size="sm" onClick={handleCloseDuplicateModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {duplicateResults.existingInDatabase > 0 ? (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="font-medium text-orange-900">
                        Found {duplicateResults.existingInDatabase} duplicate leads
                      </span>
                    </div>
                    <p className="text-sm text-orange-700">
                      These leads already exist in other campaigns or lists. What would you like to do?
                    </p>
                  </div>

                  {/* Show duplicate details */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Duplicate Leads:</h4>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {duplicateResults.duplicateDetails.slice(0, 10).map((duplicate, index) => (
                        <div key={index} className="p-3 border-b border-gray-100 last:border-b-0">
                          <div className="font-medium text-gray-900 text-sm">{duplicate.email}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Found in: {duplicate.existingInLists.map(list => list.listName).join(', ')}
                          </div>
                        </div>
                      ))}
                      {duplicateResults.duplicateDetails.length > 10 && (
                        <div className="p-3 text-center text-sm text-gray-500">
                          ... and {duplicateResults.duplicateDetails.length - 10} more duplicates
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleContinueWithAll}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Continue with All Leads
                      <span className="ml-2 text-sm opacity-75">
                        ({selectedList?.activeLeads} leads)
                      </span>
                    </Button>
                    <Button 
                      onClick={handleSkipDuplicates}
                      variant="outline"
                      className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      Skip Duplicates
                      <span className="ml-2 text-sm opacity-75">
                        ({(selectedList?.activeLeads || 0) - duplicateResults.existingInDatabase} leads)
                      </span>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-green-900">
                        No duplicates found!
                      </span>
                    </div>
                    <p className="text-sm text-green-700">
                      All {duplicateResults.total} leads in this list are unique.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      onClick={handleCloseDuplicateModal}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Continue with Campaign
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}