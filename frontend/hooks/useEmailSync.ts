import { useState, useCallback } from 'react'
import { api } from '../lib/api'

export interface SyncResult {
  success: boolean
  provider: string
  syncedMessages?: number
  newMessages?: number
  updatedStatus?: number
  error?: string
  note?: string
  timestamp: string
}

export interface SyncStatus {
  organizationId: string
  totalMessages: number
  providerSummary: {
    [provider: string]: {
      [status: string]: number
    }
  }
  lastChecked: string
}

export interface ManualSyncResponse {
  success: boolean
  syncType: 'single_account' | 'all_accounts'
  accountId?: string
  accountCount?: number
  result?: SyncResult
  results?: Array<SyncResult & { accountId: string, email: string }>
  timestamp: string
}

export interface AutoSyncStatus {
  activeAccounts: number
  accounts: Record<string, {
    email: string
    interval: number
    startedAt: string
    lastSync: string | null
    status: 'active' | 'stopped'
    consecutiveErrors: number
    isActive: boolean
    lastResult?: {
      success: boolean
      newMessages: number
      updatedMessages: number
      syncTime: number
    }
    lastError?: {
      message: string
      timestamp: string
    }
  }>
  totalErrors: number
}

export interface AutoSyncHealth {
  status: 'healthy' | 'degraded' | 'error'
  activeAccounts: number
  healthyAccounts: number
  errorAccounts: number
  staleAccounts: number
  timestamp: string
}

export function useEmailSync() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncCompletedListeners, setSyncCompletedListeners] = useState<Set<(result: ManualSyncResponse) => void>>(new Set())
  
  // Auto sync states
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null)
  const [autoSyncHealth, setAutoSyncHealth] = useState<AutoSyncHealth | null>(null)
  const [isAutoSyncActive, setIsAutoSyncActive] = useState(false)

  // Trigger manual sync for all accounts
  const triggerManualSync = useCallback(async (accountId?: string): Promise<ManualSyncResponse> => {
    try {
      setSyncing(true)
      setError(null)
      
      console.log('🔄 Triggering manual sync...', accountId ? `Account: ${accountId}` : 'All accounts')
      
      const response = await api.post('/inbox/sync/manual', 
        accountId ? { accountId } : {}
      )
      
      console.log('✅ Manual sync completed:', response.data)
      setLastSync(new Date())
      
      // Notify all listeners that sync completed
      syncCompletedListeners.forEach(listener => {
        try {
          listener(response.data)
        } catch (error) {
          console.error('Error in sync completion listener:', error)
        }
      })
      
      return response.data
      
    } catch (err: any) {
      console.error('❌ Manual sync failed:', err)
      const errorMessage = err.response?.data?.error || 'Manual sync failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSyncing(false)
    }
  }, [])

  // Get sync status for organization
  const getSyncStatus = useCallback(async (): Promise<SyncStatus | null> => {
    try {
      console.log('📊 Getting sync status...')
      const response = await api.get('/inbox/sync/status')
      
      console.log('✅ Sync status retrieved')
      return response.data.syncStatus
      
    } catch (err: any) {
      console.error('❌ Error getting sync status:', err)
      return null
    }
  }, [])

  // Sync read/unread status for a message
  const syncReadStatus = useCallback(async (
    messageId: string, 
    isRead: boolean, 
    provider: string
  ): Promise<{ success: boolean, result?: any, error?: string }> => {
    try {
      console.log(`📖 Syncing read status: ${isRead ? 'READ' : 'UNREAD'} for message ${messageId}`)
      
      const response = await api.post('/inbox/sync/read-status', {
        messageId,
        isRead,
        provider
      })
      
      console.log('✅ Read status synced successfully')
      return { success: true, result: response.data }
      
    } catch (err: any) {
      console.error('❌ Read status sync failed:', err)
      const errorMessage = err.response?.data?.error || 'Read status sync failed'
      return { success: false, error: errorMessage }
    }
  }, [])

  // Check if sync is supported for a provider
  const isSyncSupported = useCallback((provider: string): boolean => {
    const supportedProviders = ['gmail', 'outlook']
    return supportedProviders.includes(provider.toLowerCase())
  }, [])

  // Get sync capabilities for a provider
  const getSyncCapabilities = useCallback((provider: string) => {
    const caps = {
      gmail: {
        readSync: true,
        sentSync: true,
        receivedSync: true,
        realTime: false
      },
      outlook: {
        readSync: false, // Not implemented yet
        sentSync: false, // Not implemented yet
        receivedSync: false, // Not implemented yet
        realTime: false
      },
      smtp: {
        readSync: false,
        sentSync: false,
        receivedSync: false,
        realTime: false
      }
    }
    
    return caps[provider.toLowerCase() as keyof typeof caps] || caps.smtp
  }, [])

  // Add sync completion listener
  const onSyncCompleted = useCallback((listener: (result: ManualSyncResponse) => void) => {
    setSyncCompletedListeners(prev => new Set([...prev, listener]))
    
    // Return cleanup function
    return () => {
      setSyncCompletedListeners(prev => {
        const newSet = new Set(prev)
        newSet.delete(listener)
        return newSet
      })
    }
  }, [])

  // Clear sync error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================================================
  // AUTOMATIC SYNC FUNCTIONS
  // ============================================================================

  // Start automatic sync for all accounts
  const startAutoSync = useCallback(async (): Promise<{ success: boolean, message: string, error?: string }> => {
    try {
      console.log('🚀 Starting automatic sync...')
      
      const response = await api.post('/inbox/sync/auto/start')
      
      console.log('✅ Automatic sync started:', response.data)
      setIsAutoSyncActive(true)
      
      // Refresh status after starting
      setTimeout(() => {
        getAutoSyncStatus()
        getAutoSyncHealth()
      }, 1000)
      
      return {
        success: true,
        message: response.data.message
      }
      
    } catch (err: any) {
      console.error('❌ Failed to start automatic sync:', err)
      const errorMessage = err.response?.data?.error || 'Failed to start automatic sync'
      setError(errorMessage)
      return {
        success: false,
        message: 'Failed to start automatic sync',
        error: errorMessage
      }
    }
  }, [])

  // Stop automatic sync for all accounts
  const stopAutoSync = useCallback(async (): Promise<{ success: boolean, message: string, error?: string }> => {
    try {
      console.log('⏹️ Stopping automatic sync...')
      
      const response = await api.post('/inbox/sync/auto/stop')
      
      console.log('✅ Automatic sync stopped:', response.data)
      setIsAutoSyncActive(false)
      
      // Refresh status after stopping
      setTimeout(() => {
        getAutoSyncStatus()
        getAutoSyncHealth()
      }, 1000)
      
      return {
        success: true,
        message: response.data.message
      }
      
    } catch (err: any) {
      console.error('❌ Failed to stop automatic sync:', err)
      const errorMessage = err.response?.data?.error || 'Failed to stop automatic sync'
      setError(errorMessage)
      return {
        success: false,
        message: 'Failed to stop automatic sync',
        error: errorMessage
      }
    }
  }, [])

  // Start automatic sync for specific account
  const startAccountAutoSync = useCallback(async (accountId: string): Promise<{ success: boolean, message: string, error?: string }> => {
    try {
      console.log(`🚀 Starting automatic sync for account: ${accountId}`)
      
      const response = await api.post(`/inbox/sync/auto/account/${accountId}/start`)
      
      console.log('✅ Account automatic sync started:', response.data)
      
      // Refresh status after starting
      setTimeout(() => {
        getAutoSyncStatus()
        getAutoSyncHealth()
      }, 1000)
      
      return {
        success: true,
        message: response.data.message
      }
      
    } catch (err: any) {
      console.error('❌ Failed to start account automatic sync:', err)
      const errorMessage = err.response?.data?.error || 'Failed to start account automatic sync'
      return {
        success: false,
        message: 'Failed to start account automatic sync',
        error: errorMessage
      }
    }
  }, [])

  // Stop automatic sync for specific account
  const stopAccountAutoSync = useCallback(async (accountId: string): Promise<{ success: boolean, message: string, error?: string }> => {
    try {
      console.log(`⏹️ Stopping automatic sync for account: ${accountId}`)
      
      const response = await api.post(`/inbox/sync/auto/account/${accountId}/stop`)
      
      console.log('✅ Account automatic sync stopped:', response.data)
      
      // Refresh status after stopping
      setTimeout(() => {
        getAutoSyncStatus()
        getAutoSyncHealth()
      }, 1000)
      
      return {
        success: true,
        message: response.data.message
      }
      
    } catch (err: any) {
      console.error('❌ Failed to stop account automatic sync:', err)
      const errorMessage = err.response?.data?.error || 'Failed to stop account automatic sync'
      return {
        success: false,
        message: 'Failed to stop account automatic sync',
        error: errorMessage
      }
    }
  }, [])

  // Get automatic sync status
  const getAutoSyncStatus = useCallback(async (): Promise<AutoSyncStatus | null> => {
    try {
      console.log('📊 Getting automatic sync status...')
      
      const response = await api.get('/inbox/sync/auto/status')
      const status = response.data as AutoSyncStatus
      
      setAutoSyncStatus(status)
      setIsAutoSyncActive(status.activeAccounts > 0)
      
      console.log('✅ Automatic sync status retrieved:', status)
      return status
      
    } catch (err: any) {
      console.error('❌ Error getting automatic sync status:', err)
      return null
    }
  }, [])

  // Get automatic sync health
  const getAutoSyncHealth = useCallback(async (): Promise<AutoSyncHealth | null> => {
    try {
      console.log('🏥 Getting automatic sync health...')
      
      const response = await api.get('/inbox/sync/auto/health')
      const health = response.data as AutoSyncHealth
      
      setAutoSyncHealth(health)
      
      console.log('✅ Automatic sync health retrieved:', health)
      return health
      
    } catch (err: any) {
      console.error('❌ Error getting automatic sync health:', err)
      return null
    }
  }, [])

  // Get sync intervals configuration  
  const getSyncIntervals = useCallback(async (): Promise<Record<string, number> | null> => {
    try {
      console.log('⏱️ Getting sync intervals...')
      
      const response = await api.get('/inbox/sync/auto/intervals')
      
      console.log('✅ Sync intervals retrieved:', response.data.intervals)
      return response.data.intervals
      
    } catch (err: any) {
      console.error('❌ Error getting sync intervals:', err)
      return null
    }
  }, [])

  // Toggle automatic sync (start/stop based on current state)
  const toggleAutoSync = useCallback(async (): Promise<{ success: boolean, message: string, error?: string }> => {
    if (isAutoSyncActive) {
      return await stopAutoSync()
    } else {
      return await startAutoSync()
    }
  }, [isAutoSyncActive, startAutoSync, stopAutoSync])

  return {
    // Manual sync state
    syncing,
    lastSync,
    error,
    
    // Auto sync state
    autoSyncStatus,
    autoSyncHealth,
    isAutoSyncActive,
    
    // Manual sync actions
    triggerManualSync,
    getSyncStatus,
    syncReadStatus,
    isSyncSupported,
    getSyncCapabilities,
    clearError,
    onSyncCompleted,
    
    // Auto sync actions
    startAutoSync,
    stopAutoSync,
    startAccountAutoSync,
    stopAccountAutoSync,
    getAutoSyncStatus,
    getAutoSyncHealth,
    getSyncIntervals,
    toggleAutoSync
  }
}

export default useEmailSync