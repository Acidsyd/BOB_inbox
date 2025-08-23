'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/context'

interface EmailAccountResponse {
  id: string
  email: string
  provider: string
  settings: any
  health_score: number
  warmup_status: string
  daily_limit: number
  current_sent_today: number
  last_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface EmailAccount {
  id: string
  email: string
  provider: 'gmail' | 'outlook' | 'smtp'
  status: 'active' | 'warming' | 'paused' | 'error'
  health: number
  dailyLimit: number
  sentToday: number
  warmupProgress: number
  warmupDaysRemaining: number
  lastActivity: string
  createdAt: string
}

interface UseEmailAccountsReturn {
  accounts: EmailAccount[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateAccountStatus: (accountId: string, status: 'active' | 'paused') => Promise<void>
  isUpdating: boolean
}

function mapApiResponseToUI(row: EmailAccountResponse): EmailAccount {
  // Calculate warmup progress and days remaining based on warmup_status and created_at
  const createdDate = new Date(row.created_at)
  const today = new Date()
  const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  const warmupDays = 30 // Typical warmup period
  
  let status: 'active' | 'warming' | 'paused' | 'error'
  let warmupProgress = 0
  let warmupDaysRemaining = 0
  
  // Determine status based on warmup_status and health_score
  if (row.warmup_status === 'completed' || daysSinceCreation >= warmupDays) {
    status = row.health_score >= 70 ? 'active' : 'error'
    warmupProgress = 100
  } else if (row.warmup_status === 'paused') {
    status = 'paused'
    warmupProgress = (daysSinceCreation / warmupDays) * 100
    warmupDaysRemaining = Math.max(0, warmupDays - daysSinceCreation)
  } else if (row.warmup_status === 'error') {
    status = 'error'
    warmupProgress = (daysSinceCreation / warmupDays) * 100
    warmupDaysRemaining = Math.max(0, warmupDays - daysSinceCreation)
  } else {
    status = 'warming'
    warmupProgress = (daysSinceCreation / warmupDays) * 100
    warmupDaysRemaining = Math.max(0, warmupDays - daysSinceCreation)
  }

  return {
    id: row.id,
    email: row.email,
    provider: row.provider as 'gmail' | 'outlook' | 'smtp',
    status,
    health: row.health_score,
    dailyLimit: row.daily_limit,
    sentToday: row.current_sent_today,
    warmupProgress: Math.min(100, Math.max(0, warmupProgress)),
    warmupDaysRemaining,
    lastActivity: row.last_sent_at || row.updated_at,
    createdAt: row.created_at
  }
}

export function useEmailAccounts(): UseEmailAccountsReturn {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchAccounts = useCallback(async () => {
    if (!user?.organizationId) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const response = await api.get('/email-accounts')
      const { accounts } = response.data

      const mappedAccounts = (accounts || []).map(mapApiResponseToUI)
      setAccounts(mappedAccounts)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load email accounts'
      setError(errorMessage)
      console.error('Error fetching email accounts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.organizationId])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchAccounts()
  }, [fetchAccounts])

  const updateAccountStatus = useCallback(async (
    accountId: string, 
    status: 'active' | 'paused'
  ) => {
    if (!user?.organizationId) return

    setIsUpdating(true)
    try {
      const warmupStatus = status === 'paused' ? 'paused' : 'active'
      
      await api.post(`/email-accounts/${accountId}/warmup`, {
        warmup_status: warmupStatus
      })

      // Optimistic update
      setAccounts(prev => prev.map(account => 
        account.id === accountId 
          ? { ...account, status }
          : account
      ))
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update account status'
      setError(errorMessage)
      console.error('Error updating account status:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [user?.organizationId])

  // Note: Real-time updates removed - using API polling instead

  // Initial fetch
  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    accounts,
    isLoading,
    error,
    refetch,
    updateAccountStatus,
    isUpdating
  }
}