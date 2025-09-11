'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../components/ui/toast'

interface OfflineAction {
  id: string
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
  timestamp: number
  description: string
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false)
  const [queuedActions, setQueuedActions] = useState<OfflineAction[]>([])
  const { addToast } = useToast()

  // Initialize online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      if (online && !isOnline) {
        addToast({
          title: 'Back online',
          description: 'Connection restored. Syncing queued actions...',
          type: 'success'
        })
        
        // Trigger background sync when coming back online
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then(registration => {
            return registration.sync.register('offline-actions')
          }).catch(console.error)
        }
      } else if (!online && isOnline) {
        addToast({
          title: 'Offline',
          description: 'You are currently offline. Some features may be limited.',
          type: 'info'
        })
      }
    }

    // Set initial status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration)
          setIsServiceWorkerReady(true)
          
          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'OFFLINE_ACTION_SUCCESS') {
              removeQueuedAction(event.data.action.id)
              addToast({
                title: 'Action completed',
                description: event.data.action.description,
                type: 'success'
              })
            }
          })
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error)
        })
    }

    // Load queued actions from localStorage
    loadQueuedActions()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [isOnline, addToast])

  // Load queued actions from localStorage
  const loadQueuedActions = useCallback(() => {
    try {
      const stored = localStorage.getItem('offline-actions')
      if (stored) {
        setQueuedActions(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load queued actions:', error)
    }
  }, [])

  // Save queued actions to localStorage
  const saveQueuedActions = useCallback((actions: OfflineAction[]) => {
    try {
      localStorage.setItem('offline-actions', JSON.stringify(actions))
      setQueuedActions(actions)
    } catch (error) {
      console.error('Failed to save queued actions:', error)
    }
  }, [])

  // Queue an action for offline execution
  const queueAction = useCallback((
    url: string, 
    method: string, 
    description: string,
    headers?: Record<string, string>,
    body?: string
  ) => {
    const action: OfflineAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      description
    }

    const updatedActions = [...queuedActions, action]
    saveQueuedActions(updatedActions)

    addToast({
      title: 'Action queued',
      description: `${description} will be executed when you're back online`,
      type: 'info'
    })

    return action.id
  }, [queuedActions, saveQueuedActions, addToast])

  // Remove action from queue
  const removeQueuedAction = useCallback((actionId: string) => {
    const updatedActions = queuedActions.filter(action => action.id !== actionId)
    saveQueuedActions(updatedActions)
  }, [queuedActions, saveQueuedActions])

  // Clear all queued actions
  const clearQueuedActions = useCallback(() => {
    saveQueuedActions([])
    localStorage.removeItem('offline-actions')
  }, [saveQueuedActions])

  // Execute queued actions manually
  const executeQueuedActions = useCallback(async () => {
    if (!isOnline || queuedActions.length === 0) return

    for (const action of queuedActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })

        if (response.ok) {
          removeQueuedAction(action.id)
          addToast({
            title: 'Action completed',
            description: action.description,
            type: 'success'
          })
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        console.error('Failed to execute queued action:', error)
        addToast({
          title: 'Action failed',
          description: `${action.description} - ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error'
        })
      }
    }
  }, [isOnline, queuedActions, removeQueuedAction, addToast])

  // Enhanced fetch that handles offline scenarios
  const offlineAwareFetch = useCallback(async (
    url: string,
    options: RequestInit & { 
      description?: string 
      queueWhenOffline?: boolean 
    } = {}
  ) => {
    const { description, queueWhenOffline = true, ...fetchOptions } = options

    if (!isOnline && queueWhenOffline && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT' || fetchOptions.method === 'DELETE')) {
      // Queue non-GET requests when offline
      queueAction(
        url,
        fetchOptions.method || 'GET',
        description || `${fetchOptions.method} request to ${url}`,
        fetchOptions.headers as Record<string, string>,
        fetchOptions.body as string
      )
      
      throw new Error('Action queued for offline execution')
    }

    try {
      const response = await fetch(url, fetchOptions)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      if (!isOnline) {
        addToast({
          title: 'Offline',
          description: 'Unable to complete action while offline',
          type: 'error'
        })
      }
      throw error
    }
  }, [isOnline, queueAction, addToast])

  return {
    isOnline,
    isServiceWorkerReady,
    queuedActions,
    queueAction,
    removeQueuedAction,
    clearQueuedActions,
    executeQueuedActions,
    offlineAwareFetch
  }
}

// Hook for offline queue management UI
export function useOfflineQueue() {
  const { queuedActions, clearQueuedActions, executeQueuedActions, isOnline } = useOffline()

  return {
    queuedActions,
    queueCount: queuedActions.length,
    hasQueuedActions: queuedActions.length > 0,
    clearQueue: clearQueuedActions,
    syncQueue: executeQueuedActions,
    canSync: isOnline && queuedActions.length > 0
  }
}