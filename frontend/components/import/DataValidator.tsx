'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileSearch,
  Brain,
  Zap,
  Eye,
  RefreshCw,
  Download,
  BarChart3,
  Sparkles,
  Settings,
  Target,
  Clock,
  Users,
  Database
} from 'lucide-react'

interface ValidationResult {
  field: string
  type: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
  affectedRows: number[]
  severity: 'critical' | 'major' | 'minor'
  fixable: boolean
  autoFix?: () => void
  confidence?: number
}

interface DataQualityScore {
  overall: number
  completeness: number
  consistency: number
  validity: number
  uniqueness: number
  accuracy: number
  enrichment?: number
}

interface ValidationRule {
  field: string
  type: 'required' | 'email' | 'phone' | 'url' | 'pattern' | 'length' | 'range' | 'custom' | 'enrichment'
  params?: any
  message?: string
  severity: 'error' | 'warning'
  enabled?: boolean
}

interface EnrichmentSuggestion {
  field: string
  type: 'missing_data' | 'format_improvement' | 'data_enhancement'
  message: string
  confidence: number
  action?: string
  preview?: string
}

interface DataValidatorProps {
  data: any[]
  headers: string[]
  mapping: Record<string, string>
  validationRules?: ValidationRule[]
  onValidationComplete: (results: ValidationResult[]) => void
  onDataQualityScore: (score: DataQualityScore) => void
  onEnrichmentSuggestions?: (suggestions: EnrichmentSuggestion[]) => void
  enableAdvancedValidation?: boolean
  enableEnrichmentSuggestions?: boolean
  className?: string
}

export default function DataValidator({
  data,
  headers,
  mapping,
  validationRules = [],
  onValidationComplete,
  onDataQualityScore,
  onEnrichmentSuggestions,
  enableAdvancedValidation = true,
  enableEnrichmentSuggestions = false,
  className
}: DataValidatorProps) {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [dataQualityScore, setDataQualityScore] = useState<DataQualityScore | null>(null)
  const [enrichmentSuggestions, setEnrichmentSuggestions] = useState<EnrichmentSuggestion[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [validationProgress, setValidationProgress] = useState(0)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showPreview, setShowPreview] = useState(false)
  const [showEnrichment, setShowEnrichment] = useState(false)
  const [autoFixEnabled, setAutoFixEnabled] = useState(false)
  const [customRules, setCustomRules] = useState<ValidationRule[]>(validationRules)

  // Enhanced validation engine with progress tracking
  const validateData = useCallback(async () => {
    setIsValidating(true)
    setValidationProgress(0)
    const results: ValidationResult[] = []
    const enrichmentSugs: EnrichmentSuggestion[] = []
    
    try {
      // Phase 1: Built-in validations (40% of progress)
      setValidationProgress(10)
      const builtInResults = await runBuiltInValidations(data, headers, mapping)
      results.push(...builtInResults)
      setValidationProgress(40)
      
      // Phase 2: Custom validation rules (20% of progress)
      const customResults = await runCustomValidations(data, customRules, mapping)
      results.push(...customResults)
      setValidationProgress(60)
      
      // Phase 3: Advanced pattern detection (20% of progress)
      if (enableAdvancedValidation) {
        const advancedResults = await runAdvancedValidations(data, mapping)
        results.push(...advancedResults)
      }
      setValidationProgress(80)
      
      // Phase 4: Enrichment suggestions (20% of progress)
      if (enableEnrichmentSuggestions) {
        const enrichmentResults = await generateEnrichmentSuggestions(data, mapping)
        enrichmentSugs.push(...enrichmentResults)
      }
      setValidationProgress(90)
      
      // Phase 5: Calculate quality score
      const qualityScore = calculateDataQualityScore(data, results, mapping, enrichmentSugs)
      setValidationProgress(100)
      
      setValidationResults(results)
      setDataQualityScore(qualityScore)
      setEnrichmentSuggestions(enrichmentSugs)
      
      onValidationComplete(results)
      onDataQualityScore(qualityScore)
      if (onEnrichmentSuggestions) {
        onEnrichmentSuggestions(enrichmentSugs)
      }
      
    } finally {
      setTimeout(() => {
        setIsValidating(false)
        setValidationProgress(0)
      }, 500)
    }
  }, [data, headers, mapping, customRules, enableAdvancedValidation, enableEnrichmentSuggestions, onValidationComplete, onDataQualityScore, onEnrichmentSuggestions])

  // Enhanced built-in validation rules
  const runBuiltInValidations = async (data: any[], headers: string[], mapping: Record<string, string>) => {
    const results: ValidationResult[] = []
    
    // Email validation with enhanced checks
    if (mapping.email) {
      const emailResults = validateEmailField(data, mapping.email)
      results.push(...emailResults)
    }
    
    // Phone number validation
    if (mapping.phone) {
      const phoneResults = validatePhoneField(data, mapping.phone)
      results.push(...phoneResults)
    }
    
    // URL validation
    if (mapping.website || mapping.linkedin_url) {
      if (mapping.website) {
        const websiteResults = validateUrlField(data, mapping.website, 'website')
        results.push(...websiteResults)
      }
      if (mapping.linkedin_url) {
        const linkedinResults = validateLinkedInField(data, mapping.linkedin_url)
        results.push(...linkedinResults)
      }
    }
    
    // Required fields validation
    const requiredFields = ['email', 'first_name'] // Could be configurable
    requiredFields.forEach(field => {
      if (mapping[field]) {
        const requiredResults = validateRequiredField(data, mapping[field], field)
        results.push(...requiredResults)
      }
    })
    
    // Duplicate detection with fuzzy matching
    if (mapping.email) {
      const duplicateResults = validateDuplicatesAdvanced(data, mapping.email)
      results.push(...duplicateResults)
    }
    
    // Data consistency checks
    const consistencyResults = validateDataConsistency(data, mapping)
    results.push(...consistencyResults)
    
    return results
  }

  // Advanced validation patterns
  const runAdvancedValidations = async (data: any[], mapping: Record<string, string>) => {
    const results: ValidationResult[] = []
    
    // Detect potential PII issues
    const piiResults = detectPIIIssues(data, mapping)
    results.push(...piiResults)
    
    // Detect data anomalies
    const anomalyResults = detectDataAnomalies(data, mapping)
    results.push(...anomalyResults)
    
    // Business logic validation
    const businessResults = validateBusinessLogic(data, mapping)
    results.push(...businessResults)
    
    return results
  }

  // Generate enrichment suggestions
  const generateEnrichmentSuggestions = async (data: any[], mapping: Record<string, string>) => {
    const suggestions: EnrichmentSuggestion[] = []
    
    // Missing data suggestions
    const missingDataSugs = detectMissingDataOpportunities(data, mapping)
    suggestions.push(...missingDataSugs)
    
    // Format improvement suggestions
    const formatSugs = suggestFormatImprovements(data, mapping)
    suggestions.push(...formatSugs)
    
    // Data enhancement suggestions
    const enhancementSugs = suggestDataEnhancements(data, mapping)
    suggestions.push(...enhancementSugs)
    
    return suggestions
  }

  // Enhanced email validation
  const validateEmailField = (data: any[], emailField: string) => {
    const results: ValidationResult[] = []
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidRows: number[] = []
    const suspiciousRows: number[] = []
    const disposableEmails = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'] // Add more
    
    data.forEach((row, index) => {
      const email = row[emailField]?.toString().trim().toLowerCase()
      if (email) {
        if (!emailRegex.test(email)) {
          invalidRows.push(index)
        } else {
          // Check for suspicious patterns
          const domain = email.split('@')[1]
          if (disposableEmails.some(disposable => domain.includes(disposable))) {
            suspiciousRows.push(index)
          }
        }
      }
    })
    
    if (invalidRows.length > 0) {
      results.push({
        field: emailField,
        type: 'error',
        message: `${invalidRows.length} invalid email addresses found`,
        suggestion: 'Check email format and fix invalid addresses',
        affectedRows: invalidRows,
        severity: 'major',
        fixable: true,
        confidence: 0.95,
        autoFix: () => {
          // Auto-fix implementation would go here
        }
      })
    }
    
    if (suspiciousRows.length > 0) {
      results.push({
        field: emailField,
        type: 'warning',
        message: `${suspiciousRows.length} potentially disposable email addresses found`,
        suggestion: 'Review disposable email addresses for lead quality',
        affectedRows: suspiciousRows,
        severity: 'minor',
        fixable: false,
        confidence: 0.7
      })
    }
    
    return results
  }

  const validatePhoneField = (data: any[], phoneField: string) => {
    const results: ValidationResult[] = []
    const invalidRows: number[] = []
    const internationalRegex = /^[\+]?[1-9][\d]{0,15}$/
    
    data.forEach((row, index) => {
      const phone = row[phoneField]?.toString().replace(/[\s\-\(\)]/g, '')
      if (phone && !internationalRegex.test(phone)) {
        invalidRows.push(index)
      }
    })
    
    if (invalidRows.length > 0) {
      results.push({
        field: phoneField,
        type: 'warning',
        message: `${invalidRows.length} potentially invalid phone numbers found`,
        suggestion: 'Verify phone number formats and international prefixes',
        affectedRows: invalidRows,
        severity: 'minor',
        fixable: true,
        confidence: 0.8
      })
    }
    
    return results
  }

  const validateUrlField = (data: any[], urlField: string, fieldType: string) => {
    const results: ValidationResult[] = []
    const invalidRows: number[] = []
    const urlRegex = /^https?:\/\/.+\..+/
    
    data.forEach((row, index) => {
      const url = row[urlField]?.toString().trim()
      if (url && !urlRegex.test(url)) {
        invalidRows.push(index)
      }
    })
    
    if (invalidRows.length > 0) {
      results.push({
        field: urlField,
        type: 'warning',
        message: `${invalidRows.length} invalid ${fieldType} URLs found`,
        suggestion: `Verify ${fieldType} URL formats (should start with http:// or https://)`,
        affectedRows: invalidRows,
        severity: 'minor',
        fixable: true,
        confidence: 0.9
      })
    }
    
    return results
  }

  const validateLinkedInField = (data: any[], linkedinField: string) => {
    const results: ValidationResult[] = []
    const invalidRows: number[] = []
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9\-]+/
    
    data.forEach((row, index) => {
      const linkedin = row[linkedinField]?.toString().trim()
      if (linkedin && !linkedinRegex.test(linkedin)) {
        invalidRows.push(index)
      }
    })
    
    if (invalidRows.length > 0) {
      results.push({
        field: linkedinField,
        type: 'warning',
        message: `${invalidRows.length} invalid LinkedIn URLs found`,
        suggestion: 'Verify LinkedIn URL format (should be linkedin.com/in/profile)',
        affectedRows: invalidRows,
        severity: 'minor',
        fixable: true,
        confidence: 0.85
      })
    }
    
    return results
  }

  const validateRequiredField = (data: any[], field: string, fieldType: string) => {
    const results: ValidationResult[] = []
    const emptyRows: number[] = []
    
    data.forEach((row, index) => {
      const value = row[field]
      if (!value || value.toString().trim() === '') {
        emptyRows.push(index)
      }
    })
    
    if (emptyRows.length > 0) {
      results.push({
        field,
        type: 'error',
        message: `${emptyRows.length} rows missing required ${fieldType} field`,
        suggestion: `Fill in missing ${fieldType} values or exclude these rows`,
        affectedRows: emptyRows,
        severity: 'critical',
        fixable: true,
        confidence: 1.0
      })
    }
    
    return results
  }

  const validateDuplicatesAdvanced = (data: any[], emailField: string) => {
    const results: ValidationResult[] = []
    const seenEmails = new Map<string, number[]>()
    const fuzzyMatches = new Map<string, number[]>()
    
    data.forEach((row, index) => {
      const email = row[emailField]?.toString().toLowerCase().trim()
      if (email) {
        // Exact duplicates
        if (!seenEmails.has(email)) {
          seenEmails.set(email, [])
        }
        seenEmails.get(email)!.push(index)
        
        // Fuzzy matching (similar emails)
        const normalized = email.replace(/[\.+].*@/, '@').replace(/\d+$/, '')
        if (!fuzzyMatches.has(normalized)) {
          fuzzyMatches.set(normalized, [])
        }
        fuzzyMatches.get(normalized)!.push(index)
      }
    })
    
    // Exact duplicates
    const duplicateRows: number[] = []
    seenEmails.forEach((indexes) => {
      if (indexes.length > 1) {
        duplicateRows.push(...indexes.slice(1))
      }
    })
    
    if (duplicateRows.length > 0) {
      results.push({
        field: emailField,
        type: 'warning',
        message: `${duplicateRows.length} exact duplicate email addresses found`,
        suggestion: 'Review and remove duplicates or merge records',
        affectedRows: duplicateRows,
        severity: 'major',
        fixable: true,
        confidence: 1.0
      })
    }
    
    // Fuzzy matches
    const fuzzyDuplicates: number[] = []
    fuzzyMatches.forEach((indexes) => {
      if (indexes.length > 1) {
        const emails = indexes.map(i => data[i][emailField])
        const uniqueEmails = new Set(emails)
        if (uniqueEmails.size > 1) {
          fuzzyDuplicates.push(...indexes)
        }
      }
    })
    
    if (fuzzyDuplicates.length > 0) {
      results.push({
        field: emailField,
        type: 'info',
        message: `${fuzzyDuplicates.length} potentially similar email addresses found`,
        suggestion: 'Review similar email addresses for potential duplicates',
        affectedRows: fuzzyDuplicates,
        severity: 'minor',
        fixable: false,
        confidence: 0.6
      })
    }
    
    return results
  }

  const validateDataConsistency = (data: any[], mapping: Record<string, string>) => {
    const results: ValidationResult[] = []
    
    // Check for inconsistent name formatting
    if (mapping.first_name) {
      const nameIssues = checkNameConsistency(data, mapping.first_name, 'first_name')
      results.push(...nameIssues)
    }
    
    if (mapping.last_name) {
      const nameIssues = checkNameConsistency(data, mapping.last_name, 'last_name')
      results.push(...nameIssues)
    }
    
    // Check for inconsistent company formatting
    if (mapping.company) {
      const companyIssues = checkCompanyConsistency(data, mapping.company)
      results.push(...companyIssues)
    }
    
    return results
  }

  const checkNameConsistency = (data: any[], field: string, type: string) => {
    const results: ValidationResult[] = []
    const inconsistentRows: number[] = []
    
    data.forEach((row, index) => {
      const name = row[field]?.toString().trim()
      if (name) {
        // Check for issues like all caps, numbers, special characters
        if (name !== name.replace(/[^a-zA-Z\s\-\']/g, '') || 
            name === name.toUpperCase() || 
            name === name.toLowerCase()) {
          inconsistentRows.push(index)
        }
      }
    })
    
    if (inconsistentRows.length > 0) {
      results.push({
        field,
        type: 'warning',
        message: `${inconsistentRows.length} ${type} entries have formatting issues`,
        suggestion: 'Standardize name formatting (proper case, remove special characters)',
        affectedRows: inconsistentRows,
        severity: 'minor',
        fixable: true,
        confidence: 0.8
      })
    }
    
    return results
  }

  const checkCompanyConsistency = (data: any[], field: string) => {
    const results: ValidationResult[] = []
    const companyVariations = new Map<string, number[]>()
    
    data.forEach((row, index) => {
      const company = row[field]?.toString().trim()
      if (company) {
        const normalized = company.toLowerCase().replace(/[\s\-\.]/g, '')
        if (!companyVariations.has(normalized)) {
          companyVariations.set(normalized, [])
        }
        companyVariations.get(normalized)!.push(index)
      }
    })
    
    // Look for potential duplicates with different formatting
    const potentialDuplicates: number[] = []
    companyVariations.forEach((indexes) => {
      if (indexes.length > 1) {
        const variants = indexes.map(i => data[i][field].toString().trim())
        const unique = new Set(variants)
        if (unique.size > 1 && unique.size < variants.length) {
          potentialDuplicates.push(...indexes)
        }
      }
    })
    
    if (potentialDuplicates.length > 0) {
      results.push({
        field,
        type: 'info',
        message: `${potentialDuplicates.length} company names may have formatting variations`,
        suggestion: 'Review and standardize company names',
        affectedRows: potentialDuplicates,
        severity: 'minor',
        fixable: true,
        confidence: 0.7
      })
    }
    
    return results
  }

  // New advanced validation functions
  const detectPIIIssues = (data: any[], mapping: Record<string, string>) => {
    const results: ValidationResult[] = []
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/
    const creditCardPattern = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/
    const piiRows: number[] = []
    
    Object.entries(data).forEach(([index, row]) => {
      const rowIndex = parseInt(index)
      const rowString = JSON.stringify(row)
      if (ssnPattern.test(rowString) || creditCardPattern.test(rowString)) {
        piiRows.push(rowIndex)
      }
    })
    
    if (piiRows.length > 0) {
      results.push({
        field: 'multiple',
        type: 'error',
        message: `${piiRows.length} rows contain potential PII (SSN, Credit Card)`,
        suggestion: 'Remove or mask sensitive personal information before importing',
        affectedRows: piiRows,
        severity: 'critical',
        fixable: false,
        confidence: 0.9
      })
    }
    
    return results
  }

  const detectDataAnomalies = (data: any[], mapping: Record<string, string>) => {
    const results: ValidationResult[] = []
    
    // Detect unusual data patterns
    Object.values(mapping).forEach(field => {
      const values = data.map(row => row[field]).filter(v => v)
      if (values.length > 0) {
        const lengths = values.map(v => v.toString().length)
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
        const outliers: number[] = []
        
        values.forEach((value, index) => {
          const length = value.toString().length
          if (length > avgLength * 3 || length < avgLength * 0.3) {
            outliers.push(index)
          }
        })
        
        if (outliers.length > 0 && outliers.length < values.length * 0.1) {
          results.push({
            field,
            type: 'info',
            message: `${outliers.length} unusual data patterns detected in ${field}`,
            suggestion: 'Review outlier values for data quality',
            affectedRows: outliers,
            severity: 'minor',
            fixable: false,
            confidence: 0.5
          })
        }
      }
    })
    
    return results
  }

  const validateBusinessLogic = (data: any[], mapping: Record<string, string>) => {
    const results: ValidationResult[] = []
    
    // Business email validation
    if (mapping.email && mapping.company) {
      const mismatchedRows: number[] = []
      
      data.forEach((row, index) => {
        const email = row[mapping.email]?.toString().toLowerCase()
        const company = row[mapping.company]?.toString().toLowerCase()
        
        if (email && company) {
          const emailDomain = email.split('@')[1]
          const companyName = company.replace(/[^a-z]/g, '')
          
          // Check if email domain matches company name
          if (!emailDomain.includes(companyName.slice(0, 5)) && companyName.length > 3) {
            mismatchedRows.push(index)
          }
        }
      })
      
      if (mismatchedRows.length > 0 && mismatchedRows.length > data.length * 0.7) {
        results.push({
          field: 'email/company',
          type: 'info',
          message: `${mismatchedRows.length} emails don't match company domains`,
          suggestion: 'This may indicate personal emails or data quality issues',
          affectedRows: mismatchedRows,
          severity: 'minor',
          fixable: false,
          confidence: 0.4
        })
      }
    }
    
    return results
  }

  const detectMissingDataOpportunities = (data: any[], mapping: Record<string, string>) => {
    const suggestions: EnrichmentSuggestion[] = []
    
    // Check for missing optional but valuable fields
    const valuableFields = ['job_title', 'company', 'phone', 'linkedin_url', 'location']
    
    valuableFields.forEach(field => {
      if (!mapping[field]) {
        const emptyCount = data.filter(row => !row[field] || row[field].toString().trim() === '').length
        const fillRate = ((data.length - emptyCount) / data.length) * 100
        
        if (fillRate < 50) {
          suggestions.push({
            field,
            type: 'missing_data',
            message: `${field} is missing in ${emptyCount} rows (${Math.round(100 - fillRate)}%)`,
            confidence: 0.8,
            action: `Consider enriching data with ${field} information`,
            preview: `Would improve lead quality and targeting capabilities`
          })
        }
      }
    })
    
    return suggestions
  }

  const suggestFormatImprovements = (data: any[], mapping: Record<string, string>) => {
    const suggestions: EnrichmentSuggestion[] = []
    
    // Phone number formatting
    if (mapping.phone) {
      const phoneField = mapping.phone
      const inconsistentFormats = data.filter(row => {
        const phone = row[phoneField]?.toString()
        return phone && !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s\-\(\)]/g, ''))
      }).length
      
      if (inconsistentFormats > 0) {
        suggestions.push({
          field: phoneField,
          type: 'format_improvement',
          message: `${inconsistentFormats} phone numbers could be reformatted`,
          confidence: 0.9,
          action: 'Standardize to international format (+1234567890)',
          preview: 'Improves data consistency and calling capabilities'
        })
      }
    }
    
    return suggestions
  }

  const suggestDataEnhancements = (data: any[], mapping: Record<string, string>) => {
    const suggestions: EnrichmentSuggestion[] = []
    
    // Email domain insights
    if (mapping.email) {
      const emailField = mapping.email
      const domains = new Map<string, number>()
      
      data.forEach(row => {
        const email = row[emailField]?.toString().toLowerCase()
        if (email) {
          const domain = email.split('@')[1]
          domains.set(domain, (domains.get(domain) || 0) + 1)
        }
      })
      
      const topDomains = Array.from(domains.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      
      if (topDomains.length > 0) {
        suggestions.push({
          field: emailField,
          type: 'data_enhancement',
          message: `Top email domains: ${topDomains.map(([domain, count]) => `${domain} (${count})`).join(', ')}`,
          confidence: 1.0,
          action: 'Use domain insights for segmentation and targeting',
          preview: 'Enables company-based targeting and industry insights'
        })
      }
    }
    
    return suggestions
  }

  const runCustomValidations = async (data: any[], rules: ValidationRule[], mapping: Record<string, string>) => {
    const results: ValidationResult[] = []
    
    for (const rule of rules.filter(r => r.enabled !== false)) {
      const mappedField = mapping[rule.field] || rule.field
      const ruleResults = applyValidationRule(data, mappedField, rule)
      results.push(...ruleResults)
    }
    
    return results
  }

  const applyValidationRule = (data: any[], field: string, rule: ValidationRule) => {
    const results: ValidationResult[] = []
    const violatingRows: number[] = []
    
    data.forEach((row, index) => {
      const value = row[field]
      let isValid = true
      
      switch (rule.type) {
        case 'required':
          isValid = value && value.toString().trim() !== ''
          break
        case 'email':
          isValid = !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString())
          break
        case 'phone':
          isValid = !value || /^[\+]?[1-9][\d]{0,15}$/.test(value.toString().replace(/[\s\-\(\)]/g, ''))
          break
        case 'url':
          isValid = !value || /^https?:\/\/.+/.test(value.toString())
          break
        case 'pattern':
          if (rule.params?.pattern) {
            const regex = new RegExp(rule.params.pattern)
            isValid = !value || regex.test(value.toString())
          }
          break
        case 'length':
          if (value) {
            const len = value.toString().length
            isValid = (!rule.params?.min || len >= rule.params.min) && 
                     (!rule.params?.max || len <= rule.params.max)
          }
          break
      }
      
      if (!isValid) {
        violatingRows.push(index)
      }
    })
    
    if (violatingRows.length > 0) {
      results.push({
        field,
        type: rule.severity,
        message: rule.message || `Validation failed for ${rule.type} rule`,
        affectedRows: violatingRows,
        severity: rule.severity === 'error' ? 'major' : 'minor',
        fixable: rule.type !== 'custom',
        confidence: 0.8
      })
    }
    
    return results
  }

  const calculateDataQualityScore = (data: any[], results: ValidationResult[], mapping: Record<string, string>, enrichmentSugs: EnrichmentSuggestion[] = []) => {
    const totalRows = data.length
    if (totalRows === 0) {
      return {
        overall: 0,
        completeness: 0,
        consistency: 0,
        validity: 0,
        uniqueness: 0,
        accuracy: 0,
        enrichment: 0
      }
    }
    
    // Completeness: percentage of non-empty required fields
    const requiredFields = Object.keys(mapping).filter(key => 
      ['email', 'first_name'].includes(key)
    )
    let completenessScore = 100
    requiredFields.forEach(field => {
      const mappedField = mapping[field]
      const emptyCount = data.filter(row => !row[mappedField] || row[mappedField].toString().trim() === '').length
      completenessScore -= (emptyCount / totalRows) * (100 / requiredFields.length)
    })
    
    // Validity: percentage of rows without validation errors
    const errorResults = results.filter(r => r.type === 'error')
    const totalErrorRows = new Set(errorResults.flatMap(r => r.affectedRows)).size
    const validityScore = Math.max(0, 100 - (totalErrorRows / totalRows) * 100)
    
    // Uniqueness: percentage of unique records (based on email)
    let uniquenessScore = 100
    if (mapping.email) {
      const duplicateResult = results.find(r => r.field === mapping.email && r.message.includes('duplicate'))
      if (duplicateResult) {
        uniquenessScore = Math.max(0, 100 - (duplicateResult.affectedRows.length / totalRows) * 100)
      }
    }
    
    // Consistency: percentage of rows without formatting issues
    const warningResults = results.filter(r => r.type === 'warning' || r.type === 'info')
    const totalWarningRows = new Set(warningResults.flatMap(r => r.affectedRows)).size
    const consistencyScore = Math.max(0, 100 - (totalWarningRows / totalRows) * 100)
    
    // Accuracy: based on data patterns and completeness
    const accuracyScore = (completenessScore + validityScore) / 2
    
    // Enrichment potential: based on missing valuable data
    const totalFields = Object.keys(mapping).length + enrichmentSugs.length
    const currentFields = Object.keys(mapping).length
    const enrichmentScore = totalFields > 0 ? (currentFields / totalFields) * 100 : 100
    
    // Overall score: weighted average
    const overallScore = (
      completenessScore * 0.25 +
      validityScore * 0.30 +
      uniquenessScore * 0.20 +
      consistencyScore * 0.15 +
      accuracyScore * 0.10
    )
    
    return {
      overall: Math.round(overallScore),
      completeness: Math.round(completenessScore),
      consistency: Math.round(consistencyScore),
      validity: Math.round(validityScore),
      uniqueness: Math.round(uniquenessScore),
      accuracy: Math.round(accuracyScore),
      enrichment: Math.round(enrichmentScore)
    }
  }

  // Auto-run validation when data changes
  useEffect(() => {
    if (data.length > 0 && Object.keys(mapping).length > 0) {
      validateData()
    }
  }, [data, mapping, validateData])

  // Filter results by severity and category
  const filteredResults = useMemo(() => {
    let filtered = validationResults
    
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(result => result.severity === selectedSeverity)
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(result => result.type === selectedCategory)
    }
    
    return filtered
  }, [validationResults, selectedSeverity, selectedCategory])

  // Statistics
  const stats = useMemo(() => {
    const critical = validationResults.filter(r => r.severity === 'critical').length
    const major = validationResults.filter(r => r.severity === 'major').length
    const minor = validationResults.filter(r => r.severity === 'minor').length
    const fixable = validationResults.filter(r => r.fixable).length
    const highConfidence = validationResults.filter(r => (r.confidence || 0) >= 0.8).length
    
    return { critical, major, minor, fixable, highConfidence }
  }, [validationResults])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />
      case 'major': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'minor': return <FileSearch className="h-4 w-4 text-blue-500" />
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <FileSearch className="h-4 w-4 text-blue-500" />
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  if (isValidating) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Validating Data</h3>
            <p className="text-gray-500 mb-4">Running comprehensive data quality checks...</p>
            <div className="space-y-2">
              <Progress value={validationProgress} className="h-3" />
              <p className="text-sm text-gray-400">{validationProgress}% complete</p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Database className="h-4 w-4" />
              Analyzing {data.length} records with {enableAdvancedValidation ? 'advanced' : 'standard'} validation
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Quality Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              Data Quality Validation
            </CardTitle>
            <div className="flex items-center gap-2">
              {enableEnrichmentSuggestions && enrichmentSuggestions.length > 0 && (
                <Button
                  onClick={() => setShowEnrichment(!showEnrichment)}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enrichment ({enrichmentSuggestions.length})
                </Button>
              )}
              <Button
                onClick={validateData}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-validate
              </Button>
            </div>
          </div>
        </CardHeader>
        {dataQualityScore && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(dataQualityScore.overall)}`}>
                  {dataQualityScore.overall}%
                </div>
                <div className="text-sm text-gray-500">Overall</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold ${getScoreColor(dataQualityScore.completeness)}`}>
                  {dataQualityScore.completeness}%
                </div>
                <div className="text-sm text-gray-500">Complete</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold ${getScoreColor(dataQualityScore.validity)}`}>
                  {dataQualityScore.validity}%
                </div>
                <div className="text-sm text-gray-500">Valid</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold ${getScoreColor(dataQualityScore.uniqueness)}`}>
                  {dataQualityScore.uniqueness}%
                </div>
                <div className="text-sm text-gray-500">Unique</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold ${getScoreColor(dataQualityScore.consistency)}`}>
                  {dataQualityScore.consistency}%
                </div>
                <div className="text-sm text-gray-500">Consistent</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-semibold ${getScoreColor(dataQualityScore.accuracy)}`}>
                  {dataQualityScore.accuracy}%
                </div>
                <div className="text-sm text-gray-500">Accurate</div>
              </div>
              {dataQualityScore.enrichment !== undefined && (
                <div className="text-center">
                  <div className={`text-xl font-semibold ${getScoreColor(dataQualityScore.enrichment)}`}>
                    {dataQualityScore.enrichment}%
                  </div>
                  <div className="text-sm text-gray-500">Enriched</div>
                </div>
              )}
            </div>

            {/* Issue Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant={stats.critical > 0 ? 'destructive' : 'secondary'}>
                  {stats.critical} Critical
                </Badge>
                <Badge variant={stats.major > 0 ? 'default' : 'secondary'}>
                  {stats.major} Major
                </Badge>
                <Badge variant={stats.minor > 0 ? 'outline' : 'secondary'}>
                  {stats.minor} Minor
                </Badge>
                <Badge variant="outline" className="text-green-600">
                  <Zap className="h-3 w-3 mr-1" />
                  {stats.fixable} Auto-fixable
                </Badge>
                <Badge variant="outline" className="text-purple-600">
                  <Target className="h-3 w-3 mr-1" />
                  {stats.highConfidence} High Confidence
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  <option value="error">Errors Only</option>
                  <option value="warning">Warnings Only</option>
                  <option value="info">Info Only</option>
                </select>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Severity</option>
                  <option value="critical">Critical Only</option>
                  <option value="major">Major Only</option>
                  <option value="minor">Minor Only</option>
                </select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Enrichment Suggestions */}
      {showEnrichment && enrichmentSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
              Data Enrichment Suggestions ({enrichmentSuggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {enrichmentSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 border border-purple-200 bg-purple-50 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 text-purple-500 mr-2" />
                      <span className="font-medium text-gray-900">{suggestion.field}</span>
                      <Badge variant="outline" className="ml-2 text-xs text-purple-600">
                        {suggestion.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-purple-600">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  
                  <p className="text-gray-700 mb-2">{suggestion.message}</p>
                  
                  {suggestion.action && (
                    <p className="text-sm text-purple-700 mb-2">
                      <Target className="h-4 w-4 inline mr-1" />
                      Action: {suggestion.action}
                    </p>
                  )}
                  
                  {suggestion.preview && (
                    <p className="text-sm text-gray-600">
                      <Eye className="h-4 w-4 inline mr-1" />
                      Impact: {suggestion.preview}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Validation Results ({filteredResults.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAutoFixEnabled(!autoFixEnabled)}
                variant={autoFixEnabled ? "default" : "outline"}
                size="sm"
                className="flex items-center"
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto-Fix: {autoFixEnabled ? 'ON' : 'OFF'}
              </Button>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredResults.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found</h3>
              <p className="text-gray-600">Your data passes all validation checks for the selected criteria!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    result.severity === 'critical' 
                      ? 'border-red-200 bg-red-50'
                      : result.severity === 'major'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {getSeverityIcon(result.severity)}
                      <span className="ml-2 font-medium text-gray-900">{result.field}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {getTypeIcon(result.type)}
                        <span className="ml-1">{result.type.toUpperCase()}</span>
                      </Badge>
                      {result.fixable && (
                        <Badge variant="outline" className="ml-2 text-xs text-green-600">
                          <Zap className="h-3 w-3 mr-1" />
                          Auto-fixable
                        </Badge>
                      )}
                      {result.confidence && result.confidence >= 0.8 && (
                        <Badge variant="outline" className="ml-2 text-xs text-purple-600">
                          <Target className="h-3 w-3 mr-1" />
                          High Confidence
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {result.affectedRows.length} rows
                      </Badge>
                      {result.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(result.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-2">{result.message}</p>
                  
                  {result.suggestion && (
                    <p className="text-sm text-gray-600 mb-2">
                      <Brain className="h-4 w-4 inline mr-1" />
                      Suggestion: {result.suggestion}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-3">
                    {result.fixable && result.autoFix && autoFixEnabled && (
                      <Button
                        onClick={result.autoFix}
                        variant="outline"
                        size="sm"
                        className="flex items-center text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Auto-Fix
                      </Button>
                    )}
                    
                    {result.affectedRows.length <= 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={() => {
                          // Show affected rows in detail
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Rows
                      </Button>
                    )}
                  </div>
                  
                  {showPreview && result.affectedRows.length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <h5 className="font-medium text-sm text-gray-900 mb-2">
                        Affected Rows (showing first 5):
                      </h5>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {result.affectedRows.slice(0, 5).map(rowIndex => (
                          <div key={rowIndex} className="text-xs font-mono bg-gray-50 p-2 rounded">
                            <div className="font-bold text-gray-700 mb-1">Row {rowIndex + 1}:</div>
                            <div className="text-gray-600">
                              {JSON.stringify(data[rowIndex], null, 2).slice(0, 200)}...
                            </div>
                          </div>
                        ))}
                        {result.affectedRows.length > 5 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            ... and {result.affectedRows.length - 5} more rows
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}