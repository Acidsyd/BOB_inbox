'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, CheckCircle, Download, X, AlertCircle, ChevronLeft, ChevronRight, Users, FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { api } from '../../lib/api'
import { Progress } from '../ui/progress'
import { useToast } from '../ui/toast'
import FieldMapper from './FieldMapper'
import UploadProgress from './UploadProgress'

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

export default function CSVUploader() {
  const router = useRouter()
  const { addToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [listName, setListName] = useState('')
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload')
  const [totalRows, setTotalRows] = useState<number>(0)
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null)
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

  // Clean up EventSource on unmount
  React.useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  // Enhanced progress tracking with polling and detailed feedback
  const startProgressTracking = (uploadId: string) => {
    console.log('🔄 Starting enhanced progress tracking for uploadId:', uploadId)
    
    const token = localStorage.getItem('token')
    if (!token) {
      console.error('❌ No auth token found for progress tracking')
      return
    }
    
    // Set start time for ETA calculation
    setStartTime(Date.now())
    
    // Calculate estimated batch info from CSV data
    if (totalRows) {
      const BATCH_SIZE = 200
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE)
      setBatchInfo({
        current: 0,
        total: totalBatches,
        leadCount: totalRows
      })
    }

    // Try EventSource first, fallback to polling
    const eventSourceUrl = `/api/leads/lists/upload-progress/${uploadId}?token=${encodeURIComponent(token)}`
    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${eventSourceUrl}`
    console.log('🌐 EventSource URL:', fullUrl)
    
    const es = new EventSource(fullUrl)
    let pollInterval: NodeJS.Timeout | null = null

    es.onopen = () => {
      console.log('✅ EventSource connection opened')
      setProgressMessage('Connected to processing status...')
    }

    es.onmessage = (event) => {
      try {
        console.log('📨 Progress update received:', event.data)
        const data = JSON.parse(event.data)
        
        updateProgressState(data)
        
        if (data.progress >= 100 || data.progress === -1) {
          console.log('🏁 Progress complete, closing EventSource')
          es.close()
          setEventSource(null)
          if (pollInterval) clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('❌ Error parsing SSE data:', error)
      }
    }

    es.onerror = (error) => {
      console.error('❌ SSE connection error, falling back to polling:', error)
      es.close()
      setEventSource(null)
      
      // Fallback to polling every 2 seconds
      pollInterval = setInterval(async () => {
        try {
          const response = await api.get(`/leads/lists/upload-progress-poll/${uploadId}`)
          const data = response.data
          
          updateProgressState(data)
          
          if (data.progress >= 100 || data.progress === -1) {
            if (pollInterval) clearInterval(pollInterval)
          }
        } catch (pollError) {
          console.error('❌ Polling error:', pollError)
          // Don't clear interval on error, keep trying
        }
      }, 2000)
    }

    setEventSource(es)
    console.log('🎯 Enhanced progress tracking set up')
  }

  // Helper function to update progress state
  const updateProgressState = (data: any) => {
    setUploadProgress(data.progress || 0)
    setProgressMessage(data.message || '')
    
    // Extract batch information from message
    if (data.message && data.message.includes('batch')) {
      const batchMatch = data.message.match(/batch (\d+)\/(\d+)/)
      if (batchMatch && batchInfo) {
        setBatchInfo(prev => prev ? {
          ...prev,
          current: parseInt(batchMatch[1])
        } : null)
      }
    }
    
    // Calculate processed leads and ETA
    if (data.progress && totalRows) {
      const processed = Math.floor((data.progress / 100) * totalRows)
      setProcessedLeads(processed)
      
      // Calculate ETA if we have enough data
      if (startTime && data.progress > 5) {
        const elapsed = Date.now() - startTime
        const remainingProgress = 100 - data.progress
        const estimatedRemaining = (elapsed / data.progress) * remainingProgress
        setEstimatedTimeRemaining(Math.round(estimatedRemaining / 1000)) // Convert to seconds
      }
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
    setError('')
    setUploadResults(null)
    setFieldMapping(null)

    // Auto-generate list name from file name
    const fileName = selectedFile.name.replace('.csv', '').replace(/_/g, ' ')
    setListName(fileName.charAt(0).toUpperCase() + fileName.slice(1))

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split('\n').filter(line => line.trim());
      setTotalRows(lines.length - 1);
    };
    reader.readAsText(selectedFile);
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
  const handleMappingComplete = (mapping: FieldMapping) => {
    setFieldMapping(mapping)
    handleUpload(mapping)
  }

  // Handle skip field mapping
  const handleSkipMapping = () => {
    // TODO: Implement skip mapping logic
    handleUpload()
  }

  const handleNext = () => {
    if (file && listName) {
      setCurrentStep('mapping')
    }
  }

  

  // Upload CSV
  const handleUpload = async (mapping?: FieldMapping) => {
    if (!file || !listName) {
      setError('Please select a file and enter a list name')
      return
    }

    setCurrentStep('uploading')
    setIsUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      console.log('🚀 Starting CSV upload:', { fileName: file.name, listName, mapping })
      
      const formData = new FormData()
      formData.append('csvFile', file)  // Changed from 'file' to 'csvFile' to match backend
      formData.append('listName', listName)
      
      // Include field mapping if provided
      if (mapping) {
        formData.append('fieldMapping', JSON.stringify(mapping))
        console.log('📊 Field mapping included:', mapping)
      }

      console.log('📤 Making API request to /leads/lists/upload...')
      const response = await api.post('/leads/lists/upload', formData)
      console.log('✅ Upload API response:', response.status, response.data)

      // Start real-time progress tracking if uploadId is provided
      if (response.data.uploadId) {
        console.log('🔄 Starting progress tracking with uploadId:', response.data.uploadId)
        setUploadId(response.data.uploadId)
        startProgressTracking(response.data.uploadId)
      } else {
        console.log('⚡ No uploadId provided, completing immediately')
        // Fallback to immediate completion if no uploadId
        setUploadProgress(100)
      }

      const results = response.data
      console.log('📋 Processing results:', results)
      
      // Transform backend response to match frontend interface
      const transformedResults: CSVUploadResults = {
        leadList: {
          id: results.listId,
          name: listName,
          description: '',
          totalLeads: results.inserted,
          createdAt: new Date().toISOString()
        },
        importResults: {
          totalProcessed: results.inserted + results.duplicates + results.errors,
          imported: results.inserted,
          duplicates: results.duplicates,
          errors: results.errors
        }
      }
      
      console.log('✨ Upload complete, showing results:', transformedResults)
      setUploadResults(transformedResults)
      setCurrentStep('completed')

    } catch (error) {
      console.error('❌ Upload failed:', error)
      if (error.response) {
        console.error('📡 API Error Response:', error.response.status, error.response.data)
      }
      setError(error.response?.data?.message || error.message || 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }


  // Navigate to lead list
  const viewLeadList = (listId: string) => {
    console.log('🔍 Navigating to lead list:', listId)
    // Navigate to the lead list detail page
    router.push(`/leads/lists/${listId}`)
  }


  // Download CSV template
  const downloadTemplate = () => {
    const templateData = [
      ['email', 'first_name', 'last_name', 'company', 'phone', 'job_title'],
      ['john.doe@example.com', 'John', 'Doe', 'Example Corp', '+1-555-0123', 'Software Engineer'],
      ['jane.smith@techco.com', 'Jane', 'Smith', 'Tech Co', '+1-555-0456', 'Product Manager'],
      ['mike.johnson@startup.io', 'Mike', 'Johnson', 'Startup Inc', '+1-555-0789', 'CEO']
    ]
    
    const csvContent = templateData
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'leads_template.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  // Reset component
  const resetUpload = () => {
    setFile(null)
    setListName('')
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
    
    // Close any active EventSource
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Enhanced Header with Progress Indicator */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FileSpreadsheet className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Import Leads</h1>
          </div>
          <p className="text-lg text-gray-600">Upload your CSV file and map fields to import leads</p>
          
          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            {[
              { step: 'upload', label: 'Upload', icon: Upload },
              { step: 'mapping', label: 'Map Fields', icon: FileText },
              { step: 'uploading', label: 'Processing', icon: Users },
              { step: 'completed', label: 'Import Completed', icon: CheckCircle }
            ].map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep === step 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : index < ['upload', 'mapping', 'uploading', 'completed'].indexOf(currentStep)
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {index < ['upload', 'mapping', 'uploading', 'completed'].indexOf(currentStep) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === step ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {label}
                </span>
                {index < 2 && (
                  <ChevronRight className="h-4 w-4 text-gray-300 ml-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {currentStep === 'upload' && (
          <div className="space-y-8">
            {/* File Upload Section */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                {/* Enhanced Drag & Drop Area */}
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 transform ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg' 
                      : file 
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 hover:shadow-md'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  {/* Animated Background Pattern */}
                  <div className={`absolute inset-0 rounded-2xl transition-opacity ${
                    isDragOver ? 'opacity-20' : 'opacity-0'
                  }`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl animate-pulse"></div>
                  </div>
                  
                  <div className="relative z-10">
                    {file ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <FileText className="h-16 w-16 mx-auto text-green-600" />
                          <div className="absolute -top-2 -right-2 bg-green-100 rounded-full p-1">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xl font-semibold text-green-800">{file.name}</div>
                          <div className="flex items-center justify-center space-x-4 text-sm text-green-600">
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
                          className="mt-4 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative">
                          <Upload className={`h-20 w-20 mx-auto transition-all duration-300 ${
                            isDragOver ? 'text-blue-600 animate-bounce' : 'text-gray-400'
                          }`} />
                          <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                            isDragOver ? 'animate-ping bg-blue-400 opacity-20' : 'opacity-0'
                          }`}></div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-2xl font-semibold text-gray-900 mb-2">
                              {isDragOver ? 'Drop your CSV file here!' : 'Upload your CSV file'}
                            </div>
                            <div className="text-gray-600">
                              Drag and drop your file here, or{' '}
                              <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium underline transition-colors">
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
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              CSV format
                            </div>
                            <div className="flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Max 10MB
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simple Template Download */}
                <div className="mt-8 text-center">
                  <p className="text-gray-600 mb-2">Need help with formatting?</p>
                  <button
                    onClick={downloadTemplate}
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    Download sample template
                  </button>
                </div>

                {/* List Name Input */}
                <div className="mt-8 space-y-2">
                  <Label htmlFor="listName" className="text-lg font-medium text-gray-900">
                    List Name *
                  </Label>
                  <Input
                    id="listName"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="Enter a name for your lead list (e.g., 'Q1 2024 Prospects')"
                    className="h-12 text-lg border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    required
                  />
                  <p className="text-sm text-gray-500">This will help you identify your list later</p>
                </div>
              </CardContent>
            </Card>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isUploading}
                className="h-12 px-6"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!file || !listName}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg font-medium"
                size="lg"
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