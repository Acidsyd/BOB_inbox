'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ProtectedRoute from '../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../components/layout/AppLayout'
import CSVUploader from '../../../../components/leads/CSVUploader'
import { Button } from '../../../../components/ui/button'

function CSVUploadContent() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b bg-white">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-4">
          <Link href="/leads/lists">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lead Lists
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Upload CSV File</h1>
          <p className="text-gray-600">
            Import leads from a CSV file. The system will automatically detect common fields 
            like email, name, company, and phone number.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          {/* CSV Uploader Component */}
          <CSVUploader />
        </div>
      </div>
    </div>
  )
}

export default function CSVUploadPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CSVUploadContent />
      </AppLayout>
    </ProtectedRoute>
  )
}