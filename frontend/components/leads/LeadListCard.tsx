'use client'

import React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  Users, 
  Calendar, 
  MoreHorizontal, 
  Trash2, 
  Edit3,
  FileText,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'

interface LeadList {
  id: string
  name: string
  description: string
  totalLeads: number
  activeLeads: number
  createdAt: string
  updatedAt: string
  lastLeadAdded?: string
}

interface LeadListCardProps {
  leadList: LeadList
  onDelete?: (id: string) => Promise<void>
  onEdit?: (leadList: LeadList) => void
}

export default function LeadListCard({ leadList, onDelete, onEdit }: LeadListCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(leadList.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  const getHealthStatus = () => {
    if (leadList.totalLeads === 0) {
      return { color: 'gray', label: 'Empty', icon: AlertCircle }
    }
    
    const activePercentage = (leadList.activeLeads / leadList.totalLeads) * 100
    
    if (activePercentage >= 80) {
      return { color: 'green', label: 'Healthy', icon: UserCheck }
    } else if (activePercentage >= 50) {
      return { color: 'yellow', label: 'Fair', icon: Users }
    } else {
      return { color: 'red', label: 'Needs Attention', icon: AlertCircle }
    }
  }

  const healthStatus = getHealthStatus()
  const HealthIcon = healthStatus.icon

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-medium truncate">
                <Link 
                  href={`/leads/lists/${leadList.id}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {leadList.name}
                </Link>
              </CardTitle>
              {leadList.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {leadList.description}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(leadList)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit List
                  </DropdownMenuItem>
                )}
                <Link href={`/leads/lists/${leadList.id}`}>
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    View Leads
                  </DropdownMenuItem>
                </Link>
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete List
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {leadList.totalLeads.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Total Leads</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {leadList.activeLeads.toLocaleString()}
                </div>
                <div className="text-xs text-blue-700">Active</div>
              </div>
            </div>

            {/* Health Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HealthIcon className={`h-4 w-4 ${
                  healthStatus.color === 'green' ? 'text-green-500' :
                  healthStatus.color === 'yellow' ? 'text-yellow-500' :
                  healthStatus.color === 'red' ? 'text-red-500' :
                  'text-gray-500'
                }`} />
                <span className={`text-sm font-medium ${
                  healthStatus.color === 'green' ? 'text-green-700' :
                  healthStatus.color === 'yellow' ? 'text-yellow-700' :
                  healthStatus.color === 'red' ? 'text-red-700' :
                  'text-gray-700'
                }`}>
                  {healthStatus.label}
                </span>
              </div>
              
              {leadList.totalLeads > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round((leadList.activeLeads / leadList.totalLeads) * 100)}% Active
                </Badge>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDate(leadList.createdAt)}</span>
              </div>
              {leadList.lastLeadAdded && (
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  <span>Last import {formatDate(leadList.lastLeadAdded)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{leadList.name}"? 
              This will remove the list and all {leadList.totalLeads} leads in it. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete List'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}