'use client'

import React from 'react'

import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'

interface UploadProgressProps {
  uploadProgress: number
  progressMessage: string
  batchInfo: { current: number; total: number; leadCount: number } | null
  processedLeads: number
  estimatedTimeRemaining: number | null
  uploadResults: CSVUploadResults | null
  uploadError: string | null
  onUploadAnother: () => void
  onViewList: (listId: string) => void
}

interface CSVUploadResults {
  leadList: {
    id: string
    name: string
    totalLeads: number
  }
  importResults: {
    imported: number
    duplicatesRemoved: number
    errors: number
  }
}

export default function UploadProgress({ 
  uploadProgress,
  progressMessage,
  batchInfo,
  processedLeads,
  estimatedTimeRemaining,
  uploadResults,
  uploadError,
  onUploadAnother,
  onViewList
}: UploadProgressProps) {

  // Error state
  if (uploadError) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Failed</h2>
            <p className="text-gray-600 mb-8">
              {uploadError}
            </p>

            <Button onClick={onUploadAnother} className="px-8">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (uploadResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border shadow-sm bg-green-50">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-green-600 mb-2">Import Completed</h2>
            <p className="text-gray-700 mb-8">
              Successfully imported {uploadResults.importResults.imported} leads to "{uploadResults.leadList.name}"
            </p>

            <div className="flex justify-center mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {uploadResults.importResults.imported}
                </div>
                <div className="text-lg font-medium text-gray-700">Imported</div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={() => onViewList(uploadResults.leadList.id)} className="px-6">
                View Lead List
              </Button>
              <Button variant="outline" onClick={onUploadAnother} className="px-6">
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border shadow-sm">
        <CardContent className="p-8 text-center">
          {/* Main Progress Spinner */}
          <div className="mb-8">
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
              <div className="animate-spin rounded-full h-24 w-24 border-4 border-gray-200 border-t-purple-600"></div>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing CSV File</h2>
            <p className="text-gray-600">
              This may require a couple of minutes
            </p>
          </div>

          {/* Progress Stats */}
          <div className={`grid gap-6 mb-8 ${
            (batchInfo || estimatedTimeRemaining !== null) ? 'grid-cols-2' : 'grid-cols-1'
          }`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {processedLeads.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                of {batchInfo?.leadCount ? Number(batchInfo.leadCount).toLocaleString() : '—'} leads
              </div>
            </div>
            
            {batchInfo && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {batchInfo.current}/{batchInfo.total}
                </div>
                <div className="text-sm text-gray-600">batches complete</div>
              </div>
            )}
            
            {!batchInfo && estimatedTimeRemaining !== null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {estimatedTimeRemaining > 60 ? 
                    `${Math.ceil(estimatedTimeRemaining / 60)}m` : 
                    `${estimatedTimeRemaining}s`
                  }
                </div>
                <div className="text-sm text-gray-600">remaining</div>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-sm text-gray-500">
            Please keep this tab open while processing completes
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
