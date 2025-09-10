'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertCircle, CheckCircle, X, ArrowRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  details?: {
    duplicate_leads?: any[]
    duplicateEmails?: string[]
    errors?: string[]
    stats?: any
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

interface DuplicateDetail {
  email: string
  existing?: any // Raw database records from backend
  existingInLists: Array<{
    listId: string
    listName: string
  }>
}

interface CSVPreviewData {
  columns: CSVColumn[]
  rows: string[][]
  allDataRows: string[][]  // Add this to store all CSV data for duplicate checking
  totalRows: number
  duplicates: number
  databaseDuplicates: number
  isCheckingDuplicates: boolean
  duplicateDetails?: DuplicateDetail[]
}


type UploadStep = 'file' | 'preview' | 'mapping' | 'uploading' | 'results'

export default function CSVUploader() {
  const router = useRouter()
  const { addToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [listName, setListName] = useState('')
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [currentStep, setCurrentStep] = useState<UploadStep>('file')
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null)
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResults, setUploadResults] = useState<CSVUploadResults | null>(null)
  const [error, setError] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isImportingDuplicates, setIsImportingDuplicates] = useState(false)
  const [isManualCheckingDuplicates, setIsManualCheckingDuplicates] = useState(false)

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
          allDataRows: allDataRows, // Store all data rows for duplicate checking
          totalRows: lines.length - 1, // Exclude header
          duplicates: duplicateCount,
          databaseDuplicates: 0,
          isCheckingDuplicates: true
        }

        setCsvPreview(previewData)
        setCurrentStep('preview')

        // Check for database duplicates with a small delay to ensure authentication is ready
        if (emailColumnIndex !== -1) {
          // Add a small delay to ensure authentication tokens are available
          setTimeout(() => {
            checkDatabaseDuplicates(allDataRows, emailColumnIndex)
          }, 100)
        } else {
          // No email column found, stop checking
          setCsvPreview(prev => prev ? { ...prev, isCheckingDuplicates: false } : null)
        }
      } catch (error) {
        setError('Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  // Check for duplicates in database
  const checkDatabaseDuplicates = async (allDataRows: string[][], emailColumnIndex: number, isManualCheck = false) => {
    try {
      console.log('🔍 checkDatabaseDuplicates called with:', { allDataRows: allDataRows.length, emailColumnIndex, isManualCheck });
      
      // Check if authentication token is available
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No authentication token available, skipping duplicate check');
        if (isManualCheck) {
          addToast({ type: 'warning', title: 'Please log in again to check for duplicates' })
        }
        setCsvPreview(prev => prev ? { ...prev, isCheckingDuplicates: false } : null)
        return;
      }
      
      console.log('🔑 Authentication token available:', token.substring(0, 20) + '...');
      
      // Set loading state based on whether this is a manual check
      if (isManualCheck) {
        setIsManualCheckingDuplicates(true)
      }
      
      // Extract unique emails from CSV
      const uniqueEmails = new Set<string>()
      allDataRows.forEach((row, index) => {
        const email = row[emailColumnIndex]?.toLowerCase().trim()
        console.log(`📧 Row ${index}: email at column ${emailColumnIndex} = "${email}"`);
        if (email && email.includes('@')) {
          uniqueEmails.add(email)
        }
      })

      console.log('📬 Unique emails extracted:', Array.from(uniqueEmails));

      if (uniqueEmails.size === 0) {
        console.log('❌ No valid emails found, stopping duplicate check');
        if (isManualCheck) {
          addToast({ type: 'warning', title: 'No valid email addresses found in the CSV file' })
          setIsManualCheckingDuplicates(false)
        }
        setCsvPreview(prev => prev ? { ...prev, isCheckingDuplicates: false } : null)
        return
      }

      console.log('🌐 Calling API to check duplicates for emails:', Array.from(uniqueEmails));
      console.log('🔗 API endpoint: /leads/lists/check-duplicates');
      console.log('📤 Request payload:', { emails: Array.from(uniqueEmails) });
      
      // Call API to check for existing emails
      const response = await api.post('/leads/lists/check-duplicates', {
        emails: Array.from(uniqueEmails)
      })

      console.log('📡 API response status:', response.status);
      console.log('📡 API response data:', response.data);
      console.log('📊 Database duplicates found:', response.data.existingInDatabase);

      setCsvPreview(prev => prev ? {
        ...prev,
        databaseDuplicates: response.data.existingInDatabase,
        duplicateDetails: response.data.duplicateDetails || [],
        isCheckingDuplicates: false
      } : null)

      // Show success message for manual checks
      if (isManualCheck) {
        const duplicateCount = response.data.existingInDatabase
        if (duplicateCount > 0) {
          addToast({ 
            type: 'info', 
            title: `Found ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} in your existing lead lists` 
          })
        } else {
          addToast({ 
            type: 'success', 
            title: `No duplicates found! All ${uniqueEmails.size} emails are unique` 
          })
        }
      }

    } catch (error) {
      console.error('❌ Error checking database duplicates:', error)
      if (error.response) {
        console.error('📡 API Error Response:', error.response.data);
      }
      
      // Show error message for manual checks
      if (isManualCheck) {
        addToast({ 
          type: 'error', 
          title: 'Failed to check for duplicates', 
          description: error.response?.data?.message || 'Please try again or contact support' 
        })
        setIsManualCheckingDuplicates(false)
      }
      
      setCsvPreview(prev => prev ? { ...prev, isCheckingDuplicates: false } : null)
    } finally {
      if (isManualCheck) {
        setIsManualCheckingDuplicates(false)
      }
    }
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
      const formData = new FormData()
      formData.append('csvFile', file)  // Changed from 'file' to 'csvFile' to match backend
      formData.append('listName', listName)
      formData.append('allowDuplicates', allowDuplicates.toString())
      
      // Include field mapping if provided
      if (mapping) {
        formData.append('fieldMapping', JSON.stringify(mapping))
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await api.post('/leads/lists/upload', formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      const results = response.data
      
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
        },
        details: {
          duplicate_leads: results.duplicate_leads || [],
          errors: [] // results.errors is a number, not an array
        }
      }
      
      setUploadResults(transformedResults)
      setCurrentStep('results')

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Manual duplicate check function with improved email column detection
  const handleManualDuplicateCheck = async () => {
    if (!csvPreview?.allDataRows) {
      addToast({ type: 'error', title: 'No CSV data available for duplicate checking' })
      return
    }

    console.log('🔍 Manual duplicate check triggered');
    console.log('📋 Available columns:', csvPreview.columns);
    
    // Find email column with improved logic
    let emailColumnIndex = -1
    
    // Method 1: Look for column names containing "email"
    emailColumnIndex = csvPreview.columns.findIndex(col => {
      const name = col.name.toLowerCase()
      return name.includes('email') || name === 'e-mail' || name === 'mail'
    })
    
    // Method 2: If not found by name, look for columns with email-like content
    if (emailColumnIndex === -1) {
      for (let colIndex = 0; colIndex < csvPreview.columns.length; colIndex++) {
        const column = csvPreview.columns[colIndex]
        const emailLikeCount = column.sample.filter(value => 
          value && value.includes('@') && value.includes('.')
        ).length
        
        // If >50% of sample values look like emails, this is probably the email column
        if (emailLikeCount > column.sample.length * 0.5) {
          emailColumnIndex = colIndex
          console.log(`📧 Found email column by content at index ${colIndex} (${column.name})`);
          break
        }
      }
    }
    
    if (emailColumnIndex === -1) {
      addToast({ 
        type: 'error', 
        title: 'Cannot find email column', 
        description: 'Please make sure your CSV has a column with email addresses' 
      })
      return
    }
    
    console.log(`📧 Using email column: ${csvPreview.columns[emailColumnIndex].name} (index ${emailColumnIndex})`);
    
    // Start the duplicate check
    await checkDatabaseDuplicates(csvPreview.allDataRows, emailColumnIndex, true)
  }

  // Navigate to lead list
  const viewLeadList = (listId: string) => {
    console.log('🔍 Navigating to lead list:', listId)
    // Navigate to the lead list detail page
    router.push(`/leads/lists/${listId}`)
  }

  // Import duplicates to existing list
  const importDuplicates = async () => {
    console.log('🔥 Import duplicates clicked!')
    if (!uploadResults || !uploadResults.details?.duplicate_leads) {
      setError('No duplicate leads available to import')
      return
    }

    setIsImportingDuplicates(true)
    setError('')

    try {
      // Send the duplicate leads data as JSON, not FormData
      console.log('📤 Sending duplicate leads:', uploadResults.details.duplicate_leads);
      
      const response = await api.post(`/leads/lists/${uploadResults.leadList.id}/import-duplicates`, {
        duplicateLeads: uploadResults.details.duplicate_leads
      })
      
      // Show detailed feedback about the import process
      if (response.data.success) {
        if (response.data.imported > 0) {
          addToast({ type: 'success', title: response.data.message || `Successfully imported ${response.data.imported} duplicate leads!` })
        } else if (response.data.alreadyInList > 0) {
          addToast({ type: 'info', title: response.data.message || `All leads from the CSV are already in this list.` })
        } else if (response.data.notInDatabase > 0) {
          addToast({ type: 'info', title: response.data.message || `No duplicate leads found. ${response.data.notInDatabase} leads don't exist in your database yet.` })
        } else {
          addToast({ type: 'info', title: 'No changes made to the lead list.' })
        }
        
        // Update the upload results with new data
        const newResults = {
          ...uploadResults,
          importResults: {
            ...uploadResults.importResults,
            imported: uploadResults.importResults.imported + response.data.imported,
            duplicates: Math.max(0, uploadResults.importResults.duplicates - response.data.imported)
          },
          leadList: {
            ...uploadResults.leadList,
            totalLeads: response.data.newTotalCount
          }
        }
        
        setUploadResults(newResults)
      } else {
        addToast({ type: 'error', title: 'Failed to import duplicates' })
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import duplicates')
    } finally {
      setIsImportingDuplicates(false)
    }
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
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                allowDuplicates ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {allowDuplicates ? 'Duplicates Allowed' : 'Duplicates Blocked'}
              </span>
            </div>
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
              <div className="text-sm text-yellow-700">
                {allowDuplicates ? 'Updated' : 'Duplicates Skipped'}
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {uploadResults.importResults.errors}
              </div>
              <div className="text-sm text-red-700">Errors</div>
            </div>
          </div>

          {uploadResults.details?.errors && uploadResults.details.errors.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Import Notes:</span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {uploadResults.details.errors.length} item{uploadResults.details.errors.length > 1 ? 's' : ''} skipped due to processing requirements
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button onClick={() => viewLeadList(uploadResults.leadList.id)}>
              View Lead List
            </Button>
            {uploadResults.importResults.duplicates > 0 && (
              <Button 
                variant="secondary" 
                onClick={importDuplicates}
                disabled={isImportingDuplicates}
                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
              >
                {isImportingDuplicates ? 'Adding...' : `Add Duplicates to List (${uploadResults.importResults.duplicates})`}
              </Button>
            )}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {csvPreview.isCheckingDuplicates ? '...' : csvPreview.databaseDuplicates}
                </div>
                <div className="text-xs text-orange-700">In Database</div>
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

            {/* Database Duplicates Handling */}
            {csvPreview.databaseDuplicates > 0 && !csvPreview.isCheckingDuplicates && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <strong>Duplicate Emails Found:</strong> {csvPreview.databaseDuplicates} email{csvPreview.databaseDuplicates > 1 ? 's' : ''} from your CSV already exist in your other lead lists.
                    </div>
                    <div className="text-sm text-gray-700 mb-4">
                      • CSV internal duplicates are automatically removed<br/>
                      • Choose what to do with the {csvPreview.databaseDuplicates} duplicate{csvPreview.databaseDuplicates > 1 ? 's' : ''}:
                    </div>
                    {csvPreview.duplicateDetails && csvPreview.duplicateDetails.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="text-sm text-blue-800 font-medium mb-2">Duplicates found in these lists:</div>
                        <div className="text-sm text-blue-700 space-y-1">
                          {(() => {
                            console.log('🔍 Rendering duplicateDetails:', JSON.stringify(csvPreview.duplicateDetails, null, 2));
                            const listCounts = new Map<string, number>();
                            csvPreview.duplicateDetails.forEach(detail => {
                              if (detail.existingInLists && Array.isArray(detail.existingInLists)) {
                                detail.existingInLists.forEach(listInfo => {
                                  const listName = typeof listInfo === 'string' ? listInfo : (listInfo?.listName || 'Unknown List');
                                  listCounts.set(listName, (listCounts.get(listName) || 0) + 1);
                                });
                              }
                            });
                            return Array.from(listCounts.entries()).map(([listName, count], index) => 
                              <div key={index}>• {listName} ({count} duplicate{count > 1 ? 's' : ''})</div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="skipAllDuplicates"
                            name="duplicateHandling"
                            checked={!allowDuplicates}
                            onChange={() => setAllowDuplicates(false)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <Label htmlFor="skipAllDuplicates" className="text-sm font-medium cursor-pointer flex-grow">
                            🚫 <strong>Skip All Duplicates</strong>
                          </Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 ml-7">
                          Don't add any of the {csvPreview.databaseDuplicates} duplicate emails to this new list. Keep them in their current lists only.
                        </p>
                      </div>
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="copyAllDuplicates"
                            name="duplicateHandling"
                            checked={allowDuplicates}
                            onChange={() => setAllowDuplicates(true)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <Label htmlFor="copyAllDuplicates" className="text-sm font-medium cursor-pointer flex-grow">
                            📋 <strong>Copy All to New List</strong>
                          </Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 ml-7">
                          Add copies of all {csvPreview.databaseDuplicates} duplicate emails to this new list. Original emails stay in their current lists too.
                        </p>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* No Duplicates Message */}
            {csvPreview.databaseDuplicates === 0 && !csvPreview.isCheckingDuplicates && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Ready to Import</div>
                    <div className="text-sm text-green-700">
                      No duplicate emails found in your existing lead lists. All {csvPreview.rows - csvPreview.duplicates} unique emails will be imported.
                      {csvPreview.duplicates > 0 && ` (${csvPreview.duplicates} CSV internal duplicates were automatically removed)`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checking Duplicates */}
            {csvPreview.isCheckingDuplicates && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <div className="text-sm text-blue-700">
                    Checking for existing emails in your database...
                  </div>
                </div>
              </div>
            )}

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
                  disabled={csvPreview?.isCheckingDuplicates}
                >
                  {csvPreview?.isCheckingDuplicates ? 'Checking Duplicates...' : 'Skip Field Mapping'}
                </Button>
                <Button 
                  onClick={handleContinueToMapping}
                  disabled={!listName || csvPreview?.isCheckingDuplicates}
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
              Processing CSV
            </CardTitle>
            <p className="text-sm text-gray-600">
              Uploading and processing your CSV file...
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {uploadProgress}%
              </div>
              <Progress value={uploadProgress} className="h-3 mb-4" />
              <p className="text-gray-600">
                Processing {csvPreview?.totalRows ? Number(csvPreview.totalRows).toLocaleString() : 'your'} leads...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}