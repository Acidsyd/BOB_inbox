'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Zap, 
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  DollarSign,
  Play,
  Pause,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function EnrichmentContent() {
  const [selectedLeads, setSelectedLeads] = useState(0)

  const enrichmentJobs = [
    {
      id: 1,
      name: 'Company Data Enrichment',
      description: 'Enrich missing company information for LinkedIn leads',
      status: 'completed',
      leadsProcessed: 156,
      totalLeads: 156,
      creditsUsed: 78,
      startedAt: '2024-01-15 14:30',
      completedAt: '2024-01-15 14:45',
      fields: ['company', 'industry', 'employeeCount', 'revenue']
    },
    {
      id: 2,
      name: 'Contact Information',
      description: 'Find missing email addresses and phone numbers',
      status: 'running',
      leadsProcessed: 89,
      totalLeads: 234,
      creditsUsed: 45,
      startedAt: '2024-01-15 16:20',
      completedAt: null,
      fields: ['email', 'phone', 'linkedinUrl']
    },
    {
      id: 3,
      name: 'Geographic Data',
      description: 'Add location and timezone information',
      status: 'failed',
      leadsProcessed: 23,
      totalLeads: 67,
      creditsUsed: 12,
      startedAt: '2024-01-15 11:15',
      completedAt: '2024-01-15 11:25',
      fields: ['location', 'timezone', 'country']
    }
  ]

  const availableEnrichments = [
    {
      name: 'Company Information',
      description: 'Industry, size, revenue, founding year',
      fields: ['industry', 'employeeCount', 'revenue', 'foundedYear'],
      creditsPerLead: 1,
      accuracy: '95%'
    },
    {
      name: 'Contact Details',
      description: 'Email addresses, phone numbers, social profiles',
      fields: ['email', 'phone', 'linkedinUrl', 'twitterUrl'],
      creditsPerLead: 2,
      accuracy: '87%'
    },
    {
      name: 'Geographic Data',
      description: 'Location, timezone, and regional information',
      fields: ['location', 'timezone', 'country', 'region'],
      creditsPerLead: 1,
      accuracy: '92%'
    },
    {
      name: 'Technographic Data',
      description: 'Technology stack and tools used by the company',
      fields: ['technologies', 'techStack', 'integrations'],
      creditsPerLead: 3,
      accuracy: '78%'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'running':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      completed: 'bg-green-100 text-green-800',
      running: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Enrichment</h1>
              <p className="text-gray-600">Automatically fill missing lead information using AI-powered data sources</p>
            </div>
          </div>
          <Button className="btn-primary">
            <Zap className="h-4 w-4 mr-2" />
            Start Enrichment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-gray-600">Credits Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">892</p>
                <p className="text-sm text-gray-600">Leads Enriched</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">94.3%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">$0.05</p>
                <p className="text-sm text-gray-600">Avg Cost/Lead</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Enrichment Jobs</CardTitle>
              <CardDescription>
                Track the progress of your data enrichment operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrichmentJobs.map((job) => (
                  <div key={job.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start">
                        {getStatusIcon(job.status)}
                        <div className="ml-3">
                          <h4 className="font-medium text-gray-900">{job.name}</h4>
                          <p className="text-sm text-gray-600">{job.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(job.status)}
                        {job.status === 'running' && (
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress: {job.leadsProcessed}/{job.totalLeads} leads</span>
                        <span>{job.creditsUsed} credits used</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${job.status === 'completed' ? 'bg-green-500' : job.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}
                          style={{ width: `${(job.leadsProcessed / job.totalLeads) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Enriching fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {job.fields.map((field) => (
                          <span key={field} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-gray-500">
                      Started: {job.startedAt}
                      {job.completedAt && ` • Completed: ${job.completedAt}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Enrichments */}
          <Card>
            <CardHeader>
              <CardTitle>Available Enrichments</CardTitle>
              <CardDescription>
                Choose the type of data you want to enrich for your leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableEnrichments.map((enrichment, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{enrichment.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{enrichment.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {enrichment.fields.map((field) => (
                            <span key={field} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                              {field}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{enrichment.creditsPerLead} credits per lead</span>
                          <span>•</span>
                          <span>{enrichment.accuracy} accuracy</span>
                        </div>
                      </div>
                      
                      <Button variant="outline">
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Credit Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credit Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-purple-600 mb-1">1,247</div>
                <div className="text-sm text-gray-600">Credits remaining</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Used this month:</span>
                  <span>353 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Plan limit:</span>
                  <span>1,600 credits</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                Buy More Credits
              </Button>
            </CardContent>
          </Card>

          {/* Enrichment Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enrichment Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Start with Contact Info</h4>
                <p className="text-gray-600">Email and phone enrichment typically has the highest success rate</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Company Data First</h4>
                <p className="text-gray-600">Enrich company information before individual contact details</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Batch Processing</h4>
                <p className="text-gray-600">Process leads in batches of 100-500 for optimal performance</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Quality Check</h4>
                <p className="text-gray-600">Review enriched data before using it in campaigns</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Company enrichment completed</span>
                  <span className="text-gray-500">15 min ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Contact info job started</span>
                  <span className="text-gray-500">2 hours ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Geographic data failed</span>
                  <span className="text-gray-500">3 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function EnrichmentPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <EnrichmentContent />
      </AppLayout>
    </ProtectedRoute>
  )
}