import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface SyncHistoryEntry {
  id: string
  account_id: string
  provider: string
  sync_type: string
  status: 'completed' | 'failed' | 'in_progress'
  messages_processed?: number
  new_messages?: number
  updated_messages?: number
  duration_ms?: number
  error_message?: string
  started_at: string
  completed_at?: string
  created_at: string
}

interface SyncStats {
  timeframe: string
  summary: {
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    successRate: string
    totalMessages: number
    newMessages: number
    avgDuration: number
  }
  providers: Record<string, {
    total: number
    successful: number
    failed: number
    messages: number
  }>
  recentErrors: Array<{
    provider: string
    error: string
    timestamp: string
  }>
  timestamp: string
}

interface SyncAccountStatus {
  id: string
  email: string
  provider: string
  type: 'oauth2' | 'smtp'
  syncCapable: boolean
  bidirectionalSync: boolean
  lastSyncAt?: string
  lastSyncStatus: string
  lastSyncMessages?: number
  lastSyncDuration?: number
  lastSyncError?: string
  createdAt: string
}

interface TestSyncResult {
  success: boolean
  provider?: string
  syncedMessages?: number
  newMessages?: number
  updatedMessages?: number
  duration?: number
  timestamp?: string
}

export function useSyncMonitoring() {
  const [history, setHistory] = useState<SyncHistoryEntry[]>([])
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [accounts, setAccounts] = useState<SyncAccountStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSyncHistory = useCallback(async (options: {
    limit?: number
    offset?: number
    status?: string
    provider?: string
  } = {}) => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())
      if (options.status) params.append('status', options.status)
      if (options.provider) params.append('provider', options.provider)

      const response = await api.get(`/inbox/sync/history?${params.toString()}`)
      
      if (response.data.success) {
        setHistory(response.data.history || [])
      } else {
        throw new Error('Failed to fetch sync history')
      }
    } catch (err: any) {
      console.error('Error fetching sync history:', err)
      setError(err.message || 'Failed to fetch sync history')
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSyncStats = useCallback(async (timeframe: '1h' | '24h' | '7d' | '30d' = '24h') => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.get(`/inbox/sync/stats?timeframe=${timeframe}`)
      
      if (response.data.success) {
        setStats(response.data.stats)
      } else {
        throw new Error('Failed to fetch sync stats')
      }
    } catch (err: any) {
      console.error('Error fetching sync stats:', err)
      setError(err.message || 'Failed to fetch sync stats')
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSyncAccounts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.get('/inbox/sync/accounts')
      
      if (response.data.success) {
        setAccounts(response.data.accounts || [])
      } else {
        throw new Error('Failed to fetch sync accounts')
      }
    } catch (err: any) {
      console.error('Error fetching sync accounts:', err)
      setError(err.message || 'Failed to fetch sync accounts')
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const testSync = useCallback(async (accountId: string): Promise<TestSyncResult> => {
    try {
      console.log('🧪 Testing sync for account:', accountId)

      const response = await api.post(`/inbox/sync/test/${accountId}`)
      
      if (response.data.success) {
        console.log('✅ Sync test completed:', response.data.testResult)
        return {
          success: true,
          ...response.data.testResult
        }
      } else {
        throw new Error(response.data.error || 'Sync test failed')
      }
    } catch (err: any) {
      console.error('❌ Sync test failed:', err)
      return {
        success: false,
        error: err.message || 'Sync test failed'
      }
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchSyncHistory(),
      fetchSyncStats(),
      fetchSyncAccounts()
    ])
  }, [fetchSyncHistory, fetchSyncStats, fetchSyncAccounts])

  // Helper to get sync health status
  const getSyncHealth = useCallback(() => {
    if (!stats) return 'unknown'
    
    const successRate = parseFloat(stats.summary.successRate)
    if (successRate >= 95) return 'excellent'
    if (successRate >= 85) return 'good'
    if (successRate >= 70) return 'fair'
    return 'poor'
  }, [stats])

  // Helper to format duration
  const formatDuration = useCallback((ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }, [])

  // Helper to get status color
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'in_progress': return 'text-blue-600'
      case 'never': return 'text-gray-500'
      case 'not_supported': return 'text-gray-400'
      default: return 'text-gray-600'
    }
  }, [])

  return {
    // Data
    history,
    stats,
    accounts,
    isLoading,
    error,
    
    // Methods
    fetchSyncHistory,
    fetchSyncStats,
    fetchSyncAccounts,
    testSync,
    refreshAll,
    
    // Helpers
    getSyncHealth,
    formatDuration,
    getStatusColor
  }
}