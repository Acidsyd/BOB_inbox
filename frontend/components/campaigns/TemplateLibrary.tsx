'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { 
  Search, 
  Filter, 
  Star, 
  Eye, 
  Download, 
  Zap, 
  TrendingUp,
  Clock,
  Users,
  MessageSquare,
  Copy,
  ChevronDown,
  BookOpen
} from 'lucide-react'
import { api } from '../lib/api'

interface Template {
  id: string
  name: string
  description: string
  category: string
  industry: string
  use_case: string
  subject_line: string
  body_content: string
  preview_text: string
  author: string
  tags: string[]
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  estimated_reply_rate: number
  total_uses: number
  avg_open_rate: number
  avg_click_rate: number
  avg_reply_rate: number
  rating: number
  is_featured: boolean
  created_at: string
}

interface TemplateLibraryProps {
  onSelectTemplate: (template: Template) => void
  selectedTemplates?: string[]
  allowMultiple?: boolean
  showPreview?: boolean
}

const CATEGORIES = [
  { value: 'outbound', label: 'Cold Outreach', icon: Zap },
  { value: 'follow_up', label: 'Follow-up', icon: Clock },
  { value: 'nurture', label: 'Lead Nurturing', icon: Users },
  { value: 'meeting', label: 'Meeting Booking', icon: MessageSquare }
]

const INDUSTRIES = [
  'technology', 'healthcare', 'finance', 'education', 'retail', 
  'manufacturing', 'real_estate', 'consulting', 'marketing', 'sales'
]

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800', 
  advanced: 'bg-red-100 text-red-800'
}

export default function TemplateLibrary({ 
  onSelectTemplate, 
  selectedTemplates = [], 
  allowMultiple = false,
  showPreview = true 
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [sortBy, setSortBy] = useState('rating') // rating, uses, reply_rate
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterAndSortTemplates()
  }, [templates, searchTerm, selectedCategory, selectedIndustry, selectedDifficulty, showFeaturedOnly, sortBy])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '50',
        ...(showFeaturedOnly && { featured: 'true' })
      })

      const response = await api.get(`/templates/library?${params}`)
      setTemplates(response.data.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortTemplates = () => {
    let filtered = [...templates]

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    if (selectedIndustry) {
      filtered = filtered.filter(template => template.industry === selectedIndustry)
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(template => template.difficulty_level === selectedDifficulty)
    }

    if (showFeaturedOnly) {
      filtered = filtered.filter(template => template.is_featured)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating
        case 'uses':
          return b.total_uses - a.total_uses
        case 'reply_rate':
          return b.avg_reply_rate - a.avg_reply_rate
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    setFilteredTemplates(filtered)
  }

  const handleSelectTemplate = async (template: Template) => {
    try {
      // Record template usage
      await api.post(`/templates/library/${template.id}/usage`)
      onSelectTemplate(template)
    } catch (error) {
      console.error('Error selecting template:', error)
      onSelectTemplate(template) // Still proceed even if usage tracking fails
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setSelectedIndustry('')
    setSelectedDifficulty('')
    setShowFeaturedOnly(false)
    setSortBy('rating')
  }

  const isTemplateSelected = (templateId: string) => {
    return selectedTemplates.includes(templateId)
  }

  const getPerformanceColor = (rate: number) => {
    if (rate >= 10) return 'text-green-600'
    if (rate >= 5) return 'text-yellow-600'
    return 'text-gray-500'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading template library...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Template Library</h2>
          <p className="text-gray-600">Choose from proven email templates to boost your campaign performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <BookOpen className="h-3 w-3" />
            <span>{filteredTemplates.length} templates</span>
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Industry Filter */}
            <div>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Industries</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>
                    {industry.charAt(0).toUpperCase() + industry.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="rating">Top Rated</option>
                <option value="uses">Most Used</option>
                <option value="reply_rate">Best Reply Rate</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>

            {/* Featured Toggle & Clear */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFeaturedOnly}
                  onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-2"
                />
                <span className="text-sm">Featured only</span>
              </label>
              {(searchTerm || selectedCategory || selectedIndustry || selectedDifficulty || showFeaturedOnly) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className={`relative transition-all hover:shadow-lg cursor-pointer ${
                isTemplateSelected(template.id) 
                  ? 'ring-2 ring-purple-500 bg-purple-50' 
                  : 'hover:shadow-md'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {template.is_featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                      <Badge className={DIFFICULTY_COLORS[template.difficulty_level]}>
                        {template.difficulty_level}
                      </Badge>
                      <Badge variant="outline">
                        {template.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                  <div className="ml-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Star className="h-3 w-3 mr-1" />
                      {template.rating.toFixed(1)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Subject Line Preview */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Subject Line:</p>
                  <p className="text-sm text-gray-600 italic line-clamp-1">
                    "{template.subject_line}"
                  </p>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className={`text-lg font-semibold ${getPerformanceColor(template.avg_reply_rate)}`}>
                      {template.avg_reply_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Reply Rate</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-700">
                      {template.avg_open_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Open Rate</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-500">
                      {template.total_uses}
                    </div>
                    <div className="text-xs text-gray-500">Uses</div>
                  </div>
                </div>

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                    className="flex-1"
                    variant={isTemplateSelected(template.id) ? "default" : "outline"}
                  >
                    {isTemplateSelected(template.id) ? (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        Selected
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Use Template
                      </>
                    )}
                  </Button>
                  {showPreview && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>

              {/* Author */}
              <div className="px-6 pb-4">
                <p className="text-xs text-gray-500">by {template.author}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{previewTemplate.name}</h3>
                <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)}>
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Subject Line:</p>
                  <p className="text-sm bg-gray-50 p-3 rounded border italic">
                    {previewTemplate.subject_line}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Email Content:</p>
                  <div 
                    className="text-sm bg-gray-50 p-4 rounded border whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: previewTemplate.body_content }}
                  />
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <Button 
                    onClick={() => {
                      handleSelectTemplate(previewTemplate)
                      setPreviewTemplate(null)
                    }}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use This Template
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setPreviewTemplate(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}