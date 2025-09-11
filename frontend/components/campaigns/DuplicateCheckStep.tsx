'use client'

import React, { useState } from 'react'
import { Search, Users, AlertTriangle, CheckCircle, Copy, Loader2, SkipForward, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

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

interface DuplicateCheckStepProps {
  selectedLeadListId?: string
  selectedLeadListName?: string
  selectedLeadListCount?: number
  onDuplicateCheckComplete: (skipped: boolean, filteredCount?: number) => void
  className?: string
}

export default function DuplicateCheckStep({
  selectedLeadListId,
  selectedLeadListName = 'Unknown List',
  selectedLeadListCount = 0,
  onDuplicateCheckComplete,
  className = ''
}: DuplicateCheckStepProps) {
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false)
  const [duplicateResults, setDuplicateResults] = useState<DuplicateCheckResult | null>(null)
  const [hasChecked, setHasChecked] = useState(false)

  const checkForDuplicates = async () => {
    if (!selectedLeadListId) {
      alert('Please select a lead list first')
      return
    }

    setIsCheckingDuplicates(true)
    try {
      console.log('🔍 Checking for duplicates in list:', selectedLeadListId)
      
      const response = await api.post('/leads/lists/check-duplicates', {
        leadListId: selectedLeadListId
      })
      
      console.log('✅ Duplicate check response:', response.data)
      setDuplicateResults(response.data)
      setHasChecked(true)
    } catch (error) {
      console.error('❌ Error checking duplicates:', error)
      alert('Failed to check for duplicates. Please try again.')
    } finally {
      setIsCheckingDuplicates(false)
    }
  }

  const handleSkipDuplicateCheck = () => {
    console.log('⏭️ User skipped duplicate check')
    onDuplicateCheckComplete(true, selectedLeadListCount)
  }

  const handleContinueWithDuplicates = () => {
    console.log('✅ User chose to continue with all leads including duplicates')
    onDuplicateCheckComplete(false, selectedLeadListCount)
  }

  const handleSkipDuplicates = () => {
    const filteredCount = selectedLeadListCount - (duplicateResults?.existingInDatabase || 0)
    console.log('🚫 User chose to skip duplicate leads, filtered count:', filteredCount)
    onDuplicateCheckComplete(false, filteredCount)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Search className="h-12 w-12 text-purple-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Check for Duplicates</h3>
        <p className="text-gray-500 mb-4">
          Ensure your campaign reaches unique leads by checking for duplicates across your database
        </p>
      </div>

      {/* Selected List Summary */}
      {selectedLeadListId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base text-blue-900">
                    Selected: {selectedLeadListName}
                  </CardTitle>
                  <p className="text-sm text-blue-700 mt-1">
                    {selectedLeadListCount.toLocaleString()} leads ready for campaign
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Duplicate Check Options */}
      {!hasChecked ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Check for Duplicates */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={!isCheckingDuplicates ? checkForDuplicates : undefined}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Copy className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Check for Duplicates</CardTitle>
                  <p className="text-sm text-gray-600">Recommended for better deliverability</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-700 mb-4">
                Scan your database to identify leads that have already been contacted in other campaigns. This helps prevent spam complaints and improves engagement rates.
              </p>
              <Button 
                onClick={checkForDuplicates}
                disabled={isCheckingDuplicates || !selectedLeadListId}
                className="w-full"
              >
                {isCheckingDuplicates ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Check for Duplicates
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Skip Check */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleSkipDuplicateCheck}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <SkipForward className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Skip Duplicate Check</CardTitle>
                  <p className="text-sm text-gray-600">Continue without checking</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-700 mb-4">
                Proceed directly to email account selection. Use this option if you're confident your lead list doesn't contain duplicates or if this is a new audience.
              </p>
              <Button 
                variant="outline" 
                onClick={handleSkipDuplicateCheck}
                className="w-full"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip & Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Duplicate Check Results */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Duplicate Check Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{duplicateResults?.total || 0}</div>
                <div className="text-sm text-blue-700">Total Leads</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{duplicateResults?.existingInDatabase || 0}</div>
                <div className="text-sm text-orange-700">Duplicates Found</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(duplicateResults?.total || 0) - (duplicateResults?.existingInDatabase || 0)}
                </div>
                <div className="text-sm text-green-700">Unique Leads</div>
              </div>
            </div>

            {/* Results Message */}
            <div className="text-center">
              {(duplicateResults?.existingInDatabase || 0) > 0 ? (
                <div className="flex items-center justify-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Found {duplicateResults?.existingInDatabase} duplicate leads in your database</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span>Great! No duplicates found - all leads are unique</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(duplicateResults?.existingInDatabase || 0) > 0 ? (
                <>
                  <Button onClick={handleSkipDuplicates} className="flex-1 sm:flex-none">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Skip Duplicates ({(duplicateResults?.total || 0) - (duplicateResults?.existingInDatabase || 0)} leads)
                  </Button>
                  <Button variant="outline" onClick={handleContinueWithDuplicates} className="flex-1 sm:flex-none">
                    Continue with All ({duplicateResults?.total || 0} leads)
                  </Button>
                </>
              ) : (
                <Button onClick={handleContinueWithDuplicates} className="flex-1 sm:flex-none">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue with All Leads ({duplicateResults?.total || 0})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}