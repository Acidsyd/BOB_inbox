'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  Brain, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Save, 
  Template,
  Sparkles,
  Eye,
  TrendingUp,
  Zap
} from 'lucide-react'

interface FieldMapping {
  sourceField: string
  targetField: string
  confidence: number
  status: 'mapped' | 'unmapped' | 'conflict' | 'suggested'
  dataType: 'email' | 'name' | 'text' | 'number' | 'date' | 'url' | 'unknown'
  sampleValues: string[]
  validationRules?: ValidationRule[]
  aiSuggestion?: {
    reason: string
    alternatives: string[]
  }
}

interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'url' | 'pattern' | 'length'
  value?: any
  message: string
}

interface MappingTemplate {
  id: string
  name: string
  description: string
  mappings: Record<string, string>
  usage_count: number
  created_at: string
}

interface SmartFieldMapperProps {
  csvData: any[]
  headers: string[]
  onMappingChange: (mappings: Record<string, string>) => void
  onSaveTemplate: (template: Omit<MappingTemplate, 'id' | 'created_at'>) => void
  templates?: MappingTemplate[]
  onBulkMapping?: (mappings: Record<string, string>) => void
  onValidationRulesChange?: (rules: ValidationRule[]) => void
  enableAISuggestions?: boolean
  className?: string
}

export default function SmartFieldMapper({
  csvData,
  headers,
  onMappingChange,
  onSaveTemplate,
  templates = [],
  onBulkMapping,
  onValidationRulesChange,
  enableAISuggestions = true,
  className
}: SmartFieldMapperProps) {
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [bulkMappingMode, setBulkMappingMode] = useState(false)
  const [customValidationRules, setCustomValidationRules] = useState<ValidationRule[]>([])
  const [mappingTemplates, setMappingTemplates] = useState<MappingTemplate[]>(templates || [])
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState(0.6)
  const [previewRowCount, setPreviewRowCount] = useState(3)

  // Available target fields with categories
  const targetFields = useMemo(() => ({
    core: [
      { value: 'email', label: 'Email Address', required: true, icon: '📧' },
      { value: 'first_name', label: 'First Name', required: true, icon: '👤' },
      { value: 'last_name', label: 'Last Name', required: true, icon: '👤' },
      { value: 'company', label: 'Company', required: false, icon: '🏢' }
    ],
    contact: [
      { value: 'phone', label: 'Phone Number', required: false, icon: '📞' },
      { value: 'mobile', label: 'Mobile Phone', required: false, icon: '📱' },
      { value: 'website', label: 'Website', required: false, icon: '🌐' },
      { value: 'linkedin_url', label: 'LinkedIn URL', required: false, icon: '💼' }
    ],
    professional: [
      { value: 'job_title', label: 'Job Title', required: false, icon: '💼' },
      { value: 'department', label: 'Department', required: false, icon: '🏢' },
      { value: 'industry', label: 'Industry', required: false, icon: '🏭' },
      { value: 'seniority', label: 'Seniority Level', required: false, icon: '📊' }
    ],
    location: [
      { value: 'location', label: 'Location', required: false, icon: '📍' },
      { value: 'country', label: 'Country', required: false, icon: '🌍' },
      { value: 'city', label: 'City', required: false, icon: '🏙️' },
      { value: 'timezone', label: 'Timezone', required: false, icon: '🕐' }
    ],
    custom: [
      { value: 'tags', label: 'Tags', required: false, icon: '🏷️' },
      { value: 'source', label: 'Lead Source', required: false, icon: '📥' },
      { value: 'notes', label: 'Notes', required: false, icon: '📝' },
      { value: 'score', label: 'Lead Score', required: false, icon: '⭐' }
    ]
  }), [])

  const allTargetFields = useMemo(() => 
    Object.values(targetFields).flat()
  , [targetFields])

  // AI-powered field analysis
  const analyzeFieldContent = useCallback((fieldName: string, sampleValues: string[]) => {
    const cleanValues = sampleValues.filter(v => v && v.trim()).slice(0, 5)
    if (!cleanValues.length) return { dataType: 'unknown', confidence: 0 }

    // Email detection
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emailCount = cleanValues.filter(v => emailPattern.test(v.toLowerCase())).length
    if (emailCount / cleanValues.length > 0.8) {
      return { dataType: 'email', confidence: 0.95 }
    }

    // URL detection
    const urlPattern = /^https?:\/\//
    const urlCount = cleanValues.filter(v => urlPattern.test(v.toLowerCase())).length
    if (urlCount / cleanValues.length > 0.7) {
      return { dataType: 'url', confidence: 0.9 }
    }

    // Phone number detection
    const phonePattern = /^[\+]?[1-9][\d]{0,15}$/
    const cleanedPhones = cleanValues.map(v => v.replace(/[\s\-\(\)]/g, ''))
    const phoneCount = cleanedPhones.filter(v => phonePattern.test(v)).length
    if (phoneCount / cleanValues.length > 0.7) {
      return { dataType: 'phone', confidence: 0.85 }
    }

    // Number detection
    const numberPattern = /^\d+(\.\d+)?$/
    const numberCount = cleanValues.filter(v => numberPattern.test(v)).length
    if (numberCount / cleanValues.length > 0.8) {
      return { dataType: 'number', confidence: 0.8 }
    }

    // Name detection (simple heuristics)
    const namePattern = /^[a-zA-Z\s\-\'\.]+$/
    const nameCount = cleanValues.filter(v => namePattern.test(v) && v.split(' ').length <= 3).length
    if (nameCount / cleanValues.length > 0.8 && cleanValues.every(v => v.length < 50)) {
      return { dataType: 'name', confidence: 0.7 }
    }

    return { dataType: 'text', confidence: 0.5 }
  }, [])

  // Smart mapping suggestion algorithm
  const suggestMapping = useCallback((sourceField: string, sampleValues: string[]) => {
    const fieldLower = sourceField.toLowerCase().replace(/[\s_\-]/g, '')
    const { dataType, confidence: typeConfidence } = analyzeFieldContent(sourceField, sampleValues)

    let bestMatch = ''
    let maxConfidence = 0
    let reason = ''
    let alternatives: string[] = []

    // Exact field name matching with high confidence
    const exactMatches: Record<string, string> = {
      'email': 'email',
      'emailaddress': 'email',
      'mail': 'email',
      'firstname': 'first_name',
      'fname': 'first_name',
      'givenname': 'first_name',
      'lastname': 'last_name',
      'lname': 'last_name',
      'surname': 'last_name',
      'familyname': 'last_name',
      'company': 'company',
      'organization': 'company',
      'employer': 'company',
      'jobtitle': 'job_title',
      'title': 'job_title',
      'position': 'job_title',
      'phone': 'phone',
      'phonenumber': 'phone',
      'mobile': 'mobile',
      'website': 'website',
      'linkedin': 'linkedin_url',
      'linkedinurl': 'linkedin_url',
      'location': 'location',
      'city': 'city',
      'country': 'country'
    }

    if (exactMatches[fieldLower]) {
      bestMatch = exactMatches[fieldLower]
      maxConfidence = 0.95
      reason = 'Exact field name match'
    }

    // Partial field name matching
    if (!bestMatch) {
      for (const [pattern, target] of Object.entries(exactMatches)) {
        if (fieldLower.includes(pattern) || pattern.includes(fieldLower)) {
          const confidence = Math.min(0.85, pattern.length / fieldLower.length)
          if (confidence > maxConfidence) {
            bestMatch = target
            maxConfidence = confidence
            reason = `Partial field name match (${pattern})`
          }
        }
      }
    }

    // Data type-based matching
    if (dataType === 'email' && typeConfidence > 0.8) {
      if (maxConfidence < typeConfidence) {
        bestMatch = 'email'
        maxConfidence = typeConfidence
        reason = 'Content analysis detected email format'
      }
      if (!alternatives.includes('email')) alternatives.push('email')
    }

    if (dataType === 'url' && typeConfidence > 0.7) {
      const urlTargets = ['website', 'linkedin_url']
      if (fieldLower.includes('linkedin')) {
        if (maxConfidence < typeConfidence) {
          bestMatch = 'linkedin_url'
          maxConfidence = typeConfidence
          reason = 'LinkedIn URL detected'
        }
      } else if (maxConfidence < typeConfidence) {
        bestMatch = 'website'
        maxConfidence = typeConfidence
        reason = 'URL format detected'
      }
      alternatives.push(...urlTargets.filter(t => t !== bestMatch))
    }

    if (dataType === 'name' && typeConfidence > 0.6) {
      alternatives.push('first_name', 'last_name')
    }

    // Fuzzy matching for common variations
    const fuzzyMatches: Record<string, { target: string, confidence: number }> = {
      'companyname': { target: 'company', confidence: 0.8 },
      'businessname': { target: 'company', confidence: 0.7 },
      'firm': { target: 'company', confidence: 0.6 },
      'role': { target: 'job_title', confidence: 0.7 },
      'occupation': { target: 'job_title', confidence: 0.7 },
      'telephone': { target: 'phone', confidence: 0.8 },
      'contact': { target: 'phone', confidence: 0.6 },
      'url': { target: 'website', confidence: 0.6 },
      'homepage': { target: 'website', confidence: 0.7 }
    }

    for (const [pattern, match] of Object.entries(fuzzyMatches)) {
      if (fieldLower.includes(pattern) && match.confidence > maxConfidence) {
        bestMatch = match.target
        maxConfidence = match.confidence
        reason = `Fuzzy match for "${pattern}"`
      }
    }

    return {
      targetField: bestMatch,
      confidence: Math.min(maxConfidence, 0.95),
      reason,
      alternatives: alternatives.filter(alt => alt !== bestMatch).slice(0, 3)
    }
  }, [analyzeFieldContent])

  // Initialize field mappings with AI suggestions
  useEffect(() => {
    if (!headers.length || !csvData.length) return

    setIsAnalyzing(true)
    
    // Analyze each field
    const mappings: FieldMapping[] = headers.map(header => {
      const sampleValues = csvData
        .slice(0, 10)
        .map(row => row[header])
        .filter(val => val !== null && val !== undefined && val !== '')

      const suggestion = suggestMapping(header, sampleValues)
      const { dataType } = analyzeFieldContent(header, sampleValues)

      return {
        sourceField: header,
        targetField: suggestion.targetField,
        confidence: suggestion.confidence,
        status: suggestion.confidence > 0.6 ? 'suggested' : 'unmapped',
        dataType: dataType as any,
        sampleValues: sampleValues.slice(0, 3),
        aiSuggestion: {
          reason: suggestion.reason,
          alternatives: suggestion.alternatives
        }
      }
    })

    setFieldMappings(mappings)
    setIsAnalyzing(false)

    // Generate preview
    const mapped = mappings
      .filter(m => m.targetField)
      .reduce((acc, m) => ({ ...acc, [m.targetField]: m.sourceField }), {})
    
    onMappingChange(mapped)
  }, [headers, csvData, suggestMapping, analyzeFieldContent, onMappingChange])

  // Update mapping for a specific field
  const updateFieldMapping = useCallback((index: number, targetField: string) => {
    const newMappings = [...fieldMappings]
    const mapping = newMappings[index]
    
    // Check for conflicts
    const existingMapping = newMappings.find((m, i) => 
      i !== index && m.targetField === targetField && targetField !== ''
    )

    if (existingMapping && targetField) {
      // Mark both as conflict
      mapping.status = 'conflict'
      existingMapping.status = 'conflict'
    } else {
      mapping.status = targetField ? 'mapped' : 'unmapped'
      // Clear conflict status for other fields
      newMappings.forEach(m => {
        if (m.targetField === targetField && m.status === 'conflict') {
          m.status = 'mapped'
        }
      })
    }

    mapping.targetField = targetField
    mapping.confidence = targetField ? Math.max(mapping.confidence, 0.8) : 0

    setFieldMappings(newMappings)

    // Update parent component
    const mapped = newMappings
      .filter(m => m.targetField && m.status !== 'conflict')
      .reduce((acc, m) => ({ ...acc, [m.targetField]: m.sourceField }), {})
    
    onMappingChange(mapped)
  }, [fieldMappings, onMappingChange])

  // Apply template mappings
  const applyTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    const newMappings = fieldMappings.map(mapping => {
      const templateMapping = template.mappings[mapping.sourceField.toLowerCase()]
      if (templateMapping) {
        return {
          ...mapping,
          targetField: templateMapping,
          status: 'mapped' as const,
          confidence: 0.9
        }
      }
      return mapping
    })

    setFieldMappings(newMappings)
    setSelectedTemplate(templateId)

    // Update parent component
    const mapped = newMappings
      .filter(m => m.targetField)
      .reduce((acc, m) => ({ ...acc, [m.targetField]: m.sourceField }), {})
    
    onMappingChange(mapped)
  }, [fieldMappings, templates, onMappingChange])

  // Auto-map similar fields with improved AI
  const autoMapSimilarFields = useCallback(() => {
    setIsAnalyzing(true)
    
    const newMappings = fieldMappings.map(mapping => {
      if (mapping.status === 'unmapped') {
        const suggestion = suggestMapping(mapping.sourceField, mapping.sampleValues)
        if (suggestion.confidence > aiConfidenceThreshold) {
          return {
            ...mapping,
            targetField: suggestion.targetField,
            status: 'suggested' as const,
            confidence: suggestion.confidence,
            aiSuggestion: {
              reason: suggestion.reason,
              alternatives: suggestion.alternatives
            }
          }
        }
      }
      return mapping
    })

    setFieldMappings(newMappings)
    setIsAnalyzing(false)

    // Trigger bulk mapping callback if provided
    if (onBulkMapping) {
      const mapped = newMappings
        .filter(m => m.targetField && m.status !== 'conflict')
        .reduce((acc, m) => ({ ...acc, [m.targetField]: m.sourceField }), {})
      onBulkMapping(mapped)
    }
  }, [fieldMappings, suggestMapping, aiConfidenceThreshold, onBulkMapping])

  // Save current mapping as template with enhanced metadata
  const saveAsTemplate = useCallback(() => {
    const mappings = fieldMappings
      .filter(m => m.targetField)
      .reduce((acc, m) => ({ 
        ...acc, 
        [m.sourceField.toLowerCase()]: m.targetField 
      }), {})

    const templateName = `Template ${new Date().toLocaleDateString()}`
    const avgConfidence = fieldMappings
      .filter(m => m.targetField)
      .reduce((acc, m) => acc + m.confidence, 0) / (Object.keys(mappings).length || 1)

    const template = {
      name: templateName,
      description: `Template with ${Object.keys(mappings).length} mappings (${Math.round(avgConfidence * 100)}% avg confidence)`,
      mappings,
      usage_count: 0,
      metadata: {
        avgConfidence,
        fieldCount: Object.keys(mappings).length,
        createdFrom: headers.join(', '),
        customValidationRules: customValidationRules.length
      }
    }

    onSaveTemplate(template)
    
    // Add to local templates
    setMappingTemplates(prev => [...prev, { ...template, id: crypto.randomUUID(), created_at: new Date().toISOString() }])
  }, [fieldMappings, onSaveTemplate, headers, customValidationRules])

  // Statistics
  const stats = useMemo(() => {
    const total = fieldMappings.length
    const mapped = fieldMappings.filter(m => m.status === 'mapped' || m.status === 'suggested').length
    const required = fieldMappings.filter(m => 
      allTargetFields.find(tf => tf.value === m.targetField)?.required
    ).length
    const conflicts = fieldMappings.filter(m => m.status === 'conflict').length
    const avgConfidence = fieldMappings
      .filter(m => m.targetField)
      .reduce((acc, m) => acc + m.confidence, 0) / (mapped || 1)

    return { total, mapped, required, conflicts, avgConfidence }
  }, [fieldMappings, allTargetFields])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mapped': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'suggested': return <Sparkles className="h-4 w-4 text-blue-500" />
      case 'conflict': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <div className="h-4 w-4 border-2 border-gray-300 rounded" />
    }
  }

  if (isAnalyzing) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Analyzing Fields</h3>
            <p className="text-gray-500">AI is analyzing your data and suggesting optimal field mappings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Smart Field Mapping
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                {Math.round(stats.avgConfidence * 100)}% Confidence
              </Badge>
              <Badge variant={stats.conflicts > 0 ? "destructive" : "secondary"}>
                {stats.mapped}/{stats.total} Mapped
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.mapped}</div>
              <div className="text-sm text-gray-500">Fields Mapped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.required}</div>
              <div className="text-sm text-gray-500">Required Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.conflicts}</div>
              <div className="text-sm text-gray-500">Conflicts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(stats.avgConfidence * 100)}%
              </div>
              <div className="text-sm text-gray-500">Avg Confidence</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={autoMapSimilarFields}
              variant="outline"
              size="sm"
              className="flex items-center"
              disabled={isAnalyzing}
            >
              <Zap className="h-4 w-4 mr-2" />
              AI Auto Map ({Math.round(aiConfidenceThreshold * 100)}%+)
            </Button>

            {templates.length > 0 && (
              <select
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({Object.keys(template.mappings).length} mappings)
                  </option>
                ))}
              </select>
            )}

            <Button
              onClick={saveAsTemplate}
              variant="outline"
              size="sm"
              className="flex items-center"
              disabled={stats.mapped === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>

            <Button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              variant="ghost"
              size="sm"
            >
              Advanced Options
            </Button>

            <Button
              onClick={() => setBulkMappingMode(!bulkMappingMode)}
              variant={bulkMappingMode ? "default" : "outline"}
              size="sm"
              className="flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Bulk Mode
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options Panel */}
      {showAdvancedOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Confidence Threshold ({Math.round(aiConfidenceThreshold * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={aiConfidenceThreshold}
                  onChange={(e) => setAiConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Higher values = more conservative suggestions
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview Rows
                </label>
                <select
                  value={previewRowCount}
                  onChange={(e) => setPreviewRowCount(parseInt(e.target.value))}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value={3}>3 rows</option>
                  <option value={5}>5 rows</option>
                  <option value={10}>10 rows</option>
                </select>
              </div>
            </div>

            {/* Custom Validation Rules */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Custom Validation Rules</h4>
              <div className="space-y-2">
                {customValidationRules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <select
                      value={rule.type}
                      onChange={(e) => {
                        const newRules = [...customValidationRules]
                        newRules[index] = { ...rule, type: e.target.value as any }
                        setCustomValidationRules(newRules)
                      }}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="required">Required</option>
                      <option value="email">Email Format</option>
                      <option value="phone">Phone Format</option>
                      <option value="url">URL Format</option>
                      <option value="pattern">Custom Pattern</option>
                    </select>
                    {rule.type === 'pattern' && (
                      <input
                        type="text"
                        placeholder="Regex pattern"
                        value={rule.value || ''}
                        onChange={(e) => {
                          const newRules = [...customValidationRules]
                          newRules[index] = { ...rule, value: e.target.value }
                          setCustomValidationRules(newRules)
                        }}
                        className="px-2 py-1 border rounded text-sm flex-1"
                      />
                    )}
                    <input
                      type="text"
                      placeholder="Error message"
                      value={rule.message}
                      onChange={(e) => {
                        const newRules = [...customValidationRules]
                        newRules[index] = { ...rule, message: e.target.value }
                        setCustomValidationRules(newRules)
                      }}
                      className="px-2 py-1 border rounded text-sm flex-1"
                    />
                    <Button
                      onClick={() => {
                        const newRules = customValidationRules.filter((_, i) => i !== index)
                        setCustomValidationRules(newRules)
                      }}
                      size="sm"
                      variant="outline"
                      className="px-2"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    setCustomValidationRules([...customValidationRules, {
                      type: 'required',
                      message: 'This field is required'
                    }])
                  }}
                  size="sm"
                  variant="outline"
                >
                  Add Validation Rule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Mappings */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2">
            {fieldMappings.map((mapping, index) => (
              <div
                key={mapping.sourceField}
                className={`flex items-center p-4 border-b hover:bg-gray-50 transition-colors ${
                  mapping.status === 'conflict' ? 'bg-red-50' : ''
                }`}
              >
                {/* Source Field */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <FileText className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">
                      {mapping.sourceField}
                    </span>
                    {mapping.confidence > 0 && (
                      <Badge 
                        className={`ml-2 text-xs ${getConfidenceColor(mapping.confidence)}`}
                      >
                        {Math.round(mapping.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>Type: {mapping.dataType}</span>
                    {mapping.sampleValues.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Sample: {mapping.sampleValues[0]}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-gray-400 mx-4 flex-shrink-0" />

                {/* Target Field Selection */}
                <div className="flex-1">
                  <select
                    value={mapping.targetField}
                    onChange={(e) => updateFieldMapping(index, e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      mapping.status === 'conflict' 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select target field...</option>
                    {Object.entries(targetFields).map(([category, fields]) => (
                      <optgroup key={category} label={category.toUpperCase()}>
                        {fields.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.icon} {field.label} {field.required ? '(Required)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {/* AI Suggestion */}
                  {mapping.aiSuggestion && mapping.status === 'suggested' && (
                    <div className="mt-1 text-xs text-blue-600">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      {mapping.aiSuggestion.reason}
                      {mapping.aiSuggestion.alternatives.length > 0 && (
                        <div className="mt-1">
                          Alternatives: {mapping.aiSuggestion.alternatives.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="ml-4 flex-shrink-0">
                  {getStatusIcon(mapping.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {stats.mapped > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2 text-purple-600" />
              Mapping Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-3">
              Preview of how your data will be imported:
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-md">
                <thead className="bg-gray-50">
                  <tr>
                    {fieldMappings
                      .filter(m => m.targetField && m.status !== 'conflict')
                      .map(mapping => (
                        <th key={mapping.targetField} className="px-4 py-2 text-left text-xs font-medium text-gray-700 border-r">
                          {allTargetFields.find(f => f.value === mapping.targetField)?.label || mapping.targetField}
                        </th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, previewRowCount).map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {fieldMappings
                        .filter(m => m.targetField && m.status !== 'conflict')
                        .map(mapping => (
                          <td key={mapping.targetField} className="px-4 py-2 text-sm text-gray-900 border-r">
                            {row[mapping.sourceField] || '-'}
                          </td>
                        ))
                      }
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}