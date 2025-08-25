'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Download, 
  Settings, 
  FileText,
  Copy,
  Trash2,
  Star,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function ImportTemplatesContent() {
  const [searchTerm, setSearchTerm] = useState('')

  const templates = [
    {
      id: 1,
      name: 'Standard Lead Import',
      description: 'Basic template for importing leads with essential fields',
      fields: ['firstName', 'lastName', 'email', 'company', 'phone'],
      usageCount: 45,
      isDefault: true,
      createdAt: '2024-01-10'
    },
    {
      id: 2,
      name: 'Event Attendees',
      description: 'Template for importing leads from events and conferences',
      fields: ['firstName', 'lastName', 'email', 'company', 'jobTitle', 'eventName', 'attendanceDate'],
      usageCount: 23,
      isDefault: false,
      createdAt: '2024-01-08'
    },
    {
      id: 3,
      name: 'Webinar Participants',
      description: 'Template for webinar registration and attendance data',
      fields: ['firstName', 'lastName', 'email', 'company', 'phone', 'webinarTitle', 'registrationDate', 'attended'],
      usageCount: 18,
      isDefault: false,
      createdAt: '2024-01-05'
    },
    {
      id: 4,
      name: 'LinkedIn Prospects',
      description: 'Template for LinkedIn exported prospect lists',
      fields: ['firstName', 'lastName', 'email', 'company', 'jobTitle', 'location', 'linkedinUrl', 'industry'],
      usageCount: 31,
      isDefault: false,
      createdAt: '2024-01-03'
    },
    {
      id: 5,
      name: 'CRM Export',
      description: 'Template for importing from other CRM systems',
      fields: ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'source', 'tags', 'notes', 'lastContactDate'],
      usageCount: 12,
      isDefault: false,
      createdAt: '2023-12-28'
    }
  ]

  const defaultTemplates = [
    {
      name: 'Minimal Template',
      description: 'Just the essential fields: name, email, company',
      fields: ['firstName', 'lastName', 'email', 'company']
    },
    {
      name: 'Complete Profile',
      description: 'Comprehensive template with all available fields',
      fields: ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'website', 'industry', 'location', 'linkedinUrl', 'notes', 'source', 'tags']
    },
    {
      name: 'Sales Qualified',
      description: 'Template for sales-ready leads with qualification data',
      fields: ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'revenue', 'employeeCount', 'leadScore', 'source']
    }
  ]

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/import-leads">
              <Button variant="outline" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Import
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Templates</h1>
              <p className="text-gray-600">Reusable field mapping templates for consistent imports</p>
            </div>
          </div>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Templates */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Templates</h2>
            <div className="space-y-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium text-gray-900 mr-2">
                            {template.name}
                          </h3>
                          {template.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                        
                        {/* Fields Preview */}
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-1">Fields ({template.fields.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {template.fields.slice(0, 4).map((field) => (
                              <span key={field} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                {field}
                              </span>
                            ))}
                            {template.fields.length > 4 && (
                              <span className="text-xs text-gray-500">+{template.fields.length - 4} more</span>
                            )}
                          </div>
                        </div>

                        {/* Usage Stats */}
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          <span>Used {template.usageCount} times</span>
                          <span className="mx-2">•</span>
                          <span>Created {template.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/import-leads?template=${template.id}`}>
                          <Button className="btn-primary">
                            Use Template
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

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
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Start Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Start Templates</CardTitle>
              <CardDescription>
                Get started quickly with these pre-built templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {defaultTemplates.map((template, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                      <p className="text-xs text-gray-500">{template.fields.length} fields</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Template Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">Required Fields</p>
                  <p className="text-gray-600">firstName, lastName, and email are required for all imports</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">Field Names</p>
                  <p className="text-gray-600">Use consistent field names across templates for better organization</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="font-medium">Reusability</p>
                  <p className="text-gray-600">Templates save time by remembering your field mappings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Template Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Standard Lead Import</span>
                  <span className="text-gray-500">2 hours ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>LinkedIn Prospects</span>
                  <span className="text-gray-500">1 day ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Event Attendees</span>
                  <span className="text-gray-500">3 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ImportTemplatesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ImportTemplatesContent />
      </AppLayout>
    </ProtectedRoute>
  )
}