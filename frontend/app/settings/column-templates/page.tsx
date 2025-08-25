'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Settings,
  Copy,
  Trash2,
  Edit3,
  FileText,
  Search,
  Filter,
  Columns,
  Star,
  Users,
  Calendar,
  Tag
} from 'lucide-react'
import { useState } from 'react'

function ColumnTemplatesContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const templates = [
    {
      id: 1,
      name: 'Standard Lead Profile',
      description: 'Essential fields for basic lead management',
      category: 'Basic',
      columns: [
        'firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle'
      ],
      usageCount: 45,
      isDefault: true,
      createdAt: '2024-01-10'
    },
    {
      id: 2,
      name: 'Sales Qualified Lead',
      description: 'Complete profile for sales-ready leads',
      category: 'Sales',
      columns: [
        'firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 
        'leadScore', 'source', 'industry', 'companySize', 'revenue'
      ],
      usageCount: 28,
      isDefault: false,
      createdAt: '2024-01-08'
    },
    {
      id: 3,
      name: 'Event Attendee',
      description: 'Template for conference and event leads',
      category: 'Events',
      columns: [
        'firstName', 'lastName', 'email', 'company', 'jobTitle', 
        'eventName', 'attendanceDate', 'session', 'interests'
      ],
      usageCount: 19,
      isDefault: false,
      createdAt: '2024-01-05'
    },
    {
      id: 4,
      name: 'Webinar Participant',
      description: 'Comprehensive webinar attendee data',
      category: 'Marketing',
      columns: [
        'firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle',
        'webinarTitle', 'registrationDate', 'attended', 'questionsAsked', 'downloadedResources'
      ],
      usageCount: 31,
      isDefault: false,
      createdAt: '2024-01-03'
    },
    {
      id: 5,
      name: 'Enterprise Prospect',
      description: 'Detailed template for enterprise sales',
      category: 'Enterprise',
      columns: [
        'firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle',
        'industry', 'companySize', 'revenue', 'decisionMakingRole', 'budget',
        'timeline', 'painPoints', 'currentSolution'
      ],
      usageCount: 12,
      isDefault: false,
      createdAt: '2023-12-28'
    }
  ]

  const columnLibrary = [
    { 
      name: 'firstName', 
      type: 'Text', 
      description: 'Lead first name',
      category: 'Basic Info',
      required: true 
    },
    { 
      name: 'lastName', 
      type: 'Text', 
      description: 'Lead last name',
      category: 'Basic Info',
      required: true 
    },
    { 
      name: 'email', 
      type: 'Email', 
      description: 'Primary email address',
      category: 'Contact',
      required: true 
    },
    { 
      name: 'phone', 
      type: 'Phone', 
      description: 'Phone number',
      category: 'Contact',
      required: false 
    },
    { 
      name: 'company', 
      type: 'Text', 
      description: 'Company name',
      category: 'Company',
      required: false 
    },
    { 
      name: 'jobTitle', 
      type: 'Text', 
      description: 'Job title/position',
      category: 'Professional',
      required: false 
    },
    { 
      name: 'leadScore', 
      type: 'Number', 
      description: 'Lead qualification score',
      category: 'Scoring',
      required: false 
    },
    { 
      name: 'industry', 
      type: 'Select', 
      description: 'Company industry',
      category: 'Company',
      required: false 
    },
    { 
      name: 'companySize', 
      type: 'Number', 
      description: 'Number of employees',
      category: 'Company',
      required: false 
    },
    { 
      name: 'revenue', 
      type: 'Currency', 
      description: 'Annual company revenue',
      category: 'Company',
      required: false 
    },
    { 
      name: 'source', 
      type: 'Select', 
      description: 'Lead source/origin',
      category: 'Tracking',
      required: false 
    },
    { 
      name: 'tags', 
      type: 'Tags', 
      description: 'Lead classification tags',
      category: 'Organization',
      required: false 
    }
  ]

  const categories = ['all', 'Basic', 'Sales', 'Marketing', 'Events', 'Enterprise']

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Column Templates</h1>
            <p className="text-gray-600">Manage reusable column configurations for consistent lead data structure</p>
          </div>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center">
                        <Columns className="h-5 w-5 mr-2 text-purple-600" />
                        {template.name}
                        {template.isDefault && (
                          <Star className="h-4 w-4 ml-2 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {template.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Columns Preview */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Columns ({template.columns.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.columns.slice(0, 5).map((column) => (
                        <span key={column} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                          {column}
                        </span>
                      ))}
                      {template.columns.length > 5 && (
                        <span className="text-xs text-gray-500">+{template.columns.length - 5} more</span>
                      )}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>Used {template.usageCount} times</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Created {template.createdAt}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Use Template
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Template Card */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors">
              <CardContent className="p-8 text-center">
                <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Create New Template</h3>
                <p className="text-gray-500 mb-6">
                  Build a custom column template for specific use cases
                </p>
                <Button className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </CardContent>
            </Card>
          </div>

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search or create a new template
                </p>
                <Button className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Column Library */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Column Library</CardTitle>
              <CardDescription>
                Available columns you can add to templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {columnLibrary.map((column, index) => (
                  <div key={index} className="p-2 border rounded hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{column.name}</span>
                          {column.required && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{column.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            {column.type}
                          </span>
                          <span className="text-xs text-gray-500">{column.category}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Include Core Fields</h4>
                <p className="text-gray-600">Always include firstName, lastName, and email as minimum requirements</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Use Consistent Naming</h4>
                <p className="text-gray-600">Follow camelCase naming convention for better organization</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Group Related Fields</h4>
                <p className="text-gray-600">Keep related information together (e.g., company fields)</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Consider Data Types</h4>
                <p className="text-gray-600">Choose appropriate field types for validation and formatting</p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total Templates</span>
                  <span className="font-medium">{templates.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Most Used</span>
                  <span className="font-medium">Standard Lead Profile</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average Columns</span>
                  <span className="font-medium">8.4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Usage</span>
                  <span className="font-medium">135</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ColumnTemplatesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ColumnTemplatesContent />
      </AppLayout>
    </ProtectedRoute>
  )
}