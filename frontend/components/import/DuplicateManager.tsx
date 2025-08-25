'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Merge,
  Trash2,
  Settings,
  Search,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Target,
  Layers,
  Zap,
  ArrowRight,
  Mail
} from 'lucide-react'

interface DuplicateRecord {
  id: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
  source?: string
  confidence: number
  matchedFields: string[]
  createdAt: string
  lastUpdated: string
  campaignIds?: string[]
  tags?: string[]
  customFields?: Record<string, any>
}

interface DuplicateGroup {
  id: string
  masterRecord: DuplicateRecord
  duplicates: DuplicateRecord[]
  totalRecords: number
  confidence: number
  matchingReason: string
  suggestedAction: 'merge' | 'keep_separate' | 'review'
  potentialSavings: number
}

interface DuplicateManagerProps {
  organizationId: string
  onDuplicateResolved: (groupId: string, action: string, result: any) => void
  onBulkAction: (action: string, groupIds: string[]) => void
  className?: string
}

const MATCH_ALGORITHMS = {
  exact: { label: 'Exact Match', description: 'Identical values across key fields' },
  fuzzy: { label: 'Fuzzy Match', description: 'Similar values with minor variations' },
  phonetic: { label: 'Phonetic', description: 'Sounds similar when pronounced' },
  domain: { label: 'Domain Match', description: 'Same email domain patterns' }
}

const CONFIDENCE_LEVELS = {
  high: { min: 0.8, color: 'bg-red-500', label: 'High' },
  medium: { min: 0.6, color: 'bg-yellow-500', label: 'Medium' },
  low: { min: 0.4, color: 'bg-blue-500', label: 'Low' }
}

export default function DuplicateManager({
  organizationId,
  onDuplicateResolved,
  onBulkAction,
  className
}: DuplicateManagerProps) {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'detailed'>('list')
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'confidence' | 'records' | 'potential_savings'>('confidence')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [detectionSettings, setDetectionSettings] = useState({
    enableFuzzyMatching: true,
    enablePhoneticMatching: false,
    enableDomainMatching: true,
    confidenceThreshold: 0.7,
    matchFields: ['email', 'phone', 'firstName', 'lastName'],
    autoMergeThreshold: 0.95,
    excludeFields: ['id', 'createdAt', 'lastUpdated']
  })

  // Scan for duplicates
  const scanForDuplicates = useCallback(async () => {
    setIsScanning(true)
    setScanProgress(0)

    try {
      // Simulate scanning progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + Math.random() * 15, 95))
      }, 200)

      const response = await fetch(`/api/leads/${organizationId}/duplicates/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: detectionSettings,
          algorithms: Object.keys(MATCH_ALGORITHMS).filter(alg => {
            if (alg === 'fuzzy') return detectionSettings.enableFuzzyMatching
            if (alg === 'phonetic') return detectionSettings.enablePhoneticMatching
            if (alg === 'domain') return detectionSettings.enableDomainMatching
            return true
          })
        })
      })

      clearInterval(progressInterval)
      setScanProgress(100)

      if (response.ok) {
        const data = await response.json()
        setDuplicateGroups(data.duplicateGroups || [])
      } else {
        throw new Error('Failed to scan for duplicates')
      }
    } catch (error) {
      console.error('Duplicate scan failed:', error)
    } finally {
      setTimeout(() => {
        setIsScanning(false)
        setScanProgress(0)
      }, 500)
    }
  }, [organizationId, detectionSettings])

  // Load existing duplicate groups
  useEffect(() => {
    const loadDuplicateGroups = async () => {
      try {
        const response = await fetch(`/api/leads/${organizationId}/duplicates`)
        if (response.ok) {
          const data = await response.json()
          setDuplicateGroups(data.duplicateGroups || [])
        }
      } catch (error) {
        console.error('Failed to load duplicate groups:', error)
      }
    }

    loadDuplicateGroups()
  }, [organizationId])

  // Filter and sort duplicate groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = duplicateGroups.filter(group => {
      // Apply confidence filter
      if (filterBy !== 'all') {
        const threshold = CONFIDENCE_LEVELS[filterBy as keyof typeof CONFIDENCE_LEVELS]
        if (group.confidence < threshold.min) return false
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          group.masterRecord.email.toLowerCase().includes(query) ||
          group.masterRecord.firstName?.toLowerCase().includes(query) ||
          group.masterRecord.lastName?.toLowerCase().includes(query) ||
          group.masterRecord.company?.toLowerCase().includes(query)
        )
      }

      return true
    })

    // Sort groups
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence
        case 'records':
          return b.totalRecords - a.totalRecords
        case 'potential_savings':
          return b.potentialSavings - a.potentialSavings
        default:
          return 0
      }
    })

    return filtered
  }, [duplicateGroups, filterBy, searchQuery, sortBy])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0)
    const totalPotentialSavings = duplicateGroups.reduce((sum, group) => sum + group.potentialSavings, 0)
    const highConfidenceGroups = duplicateGroups.filter(group => group.confidence >= 0.8).length
    
    return {
      totalGroups: duplicateGroups.length,
      totalDuplicates,
      totalPotentialSavings,
      highConfidenceGroups,
      averageGroupSize: duplicateGroups.length > 0 ? (totalDuplicates / duplicateGroups.length).toFixed(1) : '0'
    }
  }, [duplicateGroups])

  // Handle group selection
  const toggleGroupSelection = useCallback((groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }, [])

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    const groupIds = Array.from(selectedGroups)
    if (groupIds.length === 0) return

    try {
      await onBulkAction(action, groupIds)
      
      // Remove processed groups from local state
      if (action === 'merge' || action === 'delete') {
        setDuplicateGroups(prev => prev.filter(group => !groupIds.includes(group.id)))
        setSelectedGroups(new Set())
      }
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }, [selectedGroups, onBulkAction])

  // Handle individual group action
  const handleGroupAction = useCallback(async (groupId: string, action: string) => {
    try {
      const group = duplicateGroups.find(g => g.id === groupId)
      if (!group) return

      await onDuplicateResolved(groupId, action, { group })
      
      // Remove processed group from local state
      if (action === 'merge' || action === 'delete') {
        setDuplicateGroups(prev => prev.filter(g => g.id !== groupId))
      }
    } catch (error) {
      console.error('Group action failed:', error)
    }
  }, [duplicateGroups, onDuplicateResolved])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-red-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  if (isScanning) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Scanning for Duplicates</h3>
            <p className="text-gray-600 mb-6">
              Analyzing your database using advanced matching algorithms...
            </p>
            <div className="space-y-2">
              <Progress value={scanProgress} className="h-3" />
              <p className="text-sm text-gray-500">{Math.round(scanProgress)}% complete</p>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center text-sm text-blue-800">
                <Target className="h-4 w-4 mr-2" />
                This may take several minutes for large datasets
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Duplicate Manager
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowSettings(!showSettings)} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button onClick={scanForDuplicates} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Scan for Duplicates
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.totalGroups}</div>
                <div className="text-sm text-gray-500">Duplicate Groups</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.totalDuplicates}</div>
                <div className="text-sm text-gray-500">Total Duplicates</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.highConfidenceGroups}</div>
                <div className="text-sm text-gray-500">High Confidence</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.averageGroupSize}</div>
                <div className="text-sm text-gray-500">Avg Group Size</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">${stats.totalPotentialSavings}</div>
                <div className="text-sm text-gray-500">Potential Savings</div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 bg-gray-50 rounded-lg mb-6">
              <h4 className="font-medium mb-4">Detection Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={detectionSettings.enableFuzzyMatching}
                      onChange={(e) => setDetectionSettings(prev => ({
                        ...prev,
                        enableFuzzyMatching: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    Enable fuzzy matching (typos, abbreviations)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={detectionSettings.enablePhoneticMatching}
                      onChange={(e) => setDetectionSettings(prev => ({
                        ...prev,
                        enablePhoneticMatching: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    Enable phonetic matching (sounds similar)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={detectionSettings.enableDomainMatching}
                      onChange={(e) => setDetectionSettings(prev => ({
                        ...prev,
                        enableDomainMatching: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    Enable domain pattern matching
                  </label>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confidence Threshold: {detectionSettings.confidenceThreshold}
                    </label>
                    <input
                      type="range"
                      min="0.4"
                      max="1"
                      step="0.05"
                      value={detectionSettings.confidenceThreshold}
                      onChange={(e) => setDetectionSettings(prev => ({
                        ...prev,
                        confidenceThreshold: parseFloat(e.target.value)
                      }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-merge Threshold: {detectionSettings.autoMergeThreshold}
                    </label>
                    <input
                      type="range"
                      min="0.8"
                      max="1"
                      step="0.01"
                      value={detectionSettings.autoMergeThreshold}
                      onChange={(e) => setDetectionSettings(prev => ({
                        ...prev,
                        autoMergeThreshold: parseFloat(e.target.value)
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      {duplicateGroups.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search duplicates by email, name, or company..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Confidence</option>
                  <option value="high">High (80%+)</option>
                  <option value="medium">Medium (60%+)</option>
                  <option value="low">Low (40%+)</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="confidence">Sort by Confidence</option>
                  <option value="records">Sort by Record Count</option>
                  <option value="potential_savings">Sort by Savings</option>
                </select>
                <Button
                  onClick={() => setViewMode(viewMode === 'list' ? 'detailed' : 'list')}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {viewMode === 'list' ? 'Detailed' : 'List'} View
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedGroups.size > 0 && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-800">
                  {selectedGroups.size} group{selectedGroups.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    onClick={() => handleBulkAction('merge')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Merge className="h-4 w-4 mr-1" />
                    Merge Selected
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('export')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('delete')}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Duplicate Groups List */}
      {filteredAndSortedGroups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Duplicates Found</h3>
            <p className="text-gray-600">
              {duplicateGroups.length === 0 
                ? "Your database appears to be clean. Run a scan to check for duplicates."
                : "No duplicates match your current filters."
              }
            </p>
            {duplicateGroups.length === 0 && (
              <Button onClick={scanForDuplicates} className="mt-4">
                <Search className="h-4 w-4 mr-2" />
                Run Duplicate Scan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedGroups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(group.id)}
                      onChange={() => toggleGroupSelection(group.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {group.masterRecord.firstName} {group.masterRecord.lastName}
                        </h4>
                        <Badge variant="outline" className={`text-white ${getConfidenceColor(group.confidence)}`}>
                          {Math.round(group.confidence * 100)}% {getConfidenceLabel(group.confidence)}
                        </Badge>
                        <Badge variant="outline">
                          {group.totalRecords} records
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {group.masterRecord.email}
                        {group.masterRecord.company && (
                          <>
                            {' • '}
                            {group.masterRecord.company}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {group.matchingReason} • Potential savings: ${group.potentialSavings}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleGroupAction(group.id, 'merge')}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Merge className="h-4 w-4 mr-1" />
                      Merge
                    </Button>
                    <Button
                      onClick={() => handleGroupAction(group.id, 'review')}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      onClick={() => handleGroupAction(group.id, 'ignore')}
                      variant="outline"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Ignore
                    </Button>
                  </div>
                </div>

                {/* Detailed View */}
                {viewMode === 'detailed' && (
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Master Record</h5>
                        <div className="p-3 bg-green-50 rounded-lg space-y-1 text-sm">
                          <div><strong>Email:</strong> {group.masterRecord.email}</div>
                          {group.masterRecord.phone && <div><strong>Phone:</strong> {group.masterRecord.phone}</div>}
                          {group.masterRecord.company && <div><strong>Company:</strong> {group.masterRecord.company}</div>}
                          <div><strong>Source:</strong> {group.masterRecord.source || 'Unknown'}</div>
                          <div><strong>Created:</strong> {new Date(group.masterRecord.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">
                          Duplicate Records ({group.duplicates.length})
                        </h5>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {group.duplicates.map((duplicate, index) => (
                            <div key={duplicate.id} className="p-2 bg-red-50 rounded text-sm">
                              <div className="font-medium">{duplicate.email}</div>
                              {duplicate.company && <div className="text-gray-600">{duplicate.company}</div>}
                              <div className="text-xs text-gray-500">
                                Match: {duplicate.matchedFields.join(', ')} ({Math.round(duplicate.confidence * 100)}%)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}