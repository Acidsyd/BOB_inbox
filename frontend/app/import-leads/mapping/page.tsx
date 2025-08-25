'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, FileText, Settings, CheckCircle, AlertTriangle, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function FieldMappingContent() {
  const [mappings, setMappings] = useState([
    { csvField: 'Email Address', leadField: 'email', mapped: true, required: true },
    { csvField: 'First Name', leadField: 'firstName', mapped: true, required: true },
    { csvField: 'Last Name', leadField: 'lastName', mapped: true, required: true },
    { csvField: 'Company Name', leadField: 'company', mapped: true, required: false },
    { csvField: 'Phone Number', leadField: 'phone', mapped: true, required: false },
    { csvField: 'Job Title', leadField: 'jobTitle', mapped: false, required: false },
    { csvField: 'Industry', leadField: '', mapped: false, required: false },
    { csvField: 'Website', leadField: 'website', mapped: false, required: false },
  ])

  const steps = [
    { number: 1, title: 'Upload File', description: 'Upload CSV or Excel file', active: false, completed: true },
    { number: 2, title: 'Map Fields', description: 'Map columns to lead fields', active: true, completed: false },
    { number: 3, title: 'Review & Import', description: 'Confirm and import leads', active: false, completed: false }
  ]

  const availableFields = [
    'firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'website', 
    'industry', 'location', 'linkedinUrl', 'notes', 'source', 'tags'
  ]

  const updateMapping = (index: number, newField: string) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], leadField: newField, mapped: newField !== '' }
    setMappings(newMappings)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/import-leads">
              <Button variant="outline" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Field Mapping</h1>
              <p className="text-gray-600">Map your CSV columns to lead database fields</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-8">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${ 
                  step.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : step.active 
                      ? 'bg-purple-600 border-purple-600 text-white' 
                      : 'border-gray-300 text-gray-500'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${step.active || step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Mapping Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                Column Mapping
              </CardTitle>
              <CardDescription>
                Map each column from your CSV file to the corresponding lead field. Required fields must be mapped to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mappings.map((mapping, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center flex-1">
                      <div className="flex items-center w-1/3">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{mapping.csvField}</span>
                        {mapping.required && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />
                      
                      <div className="flex-1">
                        <select 
                          value={mapping.leadField}
                          onChange={(e) => updateMapping(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Select a field...</option>
                          {availableFields.map(field => (
                            <option key={field} value={field}>
                              {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {mapping.mapped ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : mapping.required ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <Link href="/import-leads">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Upload
                  </Button>
                </Link>
                <Button className="btn-primary">
                  Continue to Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* File Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">prospects_q4.csv</p>
                <p className="text-xs text-gray-500">2,456 rows • 8 columns</p>
              </div>
              <div>
                <p className="text-sm font-medium">File Size</p>
                <p className="text-xs text-gray-500">1.2 MB</p>
              </div>
              <div>
                <p className="text-sm font-medium">Encoding</p>
                <p className="text-xs text-gray-500">UTF-8</p>
              </div>
            </CardContent>
          </Card>

          {/* Mapping Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapping Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Required Fields</span>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium">3/3</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Optional Fields</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">2/5</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-700 font-medium">Ready to import</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start">
                <input type="checkbox" className="mt-1 mr-2" defaultChecked />
                <div>
                  <p className="text-sm font-medium">Skip duplicates</p>
                  <p className="text-xs text-gray-500">Skip leads that already exist in database</p>
                </div>
              </label>
              <label className="flex items-start">
                <input type="checkbox" className="mt-1 mr-2" defaultChecked />
                <div>
                  <p className="text-sm font-medium">Validate emails</p>
                  <p className="text-xs text-gray-500">Check email format and deliverability</p>
                </div>
              </label>
              <label className="flex items-start">
                <input type="checkbox" className="mt-1 mr-2" />
                <div>
                  <p className="text-sm font-medium">Enrich data</p>
                  <p className="text-xs text-gray-500">Auto-populate missing company information</p>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function FieldMappingPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <FieldMappingContent />
      </AppLayout>
    </ProtectedRoute>
  )
}