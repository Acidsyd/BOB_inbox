'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  RefreshCw,
  Target,
  TrendingUp,
  Calendar,
  Building,
  MapPin,
  Mail,
  Eye,
  Download
} from 'lucide-react'
import { api } from '@/lib/api'

interface LeadSegment {
  id: string
  name: string
  description: string
  rules: any
  lead_count: number
  is_dynamic: boolean
  is_active: boolean
  last_calculated_at: string
  created_at: string
  first_name: string
  last_name: string
}

interface Lead {
  id: string
  email: string
  first_name: string
  last_name: string
  company: string
  job_title: string
  location: string
  primary_industry: string
  added_at: string
  current_score: number
  score_tier: string
}

interface SegmentFormData {
  name: string
  description: string
  rules: {
    field: string
    operator: string
    value: string
  }[]
  isDynamic: boolean
}

const RULE_FIELDS = [
  { value: 'company', label: 'Company' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'location', label: 'Location' },
  { value: 'primary_industry', label: 'Industry' },
  { value: 'created_at', label: 'Date Added' },
  { value: 'status', label: 'Status' }
]

const RULE_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' }
]

const SCORE_TIER_COLORS = {
  qualified: 'bg-purple-100 text-purple-800',
  hot: 'bg-red-100 text-red-800',
  warm: 'bg-yellow-100 text-yellow-800',
  cold: 'bg-blue-100 text-blue-800'
}

export default function LeadSegmentationDashboard() {
  const [segments, setSegments] = useState<LeadSegment[]>([])
  const [selectedSegment, setSelectedSegment] = useState<LeadSegment | null>(null)
  const [segmentLeads, setSegmentLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSegment, setEditingSegment] = useState<LeadSegment | null>(null)

  // Form state
  const [formData, setFormData] = useState<SegmentFormData>({
    name: '',
    description: '',
    rules: [{ field: 'company', operator: 'contains', value: '' }],
    isDynamic: true
  })

  useEffect(() => {
    loadSegments()
  }, [])

  useEffect(() => {
    if (selectedSegment) {
      loadSegmentLeads(selectedSegment.id)
    }
  }, [selectedSegment])

  const loadSegments = async () => {
    try {
      setLoading(true)
      const response = await api.get('/lead-management/segments')
      setSegments(response.data.segments || [])
    } catch (error) {
      console.error('Error loading segments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSegmentLeads = async (segmentId: string) => {
    try {
      setLoadingLeads(true)
      const response = await api.get(`/lead-management/segments/${segmentId}?limit=50`)
      setSegmentLeads(response.data.leads || [])
    } catch (error) {
      console.error('Error loading segment leads:', error)
    } finally {
      setLoadingLeads(false)
    }
  }

  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await api.post('/lead-management/segments', {
        name: formData.name,
        description: formData.description,
        rules: {
          operator: 'AND',
          conditions: formData.rules
        },
        isDynamic: formData.isDynamic
      })
      
      setSegments([response.data.segment, ...segments])
      setShowCreateForm(false)
      resetForm()
    } catch (error) {
      console.error('Error creating segment:', error)
    }
  }

  const handleUpdateSegment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSegment) return

    try {
      const response = await api.put(`/lead-management/segments/${editingSegment.id}`, {
        name: formData.name,
        description: formData.description,
        rules: {
          operator: 'AND',
          conditions: formData.rules
        },
        isDynamic: formData.isDynamic
      })
      
      setSegments(segments.map(s => s.id === editingSegment.id ? response.data.segment : s))
      setEditingSegment(null)
      resetForm()
    } catch (error) {
      console.error('Error updating segment:', error)
    }
  }

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return

    try {
      await api.delete(`/lead-management/segments/${segmentId}`)
      setSegments(segments.filter(s => s.id !== segmentId))
      if (selectedSegment?.id === segmentId) {
        setSelectedSegment(null)
        setSegmentLeads([])
      }
    } catch (error) {
      console.error('Error deleting segment:', error)
    }
  }

  const handleRefreshSegment = async (segmentId: string) => {
    try {
      await api.post(`/lead-management/segments/${segmentId}/refresh`)
      loadSegments()
      if (selectedSegment?.id === segmentId) {
        loadSegmentLeads(segmentId)
      }
    } catch (error) {
      console.error('Error refreshing segment:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rules: [{ field: 'company', operator: 'contains', value: '' }],
      isDynamic: true
    })
  }

  const addRule = () => {
    setFormData({
      ...formData,
      rules: [...formData.rules, { field: 'company', operator: 'contains', value: '' }]
    })
  }

  const removeRule = (index: number) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index)
    })
  }

  const updateRule = (index: number, field: keyof typeof formData.rules[0], value: string) => {
    const updatedRules = [...formData.rules]
    updatedRules[index] = { ...updatedRules[index], [field]: value }
    setFormData({ ...formData, rules: updatedRules })
  }

  const startEdit = (segment: LeadSegment) => {
    setEditingSegment(segment)
    setFormData({
      name: segment.name,
      description: segment.description || '',
      rules: segment.rules?.conditions || [{ field: 'company', operator: 'contains', value: '' }],
      isDynamic: segment.is_dynamic
    })
    setShowCreateForm(true)
  }

  const filteredSegments = segments.filter(segment =>
    segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (segment.description && segment.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Segmentation</h1>
          <p className="text-gray-600">Organize and target your leads with smart segmentation</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segments List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search segments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Segments */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredSegments.map((segment) => (
              <Card
                key={segment.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedSegment?.id === segment.id ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                }`}
                onClick={() => setSelectedSegment(segment)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{segment.name}</h3>
                      {segment.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {segment.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-2">
                      <div className="dropdown">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <div className="dropdown-menu">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEdit(segment)
                            }}
                            className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 w-full text-left"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                          {segment.is_dynamic && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRefreshSegment(segment.id)
                              }}
                              className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 w-full text-left"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSegment(segment.id)
                            }}
                            className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 w-full text-left text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {segment.lead_count} leads
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {segment.is_dynamic && (
                        <Badge variant="secondary">Dynamic</Badge>
                      )}
                      <Badge variant="outline">
                        {new Date(segment.last_calculated_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Segment Details */}
        <div className="lg:col-span-2">
          {selectedSegment ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{selectedSegment.name}</span>
                      {selectedSegment.is_dynamic && (
                        <Badge variant="secondary">Dynamic</Badge>
                      )}
                    </CardTitle>
                    {selectedSegment.description && (
                      <CardDescription>{selectedSegment.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    {selectedSegment.is_dynamic && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRefreshSegment(selectedSegment.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedSegment.lead_count}
                        </div>
                        <div className="text-sm text-gray-500">Total Leads</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {segmentLeads.filter(l => l.score_tier === 'qualified' || l.score_tier === 'hot').length}
                        </div>
                        <div className="text-sm text-gray-500">High Value</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {segmentLeads.filter(l => l.current_score > 0).length}
                        </div>
                        <div className="text-sm text-gray-500">Scored</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(segmentLeads.reduce((sum, l) => sum + (l.current_score || 0), 0) / segmentLeads.length) || 0}
                        </div>
                        <div className="text-sm text-gray-500">Avg Score</div>
                      </div>
                    </div>

                    {/* Leads Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Lead</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Company</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Score</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {segmentLeads.slice(0, 20).map((lead) => (
                            <tr key={lead.id} className="border-t hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {lead.first_name} {lead.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{lead.email}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  {lead.company && (
                                    <>
                                      <Building className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm">{lead.company}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm">{lead.job_title}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{lead.current_score || 0}</span>
                                  {lead.score_tier && (
                                    <Badge className={SCORE_TIER_COLORS[lead.score_tier as keyof typeof SCORE_TIER_COLORS]}>
                                      {lead.score_tier}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-500">
                                  {new Date(lead.added_at).toLocaleDateString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {segmentLeads.length > 20 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Showing 20 of {segmentLeads.length} leads
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Segment Selected</h3>
                  <p className="text-gray-600">Select a segment from the list to view its details and leads</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Segment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingSegment ? 'Edit Segment' : 'Create New Segment'}
              </h3>
              
              <form onSubmit={editingSegment ? handleUpdateSegment : handleCreateSegment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="segmentName">Segment Name *</Label>
                    <Input
                      id="segmentName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Enterprise Tech Companies"
                      required
                    />
                  </div>
                  <div>
                    <Label>
                      <input
                        type="checkbox"
                        checked={formData.isDynamic}
                        onChange={(e) => setFormData({ ...formData, isDynamic: e.target.checked })}
                        className="mr-2"
                      />
                      Dynamic Segment
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically update based on rules
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="segmentDescription">Description</Label>
                  <textarea
                    id="segmentDescription"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this segment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Segmentation Rules</Label>
                  <div className="space-y-3 mt-2">
                    {formData.rules.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <select
                          value={rule.field}
                          onChange={(e) => updateRule(index, 'field', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        >
                          {RULE_FIELDS.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(index, 'operator', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        >
                          {RULE_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        
                        <Input
                          value={rule.value}
                          onChange={(e) => updateRule(index, 'value', e.target.value)}
                          placeholder="Value..."
                          className="flex-1"
                        />
                        
                        {formData.rules.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRule(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRule}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingSegment(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSegment ? 'Update' : 'Create'} Segment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}