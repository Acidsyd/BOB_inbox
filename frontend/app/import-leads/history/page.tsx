'use client'

import React, { useState, useEffect, useMemo } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  History, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  RotateCcw,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  Eye,
  Trash2,
  ArrowUpDown,
  PieChart,
  BarChart3,
  Clock,
  Database,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

function ImportHistoryContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const imports = [
    {
      id: 1,
      fileName: 'Q4_prospects.csv',
      status: 'completed',
      totalRows: 2456,
      successfulRows: 2398,
      errors: 58,
      createdAt: '2024-01-15 14:30',
      duration: '2m 15s'
    },
    {
      id: 2,
      fileName: 'webinar_attendees.xlsx',
      status: 'completed',
      totalRows: 892,
      successfulRows: 892,
      errors: 0,
      createdAt: '2024-01-14 09:45',
      duration: '45s'
    },
    {
      id: 3,
      fileName: 'event_contacts.csv',
      status: 'processing',
      totalRows: 1234,
      successfulRows: 856,
      errors: 12,
      createdAt: '2024-01-15 16:20',
      duration: '--'
    },
    {
      id: 4,
      fileName: 'leads_backup.csv',
      status: 'failed',
      totalRows: 5000,
      successfulRows: 0,
      errors: 1,
      createdAt: '2024-01-13 11:15',
      duration: '10s'
    },
    {
      id: 5,
      fileName: 'conference_leads.xlsx',
      status: 'completed',
      totalRows: 567,
      successfulRows: 541,
      errors: 26,
      createdAt: '2024-01-12 16:30',
      duration: '1m 30s'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredImports = imports.filter(imp => {
    const matchesSearch = imp.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || imp.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/import-leads">
              <Button variant="outline" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Import
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Import History</h1>
              <p className="text-gray-600">Track and manage all your lead import activities</p>
            </div>
          </div>
          <Link href="/import-leads">
            <Button className="btn-primary">
              New Import
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-gray-600">Total Imports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">8,234</p>
                <p className="text-sm text-gray-600">Leads Imported</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">97</p>
                <p className="text-sm text-gray-600">Import Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">98.8%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search imports by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Import History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>
            Detailed history of all your lead imports with status and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">File</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Duration</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredImports.map((imp) => (
                  <tr key={imp.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        {getStatusIcon(imp.status)}
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{imp.fileName}</p>
                          <p className="text-sm text-gray-500">{imp.totalRows.toLocaleString()} rows</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(imp.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-green-600">{imp.successfulRows.toLocaleString()} successful</span>
                          {imp.errors > 0 && (
                            <span className="text-red-600">{imp.errors} errors</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${imp.status === 'completed' ? 'bg-green-500' : imp.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}
                            style={{ width: `${(imp.successfulRows / imp.totalRows) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {imp.createdAt}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {imp.duration}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ImportHistoryPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ImportHistoryContent />
      </AppLayout>
    </ProtectedRoute>
  )
}