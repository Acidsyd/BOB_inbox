'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Plus, 
  Calculator,
  Edit3,
  Trash2,
  Copy,
  Play,
  Code,
  Zap,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

function FormulasContent() {
  const formulas = [
    {
      id: 1,
      name: 'Lead Score',
      description: 'Calculate lead quality based on company size, industry, and engagement',
      formula: 'IF(employeeCount > 100, 50, 25) + IF(industry = "Technology", 30, 10) + engagementScore',
      type: 'Number',
      status: 'active',
      leadsAffected: 1247,
      lastUpdated: '2024-01-15',
      examples: [
        { input: 'TechCorp, 500 employees, 85 engagement', output: '165' },
        { input: 'SmallBiz, 25 employees, 45 engagement', output: '80' }
      ]
    },
    {
      id: 2,
      name: 'Full Name',
      description: 'Combine first and last name with proper formatting',
      formula: 'CONCAT(firstName, " ", lastName)',
      type: 'Text',
      status: 'active',
      leadsAffected: 1247,
      lastUpdated: '2024-01-14',
      examples: [
        { input: 'John, Smith', output: 'John Smith' },
        { input: 'Sarah, Johnson', output: 'Sarah Johnson' }
      ]
    },
    {
      id: 3,
      name: 'Days Since Contact',
      description: 'Calculate days since last contact attempt',
      formula: 'DATEDIFF(TODAY(), lastContactDate)',
      type: 'Number',
      status: 'active',
      leadsAffected: 892,
      lastUpdated: '2024-01-13',
      examples: [
        { input: '2024-01-10', output: '5' },
        { input: '2024-01-01', output: '14' }
      ]
    },
    {
      id: 4,
      name: 'Company Domain',
      description: 'Extract domain from email address',
      formula: 'REGEX_EXTRACT(email, "@(.+)")',
      type: 'Text',
      status: 'error',
      leadsAffected: 0,
      lastUpdated: '2024-01-12',
      examples: [
        { input: 'john@company.com', output: 'company.com' },
        { input: 'sarah@startup.io', output: 'startup.io' }
      ]
    }
  ]

  const formulaTemplates = [
    {
      name: 'Email Validation',
      description: 'Check if email format is valid',
      formula: 'REGEX_MATCH(email, "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")',
      category: 'Validation'
    },
    {
      name: 'Priority Score',
      description: 'Calculate priority based on multiple factors',
      formula: 'IF(leadScore > 100, "High", IF(leadScore > 50, "Medium", "Low"))',
      category: 'Scoring'
    },
    {
      name: 'Company Size Category',
      description: 'Categorize companies by employee count',
      formula: 'IF(employeeCount > 1000, "Enterprise", IF(employeeCount > 100, "Mid-Market", "SMB"))',
      category: 'Categorization'
    },
    {
      name: 'Time Zone',
      description: 'Determine timezone from location',
      formula: 'LOOKUP(location, timezoneTable, "timezone")',
      category: 'Enrichment'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Code className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Formula Columns</h1>
              <p className="text-gray-600">Create dynamic columns using formulas to calculate, validate, and enrich your lead data</p>
            </div>
          </div>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Formula
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Formulas */}
          <Card>
            <CardHeader>
              <CardTitle>Active Formulas</CardTitle>
              <CardDescription>
                Formula columns currently running on your lead database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formulas.map((formula) => (
                  <div key={formula.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start flex-1">
                        {getStatusIcon(formula.status)}
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{formula.name}</h4>
                            {getStatusBadge(formula.status)}
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {formula.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{formula.description}</p>
                          
                          {/* Formula Code */}
                          <div className="bg-gray-100 p-3 rounded font-mono text-sm mb-3">
                            <code>{formula.formula}</code>
                          </div>
                          
                          {/* Examples */}
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Examples:</p>
                            <div className="space-y-1">
                              {formula.examples.slice(0, 2).map((example, index) => (
                                <div key={index} className="text-xs text-gray-600">
                                  <span className="font-medium">{example.input}</span> → <span className="text-purple-600">{example.output}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Affects {formula.leadsAffected.toLocaleString()} leads</span>
                            <span>•</span>
                            <span>Updated {formula.lastUpdated}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Formula Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Formula Builder</CardTitle>
              <CardDescription>
                Create a new formula column with our visual formula builder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Column Name
                  </label>
                  <Input placeholder="Enter column name..." />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input placeholder="Describe what this formula does..." />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formula
                  </label>
                  <div className="relative">
                    <textarea 
                      placeholder="Enter your formula here..."
                      className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={3}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use functions like IF, CONCAT, DATEDIFF, REGEX_MATCH, and reference columns by name
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Calculator className="h-4 w-4 mr-2" />
                    Test Formula
                  </Button>
                  <Button className="btn-primary">
                    Create Column
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Formula Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formula Templates</CardTitle>
              <CardDescription>
                Common formulas you can use as starting points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formulaTemplates.map((template, index) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                    <code className="text-xs bg-gray-100 p-1 rounded font-mono text-purple-600">
                      {template.formula}
                    </code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Function Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Function Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-900">Text Functions</h4>
                <p className="text-gray-600 text-xs">CONCAT, UPPER, LOWER, TRIM, REGEX_MATCH</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Math Functions</h4>
                <p className="text-gray-600 text-xs">SUM, AVERAGE, MIN, MAX, ROUND</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Date Functions</h4>
                <p className="text-gray-600 text-xs">TODAY, DATEDIFF, DATEADD, FORMAT_DATE</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Logic Functions</h4>
                <p className="text-gray-600 text-xs">IF, AND, OR, NOT, ISBLANK</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Lookup Functions</h4>
                <p className="text-gray-600 text-xs">LOOKUP, VLOOKUP, INDEX, MATCH</p>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formula Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Test Before Applying</h4>
                <p className="text-gray-600">Always test formulas on a small dataset before applying to all leads</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Handle Null Values</h4>
                <p className="text-gray-600">Use ISBLANK() to check for empty fields and provide defaults</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Performance Impact</h4>
                <p className="text-gray-600">Complex formulas may slow down data processing for large datasets</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function FormulasPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <FormulasContent />
      </AppLayout>
    </ProtectedRoute>
  )
}