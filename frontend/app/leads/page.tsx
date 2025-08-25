'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ClayStyleSpreadsheet from '@/components/leads/ClayStyleSpreadsheet'
import { 
  Users, 
  Upload, 
  Search, 
  Filter, 
  Plus, 
  FileSpreadsheet, 
  Eye, 
  MoreHorizontal,
  Download,
  TrendingUp,
  UserCheck,
  Mail,
  Phone,
  Building,
  Calendar,
  Tag,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function ManageLeadsContent() {
  const [viewMode, setViewMode] = useState<'table' | 'spreadsheet'>('spreadsheet')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Organization ID would typically come from auth context
  const organizationId = 'demo-org-id'

  const handleSelectionChange = (selection: Set<string>) => {
    setSelectedRows(selection)
  }

  const handleLeadUpdate = (lead: any) => {
    console.log('Lead updated:', lead)
  }

  const handleBulkUpdate = (leadIds: string[], updates: any) => {
    console.log('Bulk update:', leadIds, updates)
  }

  if (viewMode === 'spreadsheet') {
    return (
      <div className="h-screen w-full overflow-hidden">
        <ClayStyleSpreadsheet
          organizationId={organizationId}
          onSelectionChange={handleSelectionChange}
          onLeadUpdate={handleLeadUpdate}
          onBulkUpdate={handleBulkUpdate}
          enableRealTime={true}
          maxRows={100000}
        />
      </div>
    )
  }

  // Legacy table view (fallback)
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Leads</h1>
          <p className="text-gray-600">Organize, filter, and manage your prospect database</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'spreadsheet' ? 'default' : 'outline'}
            onClick={() => setViewMode('spreadsheet')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Spreadsheet View
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Table View
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Clay.com-Style Spreadsheet</h3>
          <p className="text-gray-600 mb-6">
            Switch to spreadsheet view to access the full Clay.com-style interface with virtual scrolling,
            inline editing, advanced filtering, and bulk operations.
          </p>
          <Button onClick={() => setViewMode('spreadsheet')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Open Spreadsheet View
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ManageLeadsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ManageLeadsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}