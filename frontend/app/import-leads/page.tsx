'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Download, History, Settings, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function ImportLeadsContent() {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Handle file upload here
      console.log('File dropped:', e.dataTransfer.files[0])
    }
  }

  const steps = [
    { number: 1, title: 'Upload File', description: 'Upload CSV or Excel file', active: true },
    { number: 2, title: 'Map Fields', description: 'Map columns to lead fields', active: false },
    { number: 3, title: 'Review & Import', description: 'Confirm and import leads', active: false }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Leads</h1>
            <p className="text-gray-600">Upload and manage your lead import process with advanced field mapping</p>
          </div>
          <div className="flex gap-2">
            <Link href="/import-leads/history">
              <Button variant="outline">
                <History className="h-4 w-4 mr-2" />
                Import History
              </Button>
            </Link>
            <Link href="/import-leads/templates">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-8">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${ 
                  step.active 
                    ? 'bg-purple-600 border-purple-600 text-white' 
                    : 'border-gray-300 text-gray-500'
                }`}>
                  <span className="text-sm font-medium">{step.number}</span>
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${step.active ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-gray-400 mx-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2 text-purple-600" />
                Upload Lead File
              </CardTitle>
              <CardDescription>
                Import leads from CSV or Excel files. Support for custom field mapping and data validation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-50' 
                    : 'border-gray-300 hover:border-purple-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Drop your file here</h3>
                <p className="text-gray-500 mb-6">
                  or click to browse from your computer
                </p>
                <Button className="btn-primary mb-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Supports CSV, Excel files up to 50MB</p>
                  <p>Maximum 100,000 leads per import</p>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
                <Link href="/import-leads/templates" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Import Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Smart Field Mapping</p>
                  <p className="text-xs text-gray-500">Automatic column detection and mapping suggestions</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Data Validation</p>
                  <p className="text-xs text-gray-500">Real-time validation of email formats, phone numbers</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Duplicate Detection</p>
                  <p className="text-xs text-gray-500">Automatic detection and handling of duplicate leads</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Batch Processing</p>
                  <p className="text-xs text-gray-500">Process large files efficiently in the background</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Imports */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Imports</CardTitle>
                <Link href="/import-leads/history">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Q4_prospects.csv</p>
                    <p className="text-xs text-gray-500">2,456 leads • 2 hours ago</p>
                  </div>
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">webinar_attendees.xlsx</p>
                    <p className="text-xs text-gray-500">892 leads • 1 day ago</p>
                  </div>
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-center py-4">
                  <Link href="/import-leads/history">
                    <Button variant="ghost" size="sm" className="text-purple-600">
                      View import history →
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ImportLeadsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ImportLeadsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}