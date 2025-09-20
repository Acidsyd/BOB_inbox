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


export interface AutosyncStatus {
  isRunning: boolean
  isSyncing: boolean
  intervalMinutes: number
  nextSyncEstimate: string | null
  lastAutosync: {
    timestamp: string
    successCount: number
    errorCount: number
    durationMs: number
  } | null
}

export function useEmailSync() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncCompletedListeners, setSyncCompletedListeners] = useState<Set<(result: ManualSyncResponse) => void>>(new Set())
  const [autosyncStatus, setAutosyncStatus] = useState<AutosyncStatus | null>(null)

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

  // Get autosync status
  const getAutosyncStatus = useCallback(async (): Promise<AutosyncStatus | null> => {
    try {
      console.log('📊 Getting autosync status...')
      const response = await api.get('/inbox/sync/autosync-status')

      console.log('✅ Autosync status retrieved:', response.data.autosyncStatus)
      setAutosyncStatus(response.data.autosyncStatus)
      return response.data.autosyncStatus

    } catch (err: any) {
      console.error('❌ Error getting autosync status:', err)
      return null
    }
  }, [])


  return {
    // Manual sync state
    syncing,
    lastSync,
    error,

    // Autosync state
    autosyncStatus,

    // Manual sync actions
    triggerManualSync,
    getSyncStatus,
    syncReadStatus,
    isSyncSupported,
    getSyncCapabilities,
    clearError,
    onSyncCompleted,

    // Autosync actions
    getAutosyncStatus
  }
}

export default useEmailSync