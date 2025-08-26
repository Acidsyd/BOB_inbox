'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

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
  details?: {
    duplicateEmails: string[]
    errors: string[]
    stats: any
  }
}

interface FieldMappingReport {
  mapped: Record<string, string>
  unmapped: string[]
  suggestions: Record<string, string[]>
}

interface CSVPreview {
  preview: any[]
  headers: string[]
  fieldMapping: FieldMappingReport
  stats: {
    estimatedTotalRows: number
    validPreviewRows: number
    previewErrors: string[]
  }
}

export default function CSVUploader() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [listName, setListName] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [uploadResults, setUploadResults] = useState<CSVUploadResults | null>(null)
  const [error, setError] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)

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
    setPreview(null)
    setUploadResults(null)

    // Auto-generate list name from file name
    if (!listName) {
      const fileName = selectedFile.name.replace('.csv', '').replace(/_/g, ' ')
      setListName(fileName.charAt(0).toUpperCase() + fileName.slice(1))
    }

    // Preview the file
    previewCSV(selectedFile)
  }, [listName])

  // Preview CSV file
  const previewCSV = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/leads/lists/preview-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to preview CSV')
      }

      const previewData: CSVPreview = await response.json()
      setPreview(previewData)
    } catch (error) {
      console.error('Preview error:', error)
      setError('Failed to preview CSV file')
    }
  }

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

  // Upload CSV
  const handleUpload = async () => {
    if (!file || !listName) {
      setError('Please select a file and enter a list name')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('listName', listName)
      formData.append('description', description)
      formData.append('allowDuplicates', 'false')
      formData.append('validateEmail', 'true')

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/leads/lists/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const results: CSVUploadResults = await response.json()
      setUploadResults(results)

      // Reset form
      setFile(null)
      setListName('')
      setDescription('')
      setPreview(null)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Navigate to lead list
  const viewLeadList = (listId: string) => {
    router.push(`/leads/lists/${listId}`)
  }

  // Reset component
  const resetUpload = () => {
    setFile(null)
    setListName('')
    setDescription('')
    setPreview(null)
    setUploadResults(null)
    setError('')
    setUploadProgress(0)
    setIsUploading(false)
  }

  if (uploadResults) {
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
              <div className="text-sm text-yellow-700">Duplicates</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {uploadResults.importResults.errors}
              </div>
              <div className="text-sm text-red-700">Errors</div>
            </div>
          </div>

          {uploadResults.details?.errors && uploadResults.details.errors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Import Issues:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {uploadResults.details.errors.slice(0, 5).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                  {uploadResults.details.errors.length > 5 && (
                    <li className="text-sm">...and {uploadResults.details.errors.length - 5} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <p className="text-sm text-gray-600">
            Import leads from a CSV file. Supported formats: CSV with headers.
          </p>
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
                </div>
              </div>
            )}
          </div>

          {/* CSV Preview */}
          {preview && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">File Preview</h3>
              
              {/* Field Mapping */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700 mb-2">
                  Detected Fields ({preview.headers.length} columns)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-medium text-green-700 mb-1">Mapped Fields:</h5>
                    <div className="space-y-1">
                      {Object.entries(preview.fieldMapping.mapped).map(([original, mapped]) => (
                        <div key={original} className="text-xs">
                          <span className="text-gray-600">{original}</span> → 
                          <span className="text-green-600 font-medium ml-1">{mapped}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Custom Fields:</h5>
                    <div className="space-y-1">
                      {preview.fieldMapping.unmapped.map(field => (
                        <div key={field} className="text-xs text-gray-600">
                          {field} (as custom field)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Data */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {preview.headers.slice(0, 6).map(header => (
                        <th key={header} className="text-left p-2 font-medium text-gray-700">
                          {header}
                        </th>
                      ))}
                      {preview.headers.length > 6 && (
                        <th className="text-left p-2 font-medium text-gray-700">
                          +{preview.headers.length - 6} more
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, index) => (
                      <tr key={index} className="border-b">
                        {preview.headers.slice(0, 6).map(header => (
                          <td key={header} className="p-2 text-gray-600">
                            {row.original_data?.[header] || '—'}
                          </td>
                        ))}
                        {preview.headers.length > 6 && (
                          <td className="p-2 text-gray-500">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500">
                Showing 3 sample rows. Estimated total: {preview.stats.estimatedTotalRows} rows
              </div>
            </div>
          )}

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

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this lead list"
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
    </div>
  )
}