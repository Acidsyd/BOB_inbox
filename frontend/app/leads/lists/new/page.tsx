'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import Link from 'next/link'
import ProtectedRoute from '../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../components/layout/AppLayout'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Textarea } from '../../../../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Alert, AlertDescription } from '../../../../components/ui/alert'

function CreateLeadListContent() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Lead list name is required')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/leads/lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create lead list')
      }

      const data = await response.json()
      
      // Navigate to the newly created lead list
      router.push(`/leads/lists/${data.leadList.id}`)
      
    } catch (error) {
      console.error('Error creating lead list:', error)
      setError(error instanceof Error ? error.message : 'Failed to create lead list')
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/leads/lists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lead Lists
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Create New Lead List</h1>
        <p className="text-gray-600">
          Create an empty lead list. You can add leads manually or import them later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Lead List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Lead List Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter a name for your lead list"
                  required
                  maxLength={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.name.length}/100 characters
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this lead list (optional)"
                  maxLength={500}
                  rows={3}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/500 characters
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Link href="/leads/lists">
                <Button variant="outline" disabled={isCreating}>
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isCreating || !formData.name.trim()}
              >
                {isCreating ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Lead List
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-800 mb-2">What's next?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• After creating the list, you can add leads manually one by one</li>
            <li>• Import leads from a CSV file using the upload feature</li>
            <li>• Use the lead list in your email campaigns</li>
            <li>• Track engagement and manage lead status</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CreateLeadListPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CreateLeadListContent />
      </AppLayout>
    </ProtectedRoute>
  )
}