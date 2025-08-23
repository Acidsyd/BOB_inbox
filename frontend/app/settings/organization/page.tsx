'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building } from 'lucide-react'
import Link from 'next/link'

function OrganizationContent() {
  return (
    <div className="p-6">
      <div className="flex items-center mb-8">
        <Link href="/settings">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600">Manage your team and organization preferences</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Organization Settings
          </CardTitle>
          <CardDescription>Configure your organization preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Organization settings will be implemented here</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OrganizationPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <OrganizationContent />
      </AppLayout>
    </ProtectedRoute>
  )
}