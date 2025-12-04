'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Upload, FileText, CheckCircle, X, AlertCircle, ChevronLeft, ChevronRight, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ProtectedRoute from '../../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../../components/layout/AppLayout'
import { Button } from '../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../components/ui/card'
import { Alert, AlertDescription } from '../../../../../components/ui/alert'
import { api } from '../../../../../lib/api'
import { Progress } from '../../../../../components/ui/progress'
import FieldMapper from '../../../../../components/leads/FieldMapper'
import UploadProgress from '../../../../../components/leads/UploadProgress'

interface LeadList {
  id: string
  name: string
  description?: string
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

type UploadStep = 'upload' | 'mapping' | 'uploading' | 'completed'

function UploadToListContent() {
  const params = useParams()
  const router = useRouter()
  const listId = params.id as string

  const [leadList, setLeadList] = useState<LeadList | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload')
  const [totalRows, setTotalRows] = useState<number>(0)
  const [fieldMapping, setFieldMapping] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [batchInfo, setBatchInfo] = useState<{current: number, total: number, leadCount: number} | null>(null)
  const [processedLeads, setProcessedLeads] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [uploadResults, setUploadResults] = useState<CSVUploadResults | null>(null)
  const [error, setError] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)

  // Fetch lead list info
  useEffect(() => {
    const fetchLeadList = async () => {
      try {
        const response = await api.get(`/leads/lists/${listId}`)
        setLeadList(response.data.leadList)
      } catch (err) {
        console.error('Error fetching lead list:', err)
        setError('Failed to load lead list')
      } finally {
        setIsLoadingList(false)
      }
    }

    if (listId) {
      fetchLeadList()
    }
  }, [listId])

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  // Enhanced progress tracking
  const startProgressTracking = (uploadId: string) => {
    console.log('Starting progress tracking for uploadId:', uploadId)

    const token = localStorage.getItem('token')
    if (!token) {
      console.error('No auth token found')
      return
    }

    setStartTime(Date.now())

    if (totalRows) {
      const BATCH_SIZE = 200
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE)
      setBatchInfo({
        current: 0,
        total: totalBatches,
        leadCount: totalRows
      })
    }

    const eventSourceUrl = `/api/leads/lists/upload-progress/${uploadId}?token=${encodeURIComponent(token)}`
    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${eventSourceUrl}`

    const es = new EventSource(fullUrl)
    let pollInterval: NodeJS.Timeout | null = null

    es.onopen = () => {
      setProgressMessage('Connected to processing status...')
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        updateProgressState(data)

        if (data.progress >= 100 || data.progress === -1) {
          es.close()
          setEventSource(null)
          if (pollInterval) clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    es.onerror = () => {
      es.close()
      setEventSource(null)

      pollInterval = setInterval(async () => {
        try {
          const response = await api.get(`/leads/lists/upload-progress-poll/${uploadId}`)
          const data = response.data
          updateProgressState(data)

          if (data.progress >= 100 || data.progress === -1) {
            if (pollInterval) clearInterval(pollInterval)
          }
        } catch (pollError) {
          console.error('Polling error:', pollError)
        }
      }, 2000)
    }

    setEventSource(es)
  }

  const updateProgressState = (data: any) => {
    setUploadProgress(data.progress || 0)
    setProgressMessage(data.message || '')

    if (data.message && data.message.includes('batch')) {
      const batchMatch = data.message.match(/batch (\d+)\/(\d+)/)
      if (batchMatch && batchInfo) {
        setBatchInfo(prev => prev ? {
          ...prev,
          current: parseInt(batchMatch[1])
        } : null)
      }
    }

    if (data.progress && totalRows) {
      const processed = Math.floor((data.progress / 100) * totalRows)
      setProcessedLeads(processed)

      if (startTime && data.progress > 5) {
        const elapsed = Date.now() - startTime
        const remainingProgress = 100 - data.progress
        const estimatedRemaining = (elapsed / data.progress) * remainingProgress
        setEstimatedTimeRemaining(Math.round(estimatedRemaining / 1000))
      }
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
    setError('')
    setUploadResults(null)
    setFieldMapping(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        if (!text) return
        const lines = text.split('\n').filter(line => line.trim())
        setTotalRows(lines.length - 1)
      } catch (error) {
        console.error('Error processing file:', error)
        setError('Error reading file content')
      }
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(selectedFile)
  }, [])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  // Handle field mapping completion
  const handleMappingComplete = (mapping: any) => {
    setFieldMapping(mapping)
    handleUpload(mapping)
  }

  const handleNext = () => {
    if (file) {
      setCurrentStep('mapping')
    }
  }

  // Upload CSV to existing list
  const handleUpload = async (mapping?: any) => {
    if (!file || !listId) {
      setError('Please select a file')
      return
    }

    setCurrentStep('uploading')
    setIsUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      console.log('Starting CSV upload to list:', listId)

      const formData = new FormData()
      formData.append('csvFile', file)

      if (mapping) {
        formData.append('fieldMapping', JSON.stringify(mapping))
      }

      const response = await api.post(`/leads/lists/${listId}/upload-csv`, formData)

      if (response.data.uploadId) {
        setUploadId(response.data.uploadId)
        startProgressTracking(response.data.uploadId)
      } else {
        setUploadProgress(100)
      }

      const results = response.data

      const transformedResults: CSVUploadResults = {
        leadList: {
          id: listId,
          name: leadList?.name || 'Lead List',
          totalLeads: results.inserted || 0
        },
        importResults: {
          imported: results.inserted || 0,
          duplicatesRemoved: results.duplicates || 0,
          errors: results.failed || results.errors?.length || 0
        }
      }

      setUploadResults(transformedResults)
      setCurrentStep('completed')

    } catch (error: any) {
      console.error('Upload failed:', error)
      setError(error.response?.data?.message || error.message || 'Upload failed')
      setCurrentStep('upload')
    } finally {
      setIsUploading(false)
    }
  }

  // Navigate to lead list
  const viewLeadList = () => {
    router.push(`/leads/lists/${listId}`)
  }

  // Reset component
  const resetUpload = () => {
    setFile(null)
    setCurrentStep('upload')
    setFieldMapping(null)
    setUploadResults(null)
    setError('')
    setUploadProgress(0)
    setIsUploading(false)
    setProgressMessage('')
    setBatchInfo(null)
    setProcessedLeads(0)
    setEstimatedTimeRemaining(null)
    setStartTime(null)
    setUploadId(null)

    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
  }

  if (isLoadingList) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!leadList) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Lead List Not Found</h3>
            <p className="text-gray-500 mb-4">The lead list you're looking for doesn't exist.</p>
            <Link href="/leads/lists">
              <Button>Back to Lead Lists</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/leads/lists/${listId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {leadList.name}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Upload CSV to "{leadList.name}"
          </h1>
          <p className="text-gray-600">Add leads to this existing list from a CSV file</p>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center space-x-6 mb-8">
          {[
            { step: 'upload', label: 'Select File', icon: Upload, active: currentStep === 'upload' },
            { step: 'mapping', label: 'Map Fields', icon: FileText, active: currentStep === 'mapping' },
            { step: 'uploading', label: 'Processing', icon: Users, active: currentStep === 'uploading' },
            { step: 'completed', label: 'Complete', icon: CheckCircle, active: currentStep === 'completed' }
          ].map(({ step, label, icon: Icon, active }, index) => (
            <div key={step} className="flex flex-col items-center text-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : index < ['upload', 'mapping', 'uploading', 'completed'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {index < ['upload', 'mapping', 'uploading', 'completed'].indexOf(currentStep) && !active ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div className={`mt-2 text-sm font-medium ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {currentStep === 'upload' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                {/* Drag & Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50'
                      : file
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="space-y-4">
                      <FileText className="h-16 w-16 mx-auto text-green-600" />
                      <div>
                        <div className="text-xl font-semibold text-green-800">{file.name}</div>
                        <div className="flex items-center justify-center space-x-4 text-sm text-green-600 mt-2">
                          <span className="bg-green-100 px-3 py-1 rounded-full">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="bg-green-100 px-3 py-1 rounded-full">
                            {totalRows.toLocaleString()} rows
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="mt-4 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className={`h-16 w-16 mx-auto ${
                        isDragOver ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className="text-xl font-semibold text-gray-900 mb-2">
                          {isDragOver ? 'Drop your CSV file here!' : 'Upload your CSV file'}
                        </div>
                        <div className="text-gray-600">
                          Drag and drop your file here, or{' '}
                          <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium underline">
                            browse to select
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                        <span>CSV format</span>
                        <span>Max 10MB</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center">
              <Link href={`/leads/lists/${listId}`}>
                <Button variant="outline">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handleNext}
                disabled={!file}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue to Mapping
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'mapping' && file && (
          <FieldMapper
            file={file}
            onMappingComplete={handleMappingComplete}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {(currentStep === 'uploading' || currentStep === 'completed') && (
          <UploadProgress
            uploadProgress={uploadProgress}
            progressMessage={progressMessage}
            batchInfo={batchInfo}
            processedLeads={processedLeads}
            estimatedTimeRemaining={estimatedTimeRemaining}
            uploadResults={uploadResults}
            uploadError={error}
            onUploadAnother={resetUpload}
            onViewList={viewLeadList}
          />
        )}
      </div>
    </div>
  )
}

export default function UploadToListPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <UploadToListContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
