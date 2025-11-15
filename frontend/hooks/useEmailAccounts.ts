'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth/context'

// Analytics interface
export interface EmailAccountAnalytics {
  totalEmailsSent: number
  totalReplies: number
  totalOpens: number
  totalClicks: number
  totalBounces: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
  bounceBreakdown: {
    hard: number
    soft: number
  }
}

// Enhanced interface for API responses
interface EmailAccountResponse {
  id: string
  email: string
  provider: string
  status: string
  health_score: number
  daily_limit: number
  hourly_limit: number
  emails_sent_today: number
  sentToday: number
  dailyLimit: number
  health: number
  warmup_status: string
  warmupProgress: number
  warmupDaysRemaining: number
  reputation: string
  availability_status: string
  daily_remaining: number
  hourly_remaining: number
  rotation_priority: number
  rotation_weight: number
  last_activity: string | null
  last_sync_at: string | null
  connection_health: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown'
    last_check_at: string | null
    last_successful_check: string | null
    consecutive_failures: number
    error_message: string | null
  }
  settings: any
  created_at: string
  updated_at: string
  display_name: string
  analytics?: EmailAccountAnalytics
  relay_provider?: any
}

export interface EmailAccount {
  id: string
  email: string
  provider: 'gmail' | 'outlook' | 'smtp' | 'gmail-oauth2' | 'outlook-oauth2' | 'mailgun'
  status: 'active' | 'warming' | 'paused' | 'error'
  health: number
  health_score: number
  dailyLimit: number
  daily_limit: number
  hourly_limit: number
  sentToday: number
  emails_sent_today: number
  warmupProgress: number
  warmupDaysRemaining: number
  reputation: 'excellent' | 'good' | 'fair' | 'poor'
  availability_status: 'available' | 'daily_limit_reached' | 'hourly_limit_reached' | 'inactive'
  daily_remaining: number
  hourly_remaining: number
  rotation_priority: number
  rotation_weight: number
  lastActivity: string
  lastSyncAt: string | null
  connectionHealth: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown'
    last_check_at: string | null
    last_successful_check: string | null
    consecutive_failures: number
    error_message: string | null
  }
  createdAt: string
  warmup_status: 'pending' | 'in_progress' | 'completed' | 'active' | 'warming'
  display_name: string
  analytics?: EmailAccountAnalytics
  relay_provider?: any
}

// Usage statistics interface
export interface AccountUsageStats {
  currentUsage: {
    daily_sent: number
    hourly_sent: number
    daily_remaining: number
    hourly_remaining: number
    availability_status: string
  }
  historicalUsage: Array<{
    date: string
    emails_sent: number
    delivery_rate: number
    bounce_rate: number
    health_score_snapshot: number
  }>
  aggregatedStats: {
    totalEmailsSent: number
    avgDailyEmails: number
    avgDeliveryRate: number
    avgBounceRate: number
    daysAnalyzed: number
    healthTrend: 'improving' | 'declining' | 'stable'
  }
}

// Account settings interface
export interface AccountSettings {
  daily_limit?: number
  hourly_limit?: number
  rotation_priority?: number
  rotation_weight?: number
  status?: 'active' | 'paused' | 'warming' | 'error'
}

// Rotation preview interface
export interface RotationPreview {
  position: number
  email: string
  dailyRemaining: number
  hourlyRemaining: number
  healthScore: number
  priority: number
  weight: number
}

interface UseEmailAccountsReturn {
  accounts: EmailAccount[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateAccountStatus: (accountId: string, status: 'active' | 'paused') => Promise<void>
  updateAccountSettings: (accountId: string, settings: AccountSettings) => Promise<boolean>
  getAccountUsageStats: (accountId: string, days?: number) => Promise<AccountUsageStats>
  resetAccountUsage: (accountId: string, resetType?: 'daily' | 'hourly' | 'both') => Promise<boolean>
  getRotationPreview: (strategy?: string) => Promise<RotationPreview[]>
  bulkUpdateLimits: (updates: Array<{ id: string } & AccountSettings>) => Promise<any>
  testConnection: (accountId: string) => Promise<any>
  deleteAccount: (accountId: string) => Promise<boolean>
  isUpdating: boolean
}

function mapApiResponseToUI(row: EmailAccountResponse): EmailAccount {
  // Use the enhanced data from the API
  const status = (row.status || row.warmup_status) as 'active' | 'warming' | 'paused' | 'error'

  return {
    id: row.id,
    email: row.email,
    provider: row.provider as 'gmail' | 'outlook' | 'smtp' | 'gmail-oauth2' | 'outlook-oauth2' | 'mailgun',
    status,
    health: row.health || row.health_score,
    health_score: row.health_score,
    dailyLimit: row.dailyLimit || row.daily_limit,
    daily_limit: row.daily_limit,
    hourly_limit: row.hourly_limit || 5,
    sentToday: row.sentToday || row.emails_sent_today,
    emails_sent_today: row.emails_sent_today || 0,
    warmupProgress: row.warmupProgress || 0,
    warmupDaysRemaining: row.warmupDaysRemaining || 0,
    warmup_status: status === 'warming' ? 'warming' : (row.warmup_status as any) || 'active',
    reputation: (row.reputation as any) || 'good',
    availability_status: row.availability_status || 'available',
    daily_remaining: row.daily_remaining ?? (row.daily_limit - (row.emails_sent_today || 0)),
    hourly_remaining: row.hourly_remaining ?? (row.hourly_limit || 5),
    rotation_priority: row.rotation_priority || 1,
    rotation_weight: row.rotation_weight || 1.0,
    lastActivity: row.last_activity || row.updated_at,
    lastSyncAt: row.last_sync_at,
    connectionHealth: row.connection_health || {
      status: 'unknown',
      last_check_at: null,
      last_successful_check: null,
      consecutive_failures: 0,
      error_message: null
    },
    createdAt: row.created_at,
    display_name: row.display_name || row.email,
    analytics: row.analytics,
    relay_provider: row.relay_provider
  }
}

export function useEmailAccounts(options?: { includeAnalytics?: boolean }): UseEmailAccountsReturn {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const includeAnalytics = options?.includeAnalytics ?? false

  const fetchAccounts = useCallback(async () => {
    // Wait for auth to finish loading before making API calls
    if (authLoading) {
      console.log('📊 useEmailAccounts: Waiting for auth to finish loading...')
      return
    }

    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useEmailAccounts: Not authenticated or missing organizationId', { isAuthenticated, orgId: user?.organizationId })
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      console.log('📊 useEmailAccounts: Fetching accounts for org:', user.organizationId, includeAnalytics ? 'with analytics' : '')

      const url = includeAnalytics ? '/email-accounts?include=analytics' : '/email-accounts'
      const response = await api.get(url)
      const { accounts } = response.data

      console.log('📊 useEmailAccounts: Raw API response:', JSON.stringify(accounts, null, 2))

      const mappedAccounts = (accounts || []).map(mapApiResponseToUI)
      setAccounts(mappedAccounts)
      console.log('📊 useEmailAccounts: Successfully fetched', mappedAccounts.length, 'accounts')
      console.log('📊 useEmailAccounts: Mapped accounts:', JSON.stringify(mappedAccounts, null, 2))
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load email accounts'
      setError(errorMessage)
      console.error('❌ useEmailAccounts: Error fetching email accounts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.organizationId, isAuthenticated, authLoading, includeAnalytics])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchAccounts()
  }, [fetchAccounts])

  const updateAccountStatus = useCallback(async (
    accountId: string, 
    status: 'active' | 'paused'
  ) => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useEmailAccounts: Cannot update status - not authenticated')
      return
    }

    setIsUpdating(true)
    try {
      await api.put(`/email-accounts/${accountId}/settings`, { status })

      // Optimistic update
      setAccounts(prev => prev.map(account => 
        account.id === accountId 
          ? { ...account, status }
          : account
      ))
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update account status'
      setError(errorMessage)
      console.error('❌ useEmailAccounts: Error updating account status:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [user?.organizationId, isAuthenticated])

  const updateAccountSettings = useCallback(async (
    accountId: string, 
    settings: AccountSettings
  ): Promise<boolean> => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useEmailAccounts: Cannot update settings - not authenticated')
      return false
    }

    setIsUpdating(true)
    try {
      const response = await api.put(`/email-accounts/${accountId}/settings`, settings)
      
      if (response.data.success) {
        // Refresh accounts to get updated data
        await fetchAccounts()
        return true
      } else {
        throw new Error('Failed to update account settings')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update account settings'
      setError(errorMessage)
      console.error('❌ useEmailAccounts: Error updating account settings:', err)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [user?.organizationId, isAuthenticated, fetchAccounts])

  const getAccountUsageStats = useCallback(async (
    accountId: string, 
    days: number = 30
  ): Promise<AccountUsageStats> => {
    if (!isAuthenticated || !user?.organizationId) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await api.get(`/email-accounts/${accountId}/usage-stats?days=${days}`)
      
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error('Failed to fetch usage statistics')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch usage statistics'
      console.error('❌ useEmailAccounts: Error fetching usage statistics:', err)
      throw new Error(errorMessage)
    }
  }, [user?.organizationId, isAuthenticated])

  const resetAccountUsage = useCallback(async (
    accountId: string, 
    resetType: 'daily' | 'hourly' | 'both' = 'both'
  ): Promise<boolean> => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useEmailAccounts: Cannot reset usage - not authenticated')
      return false
    }

    setIsUpdating(true)
    try {
      const response = await api.post(`/email-accounts/${accountId}/reset-usage`, { 
        reset_type: resetType 
      })
      
      if (response.data.success) {
        // Refresh accounts to get updated counters
        await fetchAccounts()
        return true
      } else {
        throw new Error('Failed to reset usage counters')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to reset usage counters'
      setError(errorMessage)
      console.error('❌ useEmailAccounts: Error resetting usage counters:', err)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [user?.organizationId, isAuthenticated, fetchAccounts])

  const getRotationPreview = useCallback(async (
    strategy: string = 'hybrid'
  ): Promise<RotationPreview[]> => {
    if (!isAuthenticated || !user?.organizationId) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await api.get(`/email-accounts/rotation-preview?strategy=${strategy}`)
      
      if (response.data.success) {
        return response.data.rotation_order
      } else {
        throw new Error('Failed to fetch rotation preview')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch rotation preview'
      console.error('❌ useEmailAccounts: Error fetching rotation preview:', err)
      throw new Error(errorMessage)
    }
  }, [user?.organizationId, isAuthenticated])

  const bulkUpdateLimits = useCallback(async (
    updates: Array<{ id: string } & AccountSettings>
  ): Promise<any> => {
    if (!isAuthenticated || !user?.organizationId) {
      throw new Error('Not authenticated')
    }

    setIsUpdating(true)
    try {
      const response = await api.put('/email-accounts/bulk-update-limits', { updates })

      if (response.data.success || response.data.summary?.successful > 0) {
        // Refresh accounts to get updated data
        await fetchAccounts()
        return response.data
      } else {
        throw new Error('Failed to update account limits')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to bulk update limits'
      setError(errorMessage)
      console.error('❌ useEmailAccounts: Error bulk updating limits:', err)
      throw new Error(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }, [user?.organizationId, isAuthenticated, fetchAccounts])

  const testConnection = useCallback(async (accountId: string): Promise<any> => {
    if (!isAuthenticated || !user?.organizationId) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await api.post(`/email-accounts/${accountId}/test-connection`)

      if (response.data.success) {
        // Refresh accounts to get updated connection health
        await fetchAccounts()
        return response.data.result
      } else {
        throw new Error('Connection test failed')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to test connection'
      console.error('❌ useEmailAccounts: Error testing connection:', err)
      throw new Error(errorMessage)
    }
  }, [user?.organizationId, isAuthenticated, fetchAccounts])

  const deleteAccount = useCallback(async (accountId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useEmailAccounts: Cannot delete account - not authenticated')
      return false
    }

    setIsUpdating(true)
    try {
      const response = await api.delete(`/email-accounts/${accountId}`)

      if (response.data.success) {
        // Optimistically remove from local state
        setAccounts(prev => prev.filter(account => account.id !== accountId))
        console.log('✅ useEmailAccounts: Account deleted successfully')
        return true
      } else {
        throw new Error('Failed to delete account')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete account'
      setError(errorMessage)
      console.error('❌ useEmailAccounts: Error deleting account:', err)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [user?.organizationId, isAuthenticated])

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
    updateAccountSettings,
    getAccountUsageStats,
    resetAccountUsage,
    getRotationPreview,
    bulkUpdateLimits,
    testConnection,
    deleteAccount,
    isUpdating
  }
}