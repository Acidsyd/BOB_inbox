'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, FileText, Download } from 'lucide-react'
import Link from 'next/link'

function ImportLeadsContent() {
  return (
    <div className="p-6">
      <div className="flex items-center mb-8">
        <Link href="/leads">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Leads</h1>
          <p className="text-gray-600">Upload your prospect list from CSV or Excel files</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload Lead File
            </CardTitle>
            <CardDescription>
              Import leads from CSV or Excel files with field mapping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Drop your file here</h3>
              <p className="text-gray-500 mb-4">or click to browse</p>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <p className="text-xs text-gray-400 mt-4">
                Supports CSV, Excel files up to 10MB
              </p>
            </div>

            <div className="mt-6">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV Template
              </Button>
            </div>
          </CardContent>
        </Card>
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