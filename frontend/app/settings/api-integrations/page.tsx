'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Plus, 
  Settings,
  Key,
  Globe,
  Zap,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Trash2,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function APIIntegrationsContent() {
  const [activeTab, setActiveTab] = useState('active')

  const integrations = [
    {
      id: 1,
      name: 'Clay.com',
      description: 'Data enrichment and lead intelligence platform',
      status: 'active',
      apiKey: 'sk_clay_*********************xyz',
      endpoints: ['enrichment', 'company-data', 'contact-search'],
      requestsThisMonth: 2847,
      requestLimit: 10000,
      lastUsed: '2024-01-15 14:30',
      icon: '🏺'
    },
    {
      id: 2,
      name: 'Apollo.io',
      description: 'Sales intelligence and engagement platform',
      status: 'active',
      apiKey: 'apollo_*********************abc',
      endpoints: ['search', 'enrich', 'verify'],
      requestsThisMonth: 1523,
      requestLimit: 5000,
      lastUsed: '2024-01-15 12:15',
      icon: '🚀'
    },
    {
      id: 3,
      name: 'Hunter.io',
      description: 'Email finder and verification service',
      status: 'error',
      apiKey: 'hunter_*********************def',
      endpoints: ['domain-search', 'email-finder', 'email-verifier'],
      requestsThisMonth: 0,
      requestLimit: 1000,
      lastUsed: '2024-01-10 09:45',
      icon: '🎯'
    },
    {
      id: 4,
      name: 'Clearbit',
      description: 'Company and person data enrichment',
      status: 'inactive',
      apiKey: 'cb_*********************ghi',
      endpoints: ['enrichment', 'discovery', 'prospect'],
      requestsThisMonth: 0,
      requestLimit: 2500,
      lastUsed: '2024-01-05 16:20',
      icon: '🔍'
    }
  ]

  const availableIntegrations = [
    {
      name: 'ZoomInfo',
      description: 'B2B contact and company database',
      category: 'Lead Intelligence',
      features: ['Contact search', 'Company data', 'Technographics'],
      icon: '📊'
    },
    {
      name: 'LinkedIn Sales Navigator',
      description: 'Professional networking and prospecting',
      category: 'Social Selling',
      features: ['Advanced search', 'Lead recommendations', 'InMail'],
      icon: '💼'
    },
    {
      name: 'Outreach.io',
      description: 'Sales engagement and automation platform',
      category: 'Email Automation',
      features: ['Sequence automation', 'Template library', 'Analytics'],
      icon: '📧'
    },
    {
      name: 'Salesforce',
      description: 'CRM and sales management platform',
      category: 'CRM Integration',
      features: ['Contact sync', 'Lead management', 'Pipeline tracking'],
      icon: '☁️'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'inactive':
        return <RefreshCw className="h-4 w-4 text-gray-400" />
      default:
        return <Globe className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredIntegrations = integrations.filter(integration => {
    if (activeTab === 'active') return integration.status === 'active'
    if (activeTab === 'inactive') return integration.status !== 'active'
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">API Integrations</h1>
            <p className="text-gray-600">Connect external services to enhance your lead generation and enrichment capabilities</p>
          </div>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">{integrations.length}</p>
                <p className="text-sm text-gray-600">Total Integrations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">{integrations.filter(i => i.status === 'active').length}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">4,370</p>
                <p className="text-sm text-gray-600">API Calls This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">$127</p>
                <p className="text-sm text-gray-600">Monthly API Costs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'active', name: 'Active', count: integrations.filter(i => i.status === 'active').length },
                { id: 'inactive', name: 'Inactive', count: integrations.filter(i => i.status !== 'active').length },
                { id: 'all', name: 'All', count: integrations.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Integrations List */}
          <div className="space-y-4">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <div className="text-2xl mr-4">{integration.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                          {getStatusBadge(integration.status)}
                          {getStatusIcon(integration.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{integration.description}</p>
                        
                        {/* API Key */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-gray-400" />
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                              {integration.apiKey}
                            </code>
                            <Button variant="ghost" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Endpoints */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Available endpoints:</p>
                          <div className="flex flex-wrap gap-1">
                            {integration.endpoints.map((endpoint) => (
                              <span key={endpoint} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                {endpoint}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Usage Stats */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>API Usage This Month</span>
                            <span className="font-medium">
                              {integration.requestsThisMonth.toLocaleString()} / {integration.requestLimit.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${integration.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'}`}
                              style={{ width: `${(integration.requestsThisMonth / integration.requestLimit) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Last used: {integration.lastUsed}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Add Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Integrations</CardTitle>
              <CardDescription>
                Popular services you can connect to enhance your workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableIntegrations.map((integration, index) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="text-xl mr-3">{integration.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{integration.name}</h4>
                          <p className="text-xs text-gray-600 mb-2">{integration.description}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {integration.features.slice(0, 2).map((feature) => (
                              <span key={feature} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                {feature}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {integration.category}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Integration Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integration Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">API Keys</h4>
                <p className="text-gray-600">Store your API keys securely and rotate them regularly</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Rate Limits</h4>
                <p className="text-gray-600">Monitor usage to avoid hitting API rate limits</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Error Handling</h4>
                <p className="text-gray-600">Set up alerts for API errors and downtime</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Data Mapping</h4>
                <p className="text-gray-600">Configure how external data maps to your lead fields</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function APIIntegrationsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <APIIntegrationsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}