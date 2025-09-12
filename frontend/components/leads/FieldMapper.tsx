'use client'

import React, { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'

interface CSVColumn {
  name: string
  sample: string[]
  index: number
}

interface FieldMapping {
  [csvColumn: string]: string | null
}

interface FieldMapperProps {
  csvColumns: CSVColumn[]
  onMappingComplete: (mapping: FieldMapping) => void
  onSkip: () => void
}

const REQUIRED_FIELDS = [
  { key: 'email', label: 'Email', required: true, description: 'Primary email address' },
  { key: 'firstName', label: 'First Name', required: false, description: 'First name or given name' },
  { key: 'lastName', label: 'Last Name', required: false, description: 'Last name or surname' },
  { key: 'company', label: 'Company', required: false, description: 'Company or organization name' },
  { key: 'phone', label: 'Phone', required: false, description: 'Phone number' },
  { key: 'title', label: 'Job Title', required: false, description: 'Job title or position' }
]

export default function FieldMapper({ csvColumns, onMappingComplete, onSkip }: FieldMapperProps) {
  const [mapping, setMapping] = useState<FieldMapping>({})
  const [autoMapped, setAutoMapped] = useState<string[]>([])

  // Auto-detect common field mappings
  useEffect(() => {
    const autoMapping: FieldMapping = {}
    const mapped: string[] = []

    csvColumns.forEach(column => {
      const columnName = column.name.toLowerCase().trim()
      
      // Email detection
      if ((columnName.includes('email') || columnName === 'e-mail' || columnName === 'mail') && !autoMapping.email) {
        autoMapping.email = column.name
        mapped.push(column.name)
      }
      // First name detection
      else if ((columnName.includes('first') && columnName.includes('name')) || 
               columnName === 'firstname' || columnName === 'fname' || columnName === 'first_name') {
        autoMapping.firstName = column.name
        mapped.push(column.name)
      }
      // Last name detection
      else if ((columnName.includes('last') && columnName.includes('name')) || 
               columnName === 'lastname' || columnName === 'lname' || columnName === 'last_name') {
        autoMapping.lastName = column.name
        mapped.push(column.name)
      }
      // Company detection
      else if (columnName.includes('company') || columnName.includes('organization') || 
               columnName.includes('employer') || columnName === 'org') {
        autoMapping.company = column.name
        mapped.push(column.name)
      }
      // Phone detection
      else if (columnName.includes('phone') || columnName.includes('mobile') || 
               columnName.includes('tel') || columnName === 'cell') {
        autoMapping.phone = column.name
        mapped.push(column.name)
      }
      // Title detection
      else if (columnName.includes('title') || columnName.includes('position') || 
               columnName.includes('job') || columnName === 'role') {
        autoMapping.title = column.name
        mapped.push(column.name)
      }
    })

    setMapping(autoMapping)
    setAutoMapped(mapped)
  }, [csvColumns])

  const handleFieldMapping = (fieldKey: string, csvColumn: string | null) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: csvColumn
    }))
  }

  const getUnmappedColumns = () => {
    const mappedColumns = new Set(Object.values(mapping).filter(Boolean))
    return csvColumns.filter(col => !mappedColumns.has(col.name))
  }

  const isValidMapping = () => {
    return mapping.email !== null && mapping.email !== undefined
  }

  const getMappingSummary = () => {
    const mappedFields = Object.entries(mapping).filter(([_, value]) => value).length
    const requiredMapped = mapping.email ? 1 : 0
    const optionalMapped = mappedFields - requiredMapped

    return {
      total: mappedFields,
      required: requiredMapped,
      optional: optionalMapped,
      unmapped: csvColumns.length - mappedFields
    }
  }

  const summary = getMappingSummary()
  const unmappedColumns = getUnmappedColumns()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Map CSV Fields
          </CardTitle>
          <p className="text-sm text-gray-600">
            Map your CSV columns to the correct fields. Email is required, other fields are optional.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mapping Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{csvColumns.length}</div>
              <div className="text-xs text-blue-700">CSV Columns</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.total}</div>
              <div className="text-xs text-green-700">Mapped</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{autoMapped.length}</div>
              <div className="text-xs text-purple-700">Auto-detected</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{summary.unmapped}</div>
              <div className="text-xs text-gray-700">Unmapped</div>
            </div>
          </div>

          {/* Field Mapping */}
          <div className="space-y-4">
            {REQUIRED_FIELDS.map(field => (
              <div key={field.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium text-gray-900">
                      {field.label}
                    </label>
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    {autoMapped.includes(mapping[field.key] || '') && (
                      <Badge variant="default" className="text-xs">Auto-detected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {mapping[field.key] && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {field.required && !mapping[field.key] && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{field.description}</p>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={mapping[field.key] || '__none__'}
                      onValueChange={(value) => handleFieldMapping(field.key, value === '__none__' ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {csvColumns.map(column => (
                          <SelectItem key={column.index} value={column.name}>
                            {column.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {mapping[field.key] && (
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Sample data:</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {csvColumns
                          .find(col => col.name === mapping[field.key])
                          ?.sample.slice(0, 3)
                          .join(', ') || 'No samples'}
                        {csvColumns.find(col => col.name === mapping[field.key])?.sample.length > 3 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Unmapped Columns */}
          {unmappedColumns.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Unmapped Columns</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unmappedColumns.map(column => (
                  <div key={column.index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{column.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {column.sample.slice(0, 2).join(', ')}
                      {column.sample.length > 2 && '...'}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                These columns will be ignored during import.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onSkip}>
              Skip Mapping
            </Button>
            
            <div className="flex items-center gap-3">
              {!isValidMapping() && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Email field is required
                </div>
              )}
              <Button 
                onClick={() => onMappingComplete(mapping)}
                disabled={!isValidMapping()}
              >
                Continue with Mapping
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}