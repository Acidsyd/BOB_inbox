'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, FileText } from 'lucide-react'

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
  file: File
  onMappingComplete: (mapping: FieldMapping) => void
  onBack: () => void
}

const REQUIRED_FIELDS = [
  { key: 'email', label: 'Email', required: true, description: 'Primary email address' },
  { key: 'firstName', label: 'First Name', required: false, description: 'First name or given name' },
  { key: 'lastName', label: 'Last Name', required: false, description: 'Last name or surname' },
  { key: 'company', label: 'Company', required: false, description: 'Company or organization name' },
  { key: 'phone', label: 'Phone', required: false, description: 'Phone number' },
  { key: 'title', label: 'Job Title', required: false, description: 'Job title or position' }
]

export default function FieldMapper({ file, onMappingComplete, onBack }: FieldMapperProps) {
  const [mapping, setMapping] = useState<FieldMapping>({})
  const [autoMapped, setAutoMapped] = useState<string[]>([])
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [error, setError] = useState<string>('')

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

  useEffect(() => {
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

        const headers = parseCSVLine(lines[0])
        const allDataRows = lines.slice(1).map(line => parseCSVLine(line))
        const dataRows = allDataRows.slice(0, 10)

        const columns: CSVColumn[] = headers.map((header, index) => ({
          name: header,
          index,
          sample: dataRows.map(row => row[index] || '').filter(Boolean).slice(0, 5)
        }))

        setCsvColumns(columns)
        setCsvRows(dataRows)

      } catch (error) {
        setError('Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }, [file])

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
    <div className="space-y-8">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Map CSV Fields
          </CardTitle>
          <p className="text-gray-600">
            Map your CSV columns to the correct fields. Email is required, other fields are optional.
          </p>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          {/* Enhanced Mapping Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-3xl font-bold text-gray-900 mb-1">{csvColumns.length}</div>
              <div className="text-sm font-medium text-gray-700">CSV Columns</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-1">{summary.total}</div>
              <div className="text-sm font-medium text-green-700">Mapped</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-1">{autoMapped.length}</div>
              <div className="text-sm font-medium text-purple-700">Auto-detected</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
              <div className="text-3xl font-bold text-orange-600 mb-1">{summary.unmapped}</div>
              <div className="text-sm font-medium text-orange-700">Unmapped</div>
            </div>
          </div>

          {/* CSV Preview Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b">
              <h4 className="font-medium text-gray-900">Data Preview (first 10 rows)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    {csvColumns.map((column, index) => (
                      <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r">
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, rowIndex) => (
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
                      <span>(v)</span>
                    )}
                    {field.required && !mapping[field.key] && (
                      <span>(!)</span>
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

          {/* Enhanced Actions */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={onBack}
              className="h-12 px-6 flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Upload
            </Button>
            
            <div className="flex items-center gap-4">
              {!isValidMapping() && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  Email field is required
                </div>
              )}
              <Button 
                onClick={() => onMappingComplete(mapping)}
                disabled={!isValidMapping()}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg font-medium flex items-center gap-2"
                size="lg"
              >
                Start Import
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}