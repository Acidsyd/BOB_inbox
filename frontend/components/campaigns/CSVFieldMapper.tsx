'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Check,
  AlertCircle,
  FileText,
  ArrowRight,
  Eye,
  X,
  RefreshCw
} from 'lucide-react'

interface FieldMapping {
  csvColumn: string
  csvIndex: number
  platformField: string
  required: boolean
  mapped: boolean
}

interface CSVFieldMapperProps {
  csvHeaders: string[]
  csvData: any[]
  onMappingComplete: (mapping: Record<string, number>, mappedData: any[]) => void
  onCancel: () => void
}

// Platform field definitions
const PLATFORM_FIELDS = [
  { key: 'email', label: 'Email Address', required: true, description: 'Primary email address' },
  { key: 'firstName', label: 'First Name', required: false, description: 'Contact first name' },
  { key: 'lastName', label: 'Last Name', required: false, description: 'Contact last name' },
  { key: 'fullName', label: 'Full Name', required: false, description: 'Complete contact name' },
  { key: 'company', label: 'Company', required: false, description: 'Company or organization name' },
  { key: 'jobTitle', label: 'Job Title', required: false, description: 'Job position or title' },
  { key: 'location', label: 'Location', required: false, description: 'City, state, or country' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', required: false, description: 'LinkedIn profile URL' },
  { key: 'website', label: 'Website', required: false, description: 'Company or personal website' },
  { key: 'phone', label: 'Phone', required: false, description: 'Phone number' },
  { key: 'industry', label: 'Industry', required: false, description: 'Industry or sector' }
]

export default function CSVFieldMapper({ 
  csvHeaders, 
  csvData, 
  onMappingComplete, 
  onCancel 
}: CSVFieldMapperProps) {
  const [mappings, setMappings] = useState<Record<string, number>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  
  // Auto-detect mappings on component mount
  useEffect(() => {
    const autoMappings = autoDetectMappings(csvHeaders)
    setMappings(autoMappings)
  }, [csvHeaders])

  // Generate preview data when mappings change
  useEffect(() => {
    if (Object.keys(mappings).length > 0) {
      const preview = csvData.slice(0, 5).map(row => {
        const mappedRow: any = {}
        Object.entries(mappings).forEach(([platformField, csvIndex]) => {
          mappedRow[platformField] = row[csvIndex] || ''
        })
        return mappedRow
      })
      setPreviewData(preview)
    }
  }, [mappings, csvData])

  // Auto-detect field mappings based on header names
  function autoDetectMappings(headers: string[]): Record<string, number> {
    const detected: Record<string, number> = {}
    
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim()
      
      // Email detection
      if (lowerHeader.includes('email') || lowerHeader.includes('e-mail')) {
        detected.email = index
      }
      // First name detection
      else if (lowerHeader.includes('first') && lowerHeader.includes('name') || 
               lowerHeader === 'firstname' || lowerHeader === 'first name') {
        detected.firstName = index
      }
      // Last name detection
      else if (lowerHeader.includes('last') && lowerHeader.includes('name') || 
               lowerHeader === 'lastname' || lowerHeader === 'last name') {
        detected.lastName = index
      }
      // Full name detection
      else if (lowerHeader.includes('full') && lowerHeader.includes('name') || 
               lowerHeader === 'fullname' || lowerHeader === 'name') {
        detected.fullName = index
      }
      // Company detection
      else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
        detected.company = index
      }
      // Job title detection
      else if (lowerHeader.includes('job') || lowerHeader.includes('title') || 
               lowerHeader.includes('position')) {
        detected.jobTitle = index
      }
      // Location detection
      else if (lowerHeader.includes('location') || lowerHeader.includes('city') || 
               lowerHeader.includes('country')) {
        detected.location = index
      }
      // LinkedIn detection
      else if (lowerHeader.includes('linkedin') || lowerHeader.includes('profile')) {
        detected.linkedinUrl = index
      }
      // Website detection
      else if (lowerHeader.includes('website') || lowerHeader.includes('url') || 
               lowerHeader.includes('site')) {
        detected.website = index
      }
      // Phone detection
      else if (lowerHeader.includes('phone') || lowerHeader.includes('tel') || 
               lowerHeader.includes('mobile')) {
        detected.phone = index
      }
      // Industry detection
      else if (lowerHeader.includes('industry') || lowerHeader.includes('sector')) {
        detected.industry = index
      }
    })
    
    return detected
  }

  // Handle field mapping changes
  const handleMappingChange = (platformField: string, csvIndex: number | null) => {
    setMappings(prev => {
      const newMappings = { ...prev }
      
      // Remove existing mapping for this platform field
      delete newMappings[platformField]
      
      // Remove any other platform field that was mapped to this CSV column
      if (csvIndex !== null) {
        Object.keys(newMappings).forEach(field => {
          if (newMappings[field] === csvIndex) {
            delete newMappings[field]
          }
        })
        newMappings[platformField] = csvIndex
      }
      
      return newMappings
    })
  }

  // Check if mapping is valid
  const isValidMapping = () => {
    return mappings.email !== undefined // Email is required
  }

  // Get mapped fields count
  const getMappedFieldsCount = () => {
    return Object.keys(mappings).length
  }

  // Handle apply mappings
  const handleApplyMappings = () => {
    if (!isValidMapping()) return
    
    // Transform CSV data using mappings
    const transformedData = csvData.map(row => {
      const transformedRow: any = {}
      Object.entries(mappings).forEach(([platformField, csvIndex]) => {
        transformedRow[platformField] = row[csvIndex] || ''
      })
      return transformedRow
    })
    
    onMappingComplete(mappings, transformedData)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Map CSV Fields</h3>
        <p className="text-gray-500">
          Connect your CSV columns to platform fields. Email address is required.
        </p>
      </div>

      {/* Auto-detection Result */}
      {getMappedFieldsCount() > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Check className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800 font-medium">
              Auto-detected {getMappedFieldsCount()} field mapping(s)
            </span>
          </div>
          <p className="text-sm text-blue-700">
            Review and adjust the mappings below. You can change them manually if needed.
          </p>
        </div>
      )}

      {/* Field Mapping Interface */}
      <div className="grid gap-4">
        {PLATFORM_FIELDS.map(field => {
          const isCurrentlyMapped = mappings[field.key] !== undefined
          const mappedCsvIndex = mappings[field.key]
          const mappedCsvHeader = mappedCsvIndex !== undefined ? csvHeaders[mappedCsvIndex] : null
          
          return (
            <Card key={field.key} className={`transition-all ${
              field.required && !isCurrentlyMapped ? 'border-red-200 bg-red-50' : 
              isCurrentlyMapped ? 'border-green-200 bg-green-50' : 'border-gray-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Label className="font-medium text-gray-900">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {isCurrentlyMapped && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Check className="h-3 w-3" />
                          <span className="text-xs">Mapped</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                    
                    {isCurrentlyMapped && mappedCsvHeader && (
                      <div className="flex items-center space-x-2 mt-2 text-sm">
                        <span className="text-gray-600">Mapped to:</span>
                        <span className="px-2 py-1 bg-white border border-gray-300 rounded text-purple-600 font-medium">
                          {mappedCsvHeader}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <select
                      value={mappedCsvIndex ?? ''}
                      onChange={(e) => handleMappingChange(
                        field.key, 
                        e.target.value ? parseInt(e.target.value) : null
                      )}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select CSV column...</option>
                      {csvHeaders.map((header, index) => (
                        <option key={index} value={index}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Validation Status */}
      <div className="space-y-3">
        {!isValidMapping() && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800 font-medium">Required field missing</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Email address field is required. Please map at least one CSV column to the Email field.
            </p>
          </div>
        )}

        {isValidMapping() && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-800 font-medium">
                  Mapping complete ({getMappedFieldsCount()} fields mapped)
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-green-700 hover:text-green-800"
              >
                <Eye className="h-4 w-4 mr-1" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
            
            {showPreview && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <h4 className="font-medium text-green-800 mb-3">Preview (first 5 rows):</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-100">
                        {Object.keys(mappings).map(field => (
                          <th key={field} className="px-3 py-2 text-left font-medium text-green-800 border border-green-200">
                            {PLATFORM_FIELDS.find(f => f.key === field)?.label || field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="bg-white">
                          {Object.keys(mappings).map(field => (
                            <td key={field} className="px-3 py-2 border border-green-200 text-gray-700">
                              {row[field] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex items-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Cancel</span>
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              const autoMappings = autoDetectMappings(csvHeaders)
              setMappings(autoMappings)
            }}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Auto-detect Again</span>
          </Button>

          <Button
            onClick={handleApplyMappings}
            disabled={!isValidMapping()}
            className="flex items-center space-x-2"
          >
            <span>Apply Mapping</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}