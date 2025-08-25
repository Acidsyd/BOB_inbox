'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Download,
  FileText,
  Table,
  Code2,
  FileImage,
  Settings,
  Filter,
  Calendar,
  Cloud,
  Mail,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Save,
  Clock,
  Database
} from 'lucide-react'

interface ExportColumn {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'json'
  required?: boolean
  selected: boolean
  order?: number
}

interface ExportFilter {
  field: string
  operator: 'equals' | 'contains' | 'starts_with' | 'date_range' | 'in' | 'not_null'
  value: any
  label: string
}

interface ExportTemplate {
  id: string
  name: string
  description: string
  columns: ExportColumn[]
  filters: ExportFilter[]
  format: string
  settings: Record<string, any>
  usage_count: number
  created_at: string
}

interface ExportWizardProps {
  organizationId: string
  totalRecords: number
  availableColumns: ExportColumn[]
  filters?: ExportFilter[]
  templates?: ExportTemplate[]
  onExport: (config: ExportConfig) => Promise<void>
  onSaveTemplate: (template: Omit<ExportTemplate, 'id' | 'created_at' | 'usage_count'>) => void
  className?: string
}

interface ExportConfig {
  format: string
  columns: ExportColumn[]
  filters: ExportFilter[]
  settings: {
    includeHeaders: boolean
    dateFormat: string
    encoding: string
    compression: boolean
    chunkSize: number
    cloudStorage?: {
      provider: string
      bucket: string
      path: string
    }
    emailDelivery?: {
      recipients: string[]
      subject: string
      message: string
    }
    scheduling?: {
      enabled: boolean
      frequency: string
      dayOfWeek?: number
      dayOfMonth?: number
      time: string
    }
  }
}

const exportFormats = [
  {
    value: 'csv',
    label: 'CSV',
    description: 'Comma-separated values - Universal format',
    icon: <FileText className="h-5 w-5" />,
    mimeType: 'text/csv'
  },
  {
    value: 'xlsx',
    label: 'Excel',
    description: 'Microsoft Excel spreadsheet',
    icon: <Table className="h-5 w-5" />,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'JavaScript Object Notation - Developer friendly',
    icon: <Code2 className="h-5 w-5" />,
    mimeType: 'application/json'
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Portable Document Format - Print ready',
    icon: <FileImage className="h-5 w-5" />,
    mimeType: 'application/pdf'
  },
  {
    value: 'google-sheets',
    label: 'Google Sheets',
    description: 'Create or update Google Sheets directly',
    icon: <Table className="h-5 w-5 text-green-600" />,
    mimeType: 'application/vnd.google-apps.spreadsheet'
  }
]

export default function ExportWizard({
  organizationId,
  totalRecords,
  availableColumns,
  filters = [],
  templates = [],
  onExport,
  onSaveTemplate,
  className
}: ExportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFormat, setSelectedFormat] = useState('csv')
  const [selectedColumns, setSelectedColumns] = useState<ExportColumn[]>([])
  const [exportFilters, setExportFilters] = useState<ExportFilter[]>(filters)
  const [exportSettings, setExportSettings] = useState({
    includeHeaders: true,
    dateFormat: 'YYYY-MM-DD',
    encoding: 'utf-8',
    compression: false,
    chunkSize: 10000,
    cloudStorage: undefined,
    emailDelivery: undefined,
    scheduling: undefined
  })
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [estimatedSize, setEstimatedSize] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [deliveryMethod, setDeliveryMethod] = useState<'download' | 'cloud' | 'email'>('download')
  const [cloudConfig, setCloudConfig] = useState({
    provider: 'google-drive',
    folder: '',
    filename: ''
  })
  const [emailConfig, setEmailConfig] = useState({
    recipients: [''],
    subject: '',
    message: '',
    includeLink: true
  })
  const [schedulingEnabled, setSchedulingEnabled] = useState(false)
  const [schedulingConfig, setSchedulingConfig] = useState({
    frequency: 'once',
    time: '09:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timezone: 'UTC'
  })

  const steps = [
    { title: 'Format', description: 'Choose export format' },
    { title: 'Columns', description: 'Select data columns' },
    { title: 'Filters', description: 'Filter data (optional)' },
    { title: 'Settings', description: 'Export options' },
    { title: 'Delivery', description: 'Delivery & scheduling' },
    { title: 'Review', description: 'Confirm export' }
  ]

  // Initialize with default columns
  useEffect(() => {
    if (availableColumns.length && selectedColumns.length === 0) {
      const defaultColumns = availableColumns.filter(col => col.required || 
        ['email', 'first_name', 'last_name', 'company'].includes(col.name)
      )
      setSelectedColumns(defaultColumns.map(col => ({ ...col, selected: true })))
    }
  }, [availableColumns, selectedColumns.length])

  // Calculate estimated file size
  const calculateEstimatedSize = useCallback(() => {
    const selectedCount = selectedColumns.filter(col => col.selected).length
    const filteredRecords = Math.min(totalRecords, 50000) // Estimate based on current filters
    const avgBytesPerCell = 15 // Average bytes per cell
    
    let baseSize = selectedCount * filteredRecords * avgBytesPerCell

    // Format multipliers
    const formatMultipliers = {
      csv: 1,
      xlsx: 1.3,
      json: 1.5,
      pdf: 2.5
    }

    baseSize *= formatMultipliers[selectedFormat as keyof typeof formatMultipliers] || 1

    // Compression factor
    if (exportSettings.compression) {
      baseSize *= 0.3 // Assume ~70% compression
    }

    setEstimatedSize(baseSize)
  }, [selectedColumns, selectedFormat, exportSettings.compression, totalRecords])

  useEffect(() => {
    calculateEstimatedSize()
  }, [calculateEstimatedSize])

  // Apply template
  const applyTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setSelectedFormat(template.format)
    setSelectedColumns(template.columns)
    setExportFilters(template.filters)
    setExportSettings(prev => ({ ...prev, ...template.settings }))
    setSelectedTemplate(templateId)
  }, [templates])

  // Toggle column selection
  const toggleColumn = useCallback((columnName: string) => {
    setSelectedColumns(cols => 
      cols.map(col => 
        col.name === columnName 
          ? { ...col, selected: !col.selected }
          : col
      )
    )
  }, [])

  // Reorder columns
  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedColumns(cols => {
      const newCols = [...cols]
      const [removed] = newCols.splice(fromIndex, 1)
      newCols.splice(toIndex, 0, removed)
      return newCols.map((col, index) => ({ ...col, order: index }))
    })
  }, [])

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter: ExportFilter = {
      field: availableColumns[0]?.name || '',
      operator: 'equals',
      value: '',
      label: 'New Filter'
    }
    setExportFilters(prev => [...prev, newFilter])
  }, [availableColumns])

  // Update filter
  const updateFilter = useCallback((index: number, updates: Partial<ExportFilter>) => {
    setExportFilters(prev => 
      prev.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    )
  }, [])

  // Remove filter
  const removeFilter = useCallback((index: number) => {
    setExportFilters(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      const updatedSettings = { ...exportSettings }
      
      // Add delivery configuration
      if (deliveryMethod === 'cloud') {
        updatedSettings.cloudStorage = {
          provider: cloudConfig.provider,
          bucket: cloudConfig.folder || '/exports',
          path: cloudConfig.filename || `export-${Date.now()}.${selectedFormat}`
        }
      } else if (deliveryMethod === 'email') {
        updatedSettings.emailDelivery = {
          recipients: emailConfig.recipients,
          subject: emailConfig.subject || 'Your export is ready',
          message: emailConfig.message || 'Your requested data export has been completed.',
          includeLink: emailConfig.includeLink
        }
      }
      
      // Add scheduling configuration
      if (schedulingEnabled) {
        updatedSettings.scheduling = {
          enabled: true,
          frequency: schedulingConfig.frequency,
          time: schedulingConfig.time,
          timezone: schedulingConfig.timezone,
          dayOfWeek: schedulingConfig.dayOfWeek,
          dayOfMonth: schedulingConfig.dayOfMonth
        }
      }

      const exportConfig: ExportConfig = {
        format: selectedFormat,
        columns: selectedColumns.filter(col => col.selected),
        filters: exportFilters,
        settings: updatedSettings
      }

      await onExport(exportConfig)
      
      // Reset wizard
      setCurrentStep(0)
      setIsExporting(false)
      setExportProgress(0)
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
    }
  }, [selectedFormat, selectedColumns, exportFilters, exportSettings, deliveryMethod, cloudConfig, emailConfig, schedulingEnabled, schedulingConfig, onExport])

  // Save as template
  const saveAsTemplate = useCallback(() => {
    const templateName = `Export Template ${new Date().toLocaleDateString()}`
    onSaveTemplate({
      name: templateName,
      description: `${selectedFormat.toUpperCase()} export with ${selectedColumns.filter(c => c.selected).length} columns`,
      columns: selectedColumns,
      filters: exportFilters,
      format: selectedFormat,
      settings: exportSettings
    })
  }, [selectedColumns, exportFilters, selectedFormat, exportSettings, onSaveTemplate])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (stepIndex === currentStep) return <div className="h-5 w-5 bg-purple-600 rounded-full" />
    return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
  }

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: return selectedFormat !== ''
      case 1: return selectedColumns.some(col => col.selected)
      case 2: return true // Filters are optional
      case 3: return true // Settings are optional
      case 4: return true // Delivery is optional
      case 5: return true // Review step
      default: return false
    }
  }, [currentStep, selectedFormat, selectedColumns])

  if (isExporting) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Exporting Data</h3>
            <p className="text-gray-600 mb-6">
              Processing {totalRecords} records in {selectedFormat.toUpperCase()} format...
            </p>
            <div className="space-y-2">
              <Progress value={exportProgress} className="h-3" />
              <p className="text-sm text-gray-500">{exportProgress}% complete</p>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center text-sm text-blue-800">
                <Database className="h-4 w-4 mr-2" />
                Large exports may take several minutes
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2 text-purple-600" />
            Export Wizard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className="flex flex-col items-center">
                  {getStepIcon(index)}
                  <div className="text-center mt-2">
                    <p className={`text-sm font-medium ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Template Selection */}
          {templates.length > 0 && currentStep === 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Quick Start Templates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.slice(0, 6).map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className="p-3 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-white transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {template.columns.length} columns • {template.format.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Used {template.usage_count} times
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 0: Format Selection */}
          {currentStep === 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Export Format</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportFormats.map(format => (
                  <button
                    key={format.value}
                    onClick={() => setSelectedFormat(format.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedFormat === format.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3 mt-1">
                        {format.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">{format.label}</h4>
                        <p className="text-sm text-gray-600">{format.description}</p>
                        <p className="text-xs text-gray-500 mt-2">{format.mimeType}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Column Selection */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select Columns</h3>
                <Badge variant="outline">
                  {selectedColumns.filter(col => col.selected).length} selected
                </Badge>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedColumns.map((column, index) => (
                  <div
                    key={column.name}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={column.selected}
                        onChange={() => toggleColumn(column.name)}
                        className="mr-3"
                        disabled={column.required}
                      />
                      <div>
                        <span className="font-medium text-gray-900">{column.label}</span>
                        {column.required && (
                          <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                        )}
                        <div className="text-xs text-gray-500">{column.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs">
                        {column.name}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Filters */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Data Filters (Optional)</h3>
                <Button onClick={addFilter} size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </div>
              {exportFilters.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No filters applied - all records will be exported</p>
                  <p className="text-sm text-gray-500 mt-2">Add filters to limit the exported data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exportFilters.map((filter, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <select
                          value={filter.field}
                          onChange={(e) => updateFilter(index, { field: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          {availableColumns.map(col => (
                            <option key={col.name} value={col.name}>{col.label}</option>
                          ))}
                        </select>
                        <select
                          value={filter.operator}
                          onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="starts_with">Starts with</option>
                          <option value="date_range">Date range</option>
                          <option value="in">In list</option>
                          <option value="not_null">Not empty</option>
                        </select>
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          placeholder="Filter value"
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <Button
                          onClick={() => removeFilter(index)}
                          variant="outline"
                          size="sm"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Settings */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Export Settings</h3>
              <div className="space-y-6">
                {/* Basic Settings */}
                <div>
                  <h4 className="font-medium mb-3">Basic Options</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportSettings.includeHeaders}
                        onChange={(e) => setExportSettings(prev => ({
                          ...prev,
                          includeHeaders: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      Include column headers
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportSettings.compression}
                        onChange={(e) => setExportSettings(prev => ({
                          ...prev,
                          compression: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      Compress file (recommended for large exports)
                    </label>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center font-medium text-purple-600 hover:text-purple-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Settings
                  </button>
                  {showAdvanced && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Format
                          </label>
                          <select
                            value={exportSettings.dateFormat}
                            onChange={(e) => setExportSettings(prev => ({
                              ...prev,
                              dateFormat: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="YYYY-MM-DD">2024-01-15</option>
                            <option value="MM/DD/YYYY">01/15/2024</option>
                            <option value="DD/MM/YYYY">15/01/2024</option>
                            <option value="ISO">2024-01-15T10:30:00Z</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            File Encoding
                          </label>
                          <select
                            value={exportSettings.encoding}
                            onChange={(e) => setExportSettings(prev => ({
                              ...prev,
                              encoding: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="utf-8">UTF-8</option>
                            <option value="iso-8859-1">ISO-8859-1</option>
                            <option value="windows-1252">Windows-1252</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Delivery */}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Delivery & Scheduling</h3>
              <div className="space-y-6">
                {/* Delivery Method */}
                <div>
                  <h4 className="font-medium mb-3">Delivery Method</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setDeliveryMethod('download')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        deliveryMethod === 'download'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Download className="h-5 w-5 mb-2 text-purple-600" />
                      <h5 className="font-medium">Direct Download</h5>
                      <p className="text-sm text-gray-600">Download file immediately</p>
                    </button>
                    
                    <button
                      onClick={() => setDeliveryMethod('cloud')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        deliveryMethod === 'cloud'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Cloud className="h-5 w-5 mb-2 text-blue-600" />
                      <h5 className="font-medium">Cloud Storage</h5>
                      <p className="text-sm text-gray-600">Save to cloud storage</p>
                    </button>
                    
                    <button
                      onClick={() => setDeliveryMethod('email')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        deliveryMethod === 'email'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Mail className="h-5 w-5 mb-2 text-green-600" />
                      <h5 className="font-medium">Email Delivery</h5>
                      <p className="text-sm text-gray-600">Send via email</p>
                    </button>
                  </div>
                </div>

                {/* Cloud Storage Configuration */}
                {deliveryMethod === 'cloud' && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium mb-3">Cloud Storage Settings</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Provider
                        </label>
                        <select
                          value={cloudConfig.provider}
                          onChange={(e) => setCloudConfig(prev => ({ ...prev, provider: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="google-drive">Google Drive</option>
                          <option value="dropbox">Dropbox</option>
                          <option value="onedrive">OneDrive</option>
                          <option value="aws-s3">AWS S3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Folder Path
                        </label>
                        <input
                          type="text"
                          value={cloudConfig.folder}
                          onChange={(e) => setCloudConfig(prev => ({ ...prev, folder: e.target.value }))}
                          placeholder="/exports/leads"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Filename (optional)
                      </label>
                      <input
                        type="text"
                        value={cloudConfig.filename}
                        onChange={(e) => setCloudConfig(prev => ({ ...prev, filename: e.target.value }))}
                        placeholder="leads-export-{date}.csv"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                )}

                {/* Email Delivery Configuration */}
                {deliveryMethod === 'email' && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-medium mb-3">Email Delivery Settings</h5>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Recipients (one per line)
                        </label>
                        <textarea
                          value={emailConfig.recipients.join('\n')}
                          onChange={(e) => setEmailConfig(prev => ({ 
                            ...prev, 
                            recipients: e.target.value.split('\n').filter(email => email.trim())
                          }))}
                          placeholder="user@example.com"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={emailConfig.subject}
                            onChange={(e) => setEmailConfig(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Your exported data is ready"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="flex items-center mt-6">
                            <input
                              type="checkbox"
                              checked={emailConfig.includeLink}
                              onChange={(e) => setEmailConfig(prev => ({ ...prev, includeLink: e.target.checked }))}
                              className="mr-2"
                            />
                            Include download link
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Message (optional)
                        </label>
                        <textarea
                          value={emailConfig.message}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Your requested data export has been completed..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Scheduling */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Scheduling (Optional)</h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={schedulingEnabled}
                        onChange={(e) => setSchedulingEnabled(e.target.checked)}
                        className="mr-2"
                      />
                      Enable scheduling
                    </label>
                  </div>
                  
                  {schedulingEnabled && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Frequency
                          </label>
                          <select
                            value={schedulingConfig.frequency}
                            onChange={(e) => setSchedulingConfig(prev => ({ ...prev, frequency: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="once">One-time</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Time
                          </label>
                          <input
                            type="time"
                            value={schedulingConfig.time}
                            onChange={(e) => setSchedulingConfig(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Timezone
                          </label>
                          <select
                            value={schedulingConfig.timezone}
                            onChange={(e) => setSchedulingConfig(prev => ({ ...prev, timezone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                            <option value="Europe/London">London</option>
                            <option value="Europe/Paris">Paris</option>
                            <option value="Asia/Tokyo">Tokyo</option>
                          </select>
                        </div>
                      </div>
                      
                      {schedulingConfig.frequency === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Day of Week
                          </label>
                          <select
                            value={schedulingConfig.dayOfWeek}
                            onChange={(e) => setSchedulingConfig(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                            <option value="0">Sunday</option>
                          </select>
                        </div>
                      )}
                      
                      {schedulingConfig.frequency === 'monthly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Day of Month
                          </label>
                          <select
                            value={schedulingConfig.dayOfMonth}
                            onChange={(e) => setSchedulingConfig(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {Array.from({ length: 28 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                        <div className="flex items-center text-sm text-yellow-800">
                          <Clock className="h-4 w-4 mr-2" />
                          {schedulingConfig.frequency === 'once' 
                            ? `Export will run once at ${schedulingConfig.time} ${schedulingConfig.timezone}`
                            : `Export will run ${schedulingConfig.frequency} at ${schedulingConfig.time} ${schedulingConfig.timezone}`
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Review Export Configuration</h3>
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{totalRecords}</div>
                      <div className="text-sm text-gray-500">Total Records</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedColumns.filter(col => col.selected).length}
                      </div>
                      <div className="text-sm text-gray-500">Columns</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatFileSize(estimatedSize)}
                      </div>
                      <div className="text-sm text-gray-500">Estimated Size</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Configuration Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Export Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Format:</span>
                        <Badge>{selectedFormat.toUpperCase()}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Headers:</span>
                        <span>{exportSettings.includeHeaders ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Compression:</span>
                        <span>{exportSettings.compression ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Filters:</span>
                        <span>{exportFilters.length} applied</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Delivery Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Method:</span>
                        <Badge variant="outline">
                          {deliveryMethod === 'download' && 'Download'}
                          {deliveryMethod === 'cloud' && 'Cloud Storage'}
                          {deliveryMethod === 'email' && 'Email'}
                        </Badge>
                      </div>
                      
                      {deliveryMethod === 'cloud' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Provider:</span>
                            <span className="capitalize">{cloudConfig.provider.replace('-', ' ')}</span>
                          </div>
                          {cloudConfig.folder && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Folder:</span>
                              <span className="text-xs font-mono">{cloudConfig.folder}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {deliveryMethod === 'email' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Recipients:</span>
                            <span>{emailConfig.recipients.length} addresses</span>
                          </div>
                          {emailConfig.subject && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Subject:</span>
                              <span className="text-xs truncate max-w-32" title={emailConfig.subject}>
                                {emailConfig.subject}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scheduled:</span>
                        <span>{schedulingEnabled ? 'Yes' : 'No'}</span>
                      </div>
                      
                      {schedulingEnabled && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frequency:</span>
                          <span className="capitalize">{schedulingConfig.frequency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Selected Columns</h4>
                    <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                      {selectedColumns.filter(col => col.selected).map(col => (
                        <div key={col.name} className="flex items-center">
                          <CheckCircle2 className="h-3 w-3 text-green-500 mr-2" />
                          <span>{col.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Delivery & Scheduling Summary */}
                {(deliveryMethod !== 'download' || schedulingEnabled) && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-center mb-2">
                      <Zap className="h-5 w-5 text-purple-600 mr-2" />
                      <h4 className="font-medium text-purple-900">Advanced Configuration Active</h4>
                    </div>
                    <div className="text-sm text-purple-800">
                      {deliveryMethod === 'cloud' && (
                        <p>• Export will be saved to {cloudConfig.provider.replace('-', ' ')} cloud storage</p>
                      )}
                      {deliveryMethod === 'email' && (
                        <p>• Export will be sent to {emailConfig.recipients.length} email recipient{emailConfig.recipients.length > 1 ? 's' : ''}</p>
                      )}
                      {schedulingEnabled && (
                        <p>
                          • Export scheduled to run {schedulingConfig.frequency} 
                          {schedulingConfig.frequency !== 'once' && ` at ${schedulingConfig.time} ${schedulingConfig.timezone}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  variant="outline"
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep === 5 && (
                <Button
                  onClick={saveAsTemplate}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed}
                  className="flex items-center"
                >
                  Next
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleExport}
                  disabled={!canProceed}
                  className="flex items-center btn-primary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {schedulingEnabled ? 'Schedule Export' : 'Start Export'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}