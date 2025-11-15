'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth/context'

// Analytics interface
export interface LeadListAnalytics {
  totalLeads: number
  activeLeads: number
  sentLeads: number
  repliedLeads: number
  bouncedLeads: number
  unsubscribedLeads: number
  campaignsUsing: number
  activeCampaigns: number
  totalEmailsSent: number
  totalDelivered: number
  totalOpens: number
  totalClicks: number
  totalReplies: number
  totalBounces: number
  deliveryRate: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
  lastCampaignUsed: string | null
}

// Lead List interface
export interface LeadList {
  id: string
  name: string
  description: string
  totalLeads: number
  activeLeads: number
  createdAt: string
  updatedAt: string
  lastLeadAdded: string | null
  analytics?: LeadListAnalytics
}

interface UseLeadListsReturn {
  leadLists: LeadList[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  deleteLeadList: (listId: string) => Promise<boolean>
  isUpdating: boolean
}

export function useLeadLists(options?: { includeAnalytics?: boolean }): UseLeadListsReturn {
  const [leadLists, setLeadLists] = useState<LeadList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const includeAnalytics = options?.includeAnalytics ?? false

  const fetchLeadLists = useCallback(async () => {
    // Wait for auth to finish loading before making API calls
    if (authLoading) {
      console.log('📊 useLeadLists: Waiting for auth to finish loading...')
      return
    }

    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useLeadLists: Not authenticated or missing organizationId', { isAuthenticated, orgId: user?.organizationId })
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      console.log('📊 useLeadLists: Fetching lead lists for org:', user.organizationId, includeAnalytics ? 'with analytics' : '')

      const url = includeAnalytics ? '/leads/lists?include=analytics' : '/leads/lists'
      const response = await api.get(url)
      const lists = response.data

      console.log('📊 useLeadLists: Raw API response:', JSON.stringify(lists, null, 2))

      setLeadLists(lists || [])
      console.log('📊 useLeadLists: Successfully fetched', lists?.length || 0, 'lead lists')
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load lead lists'
      setError(errorMessage)
      console.error('❌ useLeadLists: Error fetching lead lists:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.organizationId, isAuthenticated, authLoading, includeAnalytics])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchLeadLists()
  }, [fetchLeadLists])

  const deleteLeadList = useCallback(async (listId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useLeadLists: Cannot delete list - not authenticated')
      return false
    }

    setIsUpdating(true)
    try {
      const response = await api.delete(`/leads/lists/${listId}`)

      if (response.data.success) {
        // Optimistically remove from local state
        setLeadLists(prev => prev.filter(list => list.id !== listId))
        console.log('✅ useLeadLists: Lead list deleted successfully')
        return true
      } else {
        throw new Error('Failed to delete lead list')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete lead list'
      setError(errorMessage)
      console.error('❌ useLeadLists: Error deleting lead list:', err)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [user?.organizationId, isAuthenticated])

  // Initial fetch
  useEffect(() => {
    fetchLeadLists()
  }, [fetchLeadLists])

  return {
    leadLists,
    isLoading,
    error,
    refetch,
    deleteLeadList,
    isUpdating
  }
}
