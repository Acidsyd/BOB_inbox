'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Plus, 
  Eye, 
  Settings, 
  Copy,
  Trash2,
  Filter,
  Users,
  Calendar,
  Tag,
  Search
} from 'lucide-react'
import Link from 'next/link'

function ListViewsContent() {
  const views = [
    {
      id: 1,
      name: 'High-Value Prospects',
      description: 'Companies with >$10M revenue and recent funding',
      leadsCount: 156,
      filters: ['Revenue: >$10M', 'Funding: Last 12 months', 'Industry: Tech'],
      isDefault: false,
      createdAt: '2024-01-10',
      lastUsed: '2024-01-15'
    },
    {
      id: 2,
      name: 'Warm LinkedIn Connections',
      description: 'Leads from LinkedIn outreach with positive engagement',
      leadsCount: 89,
      filters: ['Source: LinkedIn', 'Engagement: Positive', 'Status: Warm'],
      isDefault: false,
      createdAt: '2024-01-08',
      lastUsed: '2024-01-14'
    },
    {
      id: 3,
      name: 'Event Attendees - Q1 2024',
      description: 'Contacts from events and conferences this quarter',
      leadsCount: 234,
      filters: ['Source: Event', 'Date: 2024 Q1', 'Status: New'],
      isDefault: true,
      createdAt: '2024-01-01',
      lastUsed: '2024-01-15'
    },
    {
      id: 4,
      name: 'Follow-up Required',
      description: 'Leads that need follow-up actions',
      leadsCount: 67,
      filters: ['Last Contact: >7 days', 'Status: Contacted', 'Priority: High'],
      isDefault: false,
      createdAt: '2024-01-05',
      lastUsed: '2024-01-13'
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/leads">
              <Button variant="outline" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leads
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">List Views</h1>
              <p className="text-gray-600">Create custom views to organize and filter your leads</p>
            </div>
          </div>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create View
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Views List */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {views.map((view) => (
              <Card key={view.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center">
                        <Eye className="h-5 w-5 mr-2 text-purple-600" />
                        {view.name}
                        {view.isDefault && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Default
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {view.description}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Filters:</p>
                    <div className="flex flex-wrap gap-1">
                      {view.filters.map((filter, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {filter}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{view.leadsCount} leads</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Used {view.lastUsed}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/leads?view=${view.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Open View
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New View Card */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors">
              <CardContent className="p-8 text-center">
                <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Create Custom View</h3>
                <p className="text-gray-500 mb-6">
                  Set up filters and organize leads exactly how you need them
                </p>
                <Button className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  New View
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* View Builder Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">View Builder Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Filter by Status</h4>
                <p className="text-gray-600">Group leads by their current stage in your pipeline</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Source Tracking</h4>
                <p className="text-gray-600">Organize by where your leads originated from</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Company Criteria</h4>
                <p className="text-gray-600">Filter by company size, industry, or revenue</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Engagement Level</h4>
                <p className="text-gray-600">Track and prioritize based on interaction history</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Filters</CardTitle>
              <CardDescription>
                Common filter combinations you can use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                High Priority Leads
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Recently Added
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Needs Follow-up
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Enterprise Prospects
              </Button>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total Views</span>
                  <span className="font-medium">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Most Used View</span>
                  <span className="font-medium">Event Attendees</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Leads</span>
                  <span className="font-medium">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Filtered Leads</span>
                  <span className="font-medium">546</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ListViewsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ListViewsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}