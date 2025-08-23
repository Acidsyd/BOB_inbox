'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Upload, Search, Filter, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

function LeadsContent() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage your prospect database and lead lists</p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads/import">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </Link>
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-gray-600">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Add more stat cards as needed */}
      </div>

      {/* Leads Table Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Lead management system</h3>
            <p className="text-gray-500 mb-6">
              Complete lead database with filtering, segmentation, and management tools will be implemented here
            </p>
            <Link href="/leads/import">
              <Button className="btn-primary">
                <Upload className="h-4 w-4 mr-2" />
                Import Your First Leads
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LeadsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <LeadsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}