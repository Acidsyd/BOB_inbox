'use client'

import { useState } from 'react'
import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import AppLayout from '../../../components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Input } from '../../../components/ui/input'
import {
  Code,
  Copy,
  CheckCircle,
  ArrowLeft,
  Search,
  Book,
  Key,
  Zap,
  ExternalLink,
  ChevronRight,
  Globe
} from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'

interface ApiEndpoint {
  method: string
  path: string
  description: string
  auth: boolean
  example: string
  response: string
}

function ApiDocumentationContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // API Token (mock - would come from user context)
  const apiToken = 'your_jwt_token_here'
  const baseUrl = 'https://qquadro.com/api'

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // API Endpoints organized by category
  const apiEndpoints: Record<string, ApiEndpoint[]> = {
    'Public API': [
      {
        method: 'POST',
        path: '/public/leads/lists/:id/add',
        description: 'Add a single lead to a list without authentication (rate-limited: 100/hour/IP)',
        auth: false,
        example: `curl -X POST ${baseUrl}/public/leads/lists/YOUR_LIST_ID/add \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "company": "Acme Inc",
    "custom_fields": "3159"
  }'`,
        response: `{
  "success": true,
  "lead": {
    "id": "uuid",
    "email": "user@example.com",
    "status": "active"
  }
}`
      }
    ],
    'Lead Management': [
      {
        method: 'GET',
        path: '/leads/lists',
        description: 'Get all lead lists for your organization',
        auth: true,
        example: `curl -X GET ${baseUrl}/leads/lists \\
  -H "Authorization: Bearer ${apiToken}"`,
        response: `[
  {
    "id": "uuid",
    "name": "Lead List Name",
    "totalLeads": 150,
    "activeLeads": 120,
    "createdAt": "2025-01-15T10:00:00Z"
  }
]`
      },
      {
        method: 'POST',
        path: '/leads/lists/:id/import-duplicates',
        description: 'Import leads with custom fields support',
        auth: true,
        example: `curl -X POST ${baseUrl}/leads/lists/LIST_ID/import-duplicates \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "duplicateLeads": [
      {
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "company": "Acme Inc",
        "custom_fields": {"phone": "123-456-7890"}
      }
    ]
  }'`,
        response: `{
  "message": "Successfully imported 1 duplicate leads",
  "inserted": 1,
  "total": 1,
  "errors": []
}`
      }
    ],
    'Email Accounts': [
      {
        method: 'GET',
        path: '/email-accounts',
        description: 'List all email accounts',
        auth: true,
        example: `curl -X GET ${baseUrl}/email-accounts \\
  -H "Authorization: Bearer ${apiToken}"`,
        response: `[
  {
    "id": "uuid",
    "email": "sender@example.com",
    "provider": "gmail",
    "display_name": "John Doe",
    "is_active": true
  }
]`
      },
      {
        method: 'PUT',
        path: '/email-accounts/:id/settings',
        description: 'Update email account settings (display name, limits, etc.)',
        auth: true,
        example: `curl -X PUT ${baseUrl}/email-accounts/ACCOUNT_ID/settings \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "display_name": "John Doe",
    "daily_limit": 50,
    "hourly_limit": 10
  }'`,
        response: `{
  "success": true,
  "account": {
    "id": "uuid",
    "display_name": "John Doe"
  }
}`
      }
    ],
    'Campaigns': [
      {
        method: 'GET',
        path: '/campaigns',
        description: 'List all campaigns',
        auth: true,
        example: `curl -X GET ${baseUrl}/campaigns \\
  -H "Authorization: Bearer ${apiToken}"`,
        response: `[
  {
    "id": "uuid",
    "name": "Campaign Name",
    "status": "active",
    "totalScheduled": 500,
    "sent": 250
  }
]`
      },
      {
        method: 'POST',
        path: '/campaigns/:id/start',
        description: 'Start a campaign',
        auth: true,
        example: `curl -X POST ${baseUrl}/campaigns/CAMPAIGN_ID/start \\
  -H "Authorization: Bearer ${apiToken}"`,
        response: `{
  "success": true,
  "campaign": {
    "id": "uuid",
    "status": "active"
  }
}`
      }
    ],
    'Webhooks': [
      {
        method: 'GET',
        path: '/webhooks',
        description: 'List all webhooks',
        auth: true,
        example: `curl -X GET ${baseUrl}/webhooks \\
  -H "Authorization: Bearer ${apiToken}"`,
        response: `[
  {
    "id": "uuid",
    "url": "https://your-domain.com/webhook",
    "events": ["lead.created", "campaign.completed"]
  }
]`
      },
      {
        method: 'POST',
        path: '/webhooks',
        description: 'Create a new webhook',
        auth: true,
        example: `curl -X POST ${baseUrl}/webhooks \\
  -H "Authorization: Bearer ${apiToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-domain.com/webhook",
    "events": ["lead.created", "email.sent"],
    "active": true
  }'`,
        response: `{
  "id": "uuid",
  "url": "https://your-domain.com/webhook",
  "events": ["lead.created", "email.sent"],
  "active": true
}`
      }
    ]
  }

  // Filter endpoints based on search
  const filteredEndpoints = Object.entries(apiEndpoints).reduce((acc, [category, endpoints]) => {
    const filtered = endpoints.filter(endpoint =>
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.method.toLowerCase().includes(searchTerm.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {} as Record<string, ApiEndpoint[]>)

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'POST':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PUT':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="mr-3">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </Link>
          <Code className="h-6 w-6 text-purple-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
            <p className="text-gray-600">REST API endpoints and webhook integrations</p>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">API Base URL</p>
                <p className="font-mono text-sm font-medium">{baseUrl}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Rate Limit</p>
                <p className="font-medium">1000 req/hour</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Public API</p>
                <p className="font-medium">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authentication */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Authentication
          </CardTitle>
          <CardDescription>How to authenticate your API requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Bearer Token Authentication</h4>
              <p className="text-sm text-gray-600 mb-3">
                Include your JWT token in the Authorization header for all authenticated requests:
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>Authorization: Bearer {apiToken}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(`Authorization: Bearer ${apiToken}`, 'auth')}
                >
                  {copiedCode === 'auth' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <Book className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Public API Endpoints</p>
                  <p className="text-blue-700">
                    Some endpoints (marked with "No Auth") don't require authentication.
                    These are rate-limited by IP address.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search endpoints (e.g., leads, campaigns, webhooks)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* API Endpoints */}
      <div className="space-y-6">
        {Object.entries(filteredEndpoints).map(([category, endpoints]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className={getMethodColor(endpoint.method)}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {endpoint.path}
                      </code>
                      {!endpoint.auth && (
                        <Badge variant="outline" className="text-xs">
                          No Auth
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{endpoint.description}</p>

                  <Tabs defaultValue="request" className="w-full">
                    <TabsList>
                      <TabsTrigger value="request">Request</TabsTrigger>
                      <TabsTrigger value="response">Response</TabsTrigger>
                    </TabsList>

                    <TabsContent value="request">
                      <div className="relative mt-2">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                          <code>{endpoint.example}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(endpoint.example, `req-${index}`)}
                        >
                          {copiedCode === `req-${index}` ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="response">
                      <div className="relative mt-2">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                          <code>{endpoint.response}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(endpoint.response, `res-${index}`)}
                        >
                          {copiedCode === `res-${index}` ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Resources */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>Helpful links and documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Link href="/docs/api" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center">
                <Book className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <p className="font-medium">Full API Documentation</p>
                  <p className="text-sm text-gray-600">Complete reference guide</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </Link>

            <Link href="/settings/webhooks" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center">
                <Zap className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <p className="font-medium">Webhook Configuration</p>
                  <p className="text-sm text-gray-600">Set up event notifications</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ApiDocumentationPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ApiDocumentationContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
