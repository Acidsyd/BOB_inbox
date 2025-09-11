'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertCircle, CheckCircle, X, ArrowRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/lib/api'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/toast'
import FieldMapper from './FieldMapper'

interface CSVUploadResults {
  leadList: {
    id: string
    name: string
    description: string
    totalLeads: number
    createdAt: string
  }
  importResults: {
    totalProcessed: number
    imported: number
    duplicates: number
    errors: number
  }
}

interface CSVColumn {
  name: string
  sample: string[]
  index: number
}

interface FieldMapping {
  [fieldKey: string]: string | null
}

interface CSVPreviewData {
  columns: CSVColumn[]
  rows: string[][]
  allDataRows: string[][]  // Store all CSV data for CSV-level duplicate checking
  totalRows: number
  duplicates: number
}


type UploadStep = 'file' | 'preview' | 'mapping' | 'uploading' | 'results'

export default function CSVUploader() {
  const router = useRouter()
  const { addToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [listName, setListName] = useState('')
  const [currentStep, setCurrentStep] = useState<UploadStep>('file')
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null)
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
    if (csvPreview?.totalRows) {
      const BATCH_SIZE = 200
      const totalBatches = Math.ceil(csvPreview.totalRows / BATCH_SIZE)
      setBatchInfo({
        current: 0,
        total: totalBatches,
        leadCount: csvPreview.totalRows
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
    if (data.progress && csvPreview?.totalRows) {
      const processed = Math.floor((data.progress / 100) * csvPreview.totalRows)
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
    setCsvPreview(null)
    setFieldMapping(null)
    setCurrentStep('file')

    // Auto-generate list name from file name
    if (!listName) {
      const fileName = selectedFile.name.replace('.csv', '').replace(/_/g, ' ')
      setListName(fileName.charAt(0).toUpperCase() + fileName.slice(1))
    }

    // Parse CSV preview
    parseCSVPreview(selectedFile)
  }, [listName])


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

  // Proper CSV parsing function that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i += 2
        } else {
          // Toggle quotes
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }

    // Add the last field
    result.push(current.trim())
    return result
  }

  // Parse CSV for preview and field mapping
  const parseCSVPreview = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return

      try {
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          setError('CSV file must have at least a header row and one data row')
          return
        }

        console.log('🔍 Parsing CSV with', lines.length, 'lines');
        console.log('📄 First few lines:', lines.slice(0, 3));

        // Parse header using proper CSV parsing
        const headers = parseCSVLine(lines[0])
        console.log('📋 Parsed headers:', headers);
        
        // Parse all data rows for duplicate detection using proper CSV parsing
        const allDataRows = lines.slice(1).map(line => parseCSVLine(line))
        console.log('📊 Parsed', allDataRows.length, 'data rows');
        console.log('📝 First data row:', allDataRows[0]);
        
        // Parse sample data rows (first 10 rows)
        const dataRows = allDataRows.slice(0, 10)

        // Build column information
        const columns: CSVColumn[] = headers.map((header, index) => ({
          name: header,
          index,
          sample: dataRows.map(row => row[index] || '').filter(Boolean).slice(0, 5)
        }))

        // Enhanced email column detection
        let emailColumnIndex = -1
        
        // Method 1: Look for column names containing "email"
        emailColumnIndex = headers.findIndex(header => 
          header.toLowerCase().includes('email') || 
          header.toLowerCase() === 'e-mail' || 
          header.toLowerCase() === 'mail'
        )
        
        // Method 2: If not found, look for columns with email-like content
        if (emailColumnIndex === -1) {
          for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            const sampleValues = dataRows.map(row => row[colIndex] || '').filter(Boolean)
            const emailCount = sampleValues.filter(value => 
              value.includes('@') && value.includes('.')
            ).length
            
            // If >50% of values look like emails, this is probably the email column
            if (emailCount > sampleValues.length * 0.5) {
              emailColumnIndex = colIndex
              console.log(`📧 Found email column at index ${colIndex} (${headers[colIndex]}) - ${emailCount}/${sampleValues.length} values contain @`);
              break
            }
          }
        }
        
        console.log('📧 Email column detection result:', {
          emailColumnIndex,
          columnName: emailColumnIndex >= 0 ? headers[emailColumnIndex] : 'NOT FOUND',
          totalColumns: headers.length
        });

        // Simple duplicate detection - count duplicates in CSV
        let duplicateCount = 0
        
        if (emailColumnIndex !== -1) {
          const emails = new Set()
          allDataRows.forEach(row => {
            const email = row[emailColumnIndex]?.toLowerCase().trim()
            if (email && email.includes('@')) {
              if (emails.has(email)) {
                duplicateCount++
              } else {
                emails.add(email)
              }
            }
          })
        }

        // Initialize preview data
        const previewData: CSVPreviewData = {
          columns,
          rows: dataRows.slice(0, 5), // Show first 5 rows in preview
          allDataRows: allDataRows, // Store all data rows for CSV-level duplicate checking
          totalRows: lines.length - 1, // Exclude header
          duplicates: duplicateCount
        }

        setCsvPreview(previewData)
        setCurrentStep('preview')
      } catch (error) {
        setError('Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }


  // Handle field mapping completion
  const handleMappingComplete = (mapping: FieldMapping) => {
    setFieldMapping(mapping)
    handleUpload(mapping)
  }

  // Handle skip field mapping
  const handleSkipMapping = () => {
    // Use auto-mapping or default mapping
    const defaultMapping: FieldMapping = {
      email: csvPreview?.columns.find(col => col.name.toLowerCase().includes('email'))?.name || null,
      firstName: csvPreview?.columns.find(col => col.name.toLowerCase().includes('first'))?.name || null,
      lastName: csvPreview?.columns.find(col => col.name.toLowerCase().includes('last'))?.name || null,
      company: csvPreview?.columns.find(col => col.name.toLowerCase().includes('company'))?.name || null,
      phone: csvPreview?.columns.find(col => col.name.toLowerCase().includes('phone'))?.name || null,
      title: csvPreview?.columns.find(col => col.name.toLowerCase().includes('title'))?.name || null,
    }
    setFieldMapping(defaultMapping)
    handleUpload(defaultMapping)
  }

  // Continue to mapping step
  const handleContinueToMapping = () => {
    setCurrentStep('mapping')
  }

  // Continue to upload (skip preview)
  const handleContinueToUpload = () => {
    handleSkipMapping()
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
      setCurrentStep('results')

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
    setCurrentStep('file')
    setCsvPreview(null)
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

  // Render results step
  if (currentStep === 'results' && uploadResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Upload Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              "{uploadResults.leadList.name}" created successfully
            </h3>
            <p className="text-gray-600">
              {uploadResults.importResults.imported} leads imported
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {uploadResults.importResults.imported}
              </div>
              <div className="text-sm text-green-700">Imported</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {uploadResults.importResults.duplicates}
              </div>
              <div className="text-sm text-yellow-700">CSV Duplicates Removed</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {uploadResults.importResults.errors}
              </div>
              <div className="text-sm text-red-700">Errors</div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={() => viewLeadList(uploadResults.leadList.id)}>
              View Lead List
            </Button>
            <Button variant="outline" onClick={resetUpload}>
              Upload Another File
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render field mapping step
  if (currentStep === 'mapping' && csvPreview) {
    return (
      <div className="space-y-6">
        <FieldMapper
          csvColumns={csvPreview.columns}
          onMappingComplete={handleMappingComplete}
          onSkip={handleSkipMapping}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center gap-2 ${currentStep === 'file' || currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'file' || currentStep === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="font-medium">Upload</span>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <div className={`flex items-center gap-2 ${currentStep === 'mapping' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'mapping' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="font-medium">Map Fields</span>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <div className={`flex items-center gap-2 ${currentStep === 'uploading' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'uploading' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="font-medium">Process</span>
        </div>
      </div>

      {/* File Upload Step */}
      {currentStep === 'file' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload CSV File</CardTitle>
                <p className="text-sm text-gray-600">
                  Import leads from a CSV file. Supported formats: CSV with headers.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>
          </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : file 
                ? 'border-green-400 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-2">
                <FileText className="h-8 w-8 mx-auto text-green-600" />
                <div className="font-medium text-green-800">{file.name}</div>
                <div className="text-sm text-green-600">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900">
                    Drop your CSV file here, or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Maximum file size: 10MB
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    Need help formatting your data?{' '}
                    <button
                      onClick={downloadTemplate}
                      className="underline hover:text-blue-700"
                    >
                      Download sample template
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="listName">Lead List Name *</Label>
              <Input
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Enter a name for this lead list"
                required
              />
            </div>


          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <div className="text-sm text-gray-600 text-center">
                Uploading and processing CSV... {uploadProgress}%
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !listName || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload & Create List'}
            </Button>
          </div>
        </CardContent>
        </Card>
      )}

      {/* CSV Preview Step */}
      {currentStep === 'preview' && csvPreview && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Preview</CardTitle>
            <p className="text-sm text-gray-600">
              Preview your CSV data before proceeding to field mapping.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CSV Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{csvPreview.columns.length}</div>
                <div className="text-xs text-blue-700">Columns</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{Number(csvPreview?.totalRows ?? 0).toLocaleString()}</div>
                <div className="text-xs text-green-700">Total Rows</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{csvPreview.duplicates}</div>
                <div className="text-xs text-yellow-700">CSV Duplicates</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600 truncate">{file?.name}</div>
                <div className="text-xs text-purple-700">File Name</div>
              </div>
            </div>

            {/* List Name Input */}
            <div>
              <Label htmlFor="listName">Lead List Name *</Label>
              <Input
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Enter a name for this lead list"
                required
              />
            </div>

            {/* CSV Info Message */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">Ready to Import</div>
                  <div className="text-sm text-green-700">
                    All {csvPreview.totalRows - csvPreview.duplicates} unique emails will be imported.
                    {csvPreview.duplicates > 0 && ` (${csvPreview.duplicates} CSV internal duplicates were automatically removed)`}
                  </div>
                </div>
              </div>
            </div>

            {/* CSV Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b">
                <h4 className="font-medium text-gray-900">Data Preview (first 5 rows)</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      {csvPreview.columns.map((column, index) => (
                        <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r">
                          {column.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-sm text-gray-600 border-r max-w-xs truncate">
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetUpload}>
                Back to File Selection
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleContinueToUpload}
                >
                  Skip Field Mapping
                </Button>
                <Button 
                  onClick={handleContinueToMapping}
                  disabled={!listName}
                >
                  Continue to Field Mapping
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploading Step */}
      {currentStep === 'uploading' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 animate-bounce" />
              Processing CSV - Batch Upload in Progress
            </CardTitle>
            <p className="text-sm text-gray-600">
              Uploading and processing your CSV file using batch processing for optimal performance...
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Progress Display */}
            <div className="text-center py-4">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {uploadProgress}%
              </div>
              <Progress value={uploadProgress} className="h-4 mb-4" />
              <div className="text-lg text-gray-700 font-medium">
                {progressMessage || 'Starting batch processing...'}
              </div>
            </div>

            {/* Detailed Progress Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Batch Progress */}
              {batchInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {batchInfo.current}/{batchInfo.total}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">Batches Processed</div>
                  <div className="text-xs text-blue-600 mt-1">
                    ({Math.round((batchInfo.current / batchInfo.total) * 100)}% of batches)
                  </div>
                </div>
              )}

              {/* Leads Processed */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {processedLeads.toLocaleString()}
                </div>
                <div className="text-sm text-green-700 font-medium">Leads Processed</div>
                <div className="text-xs text-green-600 mt-1">
                  of {csvPreview?.totalRows ? Number(csvPreview.totalRows).toLocaleString() : '—'} total
                </div>
              </div>

              {/* Estimated Time Remaining */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {estimatedTimeRemaining !== null ? (
                    estimatedTimeRemaining > 60 ? 
                      `${Math.ceil(estimatedTimeRemaining / 60)}m` : 
                      `${estimatedTimeRemaining}s`
                  ) : '—'}
                </div>
                <div className="text-sm text-orange-700 font-medium">Time Remaining</div>
                <div className="text-xs text-orange-600 mt-1">
                  {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 ? 'Estimated' : 'Calculating...'}
                </div>
              </div>
            </div>

            {/* Processing Status Messages */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-gray-700">Processing Status</span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>✅ CSV uploaded and validated successfully</div>
                <div>🔄 Processing leads in batches of 200 for optimal performance</div>
                {batchInfo && batchInfo.current > 0 && (
                  <div>📊 Completed {batchInfo.current} of {batchInfo.total} batches</div>
                )}
                <div>🎯 Checking for duplicates and validating email addresses</div>
                <div>💾 Storing leads in your database with organization isolation</div>
              </div>
            </div>

            {/* Real-time Activity Log */}
            {progressMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm">
                  <span className="font-medium text-blue-700">Latest Activity: </span>
                  <span className="text-blue-600">{progressMessage}</span>
                </div>
              </div>
            )}

            {/* Performance Note */}
            <div className="text-center">
              <div className="text-sm text-gray-500">
                Large files are processed in batches to ensure optimal performance and reliability.
                Please keep this tab open while processing completes.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}