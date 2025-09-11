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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
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
    const totalLeads = leadList.totalLeads || 0;
    const activeLeads = leadList.activeLeads || 0;
    
    if (totalLeads === 0) {
      return { color: 'gray', label: 'Empty', icon: AlertCircle }
    }
    
    const activePercentage = (activeLeads / totalLeads) * 100
    
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
      <Card className="group hover:shadow-sm transition-shadow">
        <div className="flex items-center px-4 py-2.5 gap-4">
          {/* Left section - Title and description */}
          <div className="min-w-0 flex-1 max-w-sm">
            <CardTitle className="text-sm font-medium truncate">
              <Link 
                href={`/leads/lists/${leadList.id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {leadList.name}
              </Link>
            </CardTitle>
            {leadList.description && (
              <p className="text-xs text-gray-500 truncate">
                {leadList.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-medium text-gray-900">
                {(leadList.totalLeads || 0).toLocaleString()}
              </span>
              <span className="text-gray-500">leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-blue-600">
                {(leadList.activeLeads || 0).toLocaleString()}
              </span>
              <span className="text-gray-500">active</span>
            </div>
          </div>

          {/* Health Status Badge */}
          {(leadList.totalLeads || 0) > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {Math.round(((leadList.activeLeads || 0) / (leadList.totalLeads || 1)) * 100)}%
            </Badge>
          )}

          {/* Date */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(leadList.createdAt)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Link href={`/leads/lists/${leadList.id}`}>
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                View
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
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
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{leadList.name}"? 
              This will remove the list and all {leadList.totalLeads || 0} leads in it. 
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