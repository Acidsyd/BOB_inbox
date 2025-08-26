'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/context'
import type { 
  CampaignTrackingOverview, 
  TrackingAnalyticsSummary,
  CampaignEngagementRates 
} from '@/types/email-tracking'

// ================================
// TRACKING CONFIGURATION TYPES
// ================================

export interface TrackingConfiguration {
  // Basic tracking toggles
  enableOpenTracking: boolean
  enableClickTracking: boolean
  enableReplyTracking: boolean
  enableDeliverabilityTracking: boolean
  
  // Advanced tracking options
  pixelPosition: 'top' | 'middle' | 'bottom'
  botFilteringSensitivity: 'low' | 'medium' | 'high'
  trackingDomain?: string
  enableGeoTracking: boolean
  enableDeviceTracking: boolean
  
  // Privacy and compliance
  respectDoNotTrack: boolean
  anonymizeIpAddresses: boolean
  trackingConsentRequired: boolean
  dataRetentionDays: number
  
  // Performance settings
  realTimeUpdates: boolean
  batchProcessing: boolean
  maxEventsPerSecond: number
}

export interface CampaignTrackingStatus {
  campaignId: string
  isTrackingActive: boolean
  trackingHealth: 'healthy' | 'warning' | 'error'
  lastTrackingEvent?: string
  totalEvents: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
  trackingErrors: string[]
  pixelDeliveryRate: number
  linkTrackingRate: number
}

export interface AccountTrackingHealth {
  accountId: string
  email: string
  trackingScore: number // 0-100
  pixelDeliveryRate: number
  linkClickabilityRate: number
  trackingReliability: 'excellent' | 'good' | 'poor' | 'critical'
  lastTrackingTest?: string
  trackingIssues: string[]
  recommendedActions: string[]
}

interface UseTrackingConfigurationReturn {
  // Configuration management
  configuration: TrackingConfiguration
  updateConfiguration: (updates: Partial<TrackingConfiguration>) => void
  saveConfiguration: () => Promise<void>
  resetToDefaults: () => void
  
  // Campaign tracking status
  getCampaignTrackingStatus: (campaignId: string) => Promise<CampaignTrackingStatus | null>
  campaignTrackingStatuses: Record<string, CampaignTrackingStatus>
  
  // Account tracking health
  getAccountTrackingHealth: (accountId: string) => Promise<AccountTrackingHealth | null>
  accountTrackingHealths: Record<string, AccountTrackingHealth>
  refreshAccountHealth: (accountId?: string) => Promise<void>
  
  // Real-time tracking metrics
  getRealtimeMetrics: (campaignId: string) => Promise<CampaignEngagementRates | null>
  subscribeToTrackingUpdates: (campaignId: string) => void
  unsubscribeFromTrackingUpdates: (campaignId: string) => void
  
  // Tracking testing
  testTrackingSetup: (accountId: string) => Promise<boolean>
  validateTrackingDomain: (domain: string) => Promise<boolean>
  
  // State management
  isLoading: boolean
  isSaving: boolean
  error: string | null
  lastUpdated: string | null
}

// Default configuration
const DEFAULT_TRACKING_CONFIG: TrackingConfiguration = {
  enableOpenTracking: true,
  enableClickTracking: true,
  enableReplyTracking: true,
  enableDeliverabilityTracking: true,
  
  pixelPosition: 'bottom',
  botFilteringSensitivity: 'medium',
  enableGeoTracking: true,
  enableDeviceTracking: true,
  
  respectDoNotTrack: true,
  anonymizeIpAddresses: true,
  trackingConsentRequired: false,
  dataRetentionDays: 365,
  
  realTimeUpdates: true,
  batchProcessing: false,
  maxEventsPerSecond: 100
}

export function useTrackingConfiguration(): UseTrackingConfigurationReturn {
  const [configuration, setConfiguration] = useState<TrackingConfiguration>(DEFAULT_TRACKING_CONFIG)
  const [campaignTrackingStatuses, setCampaignTrackingStatuses] = useState<Record<string, CampaignTrackingStatus>>({})
  const [accountTrackingHealths, setAccountTrackingHealths] = useState<Record<string, AccountTrackingHealth>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // ================================
  // CONFIGURATION MANAGEMENT
  // ================================

  const fetchConfiguration = useCallback(async () => {
    // Wait for auth to finish loading before making API calls
    if (authLoading) {
      console.log('📊 useTrackingConfiguration: Waiting for auth to finish loading...')
      return
    }

    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useTrackingConfiguration: Not authenticated or missing organizationId', { isAuthenticated, orgId: user?.organizationId })
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      console.log('📊 useTrackingConfiguration: Fetching configuration for org:', user.organizationId)
      const response = await api.get('/tracking/configuration')
      
      if (response.data.configuration) {
        setConfiguration({ ...DEFAULT_TRACKING_CONFIG, ...response.data.configuration })
      }
      
      setLastUpdated(new Date().toISOString())
      console.log('📊 useTrackingConfiguration: Successfully fetched configuration')
    } catch (err: any) {
      console.error('❌ useTrackingConfiguration: Error fetching tracking configuration:', err)
      setError(err.response?.data?.error || 'Failed to load tracking configuration')
    } finally {
      setIsLoading(false)
    }
  }, [user?.organizationId, isAuthenticated, authLoading])

  const updateConfiguration = useCallback((updates: Partial<TrackingConfiguration>) => {
    setConfiguration(prev => ({ ...prev, ...updates }))
  }, [])

  const saveConfiguration = useCallback(async () => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useTrackingConfiguration: Cannot save - not authenticated')
      return
    }

    setIsSaving(true)
    try {
      await api.post('/tracking/configuration', { configuration })
      setLastUpdated(new Date().toISOString())
      setError(null)
    } catch (err: any) {
      console.error('❌ useTrackingConfiguration: Error saving tracking configuration:', err)
      setError(err.response?.data?.error || 'Failed to save configuration')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [configuration, user?.organizationId, isAuthenticated])

  const resetToDefaults = useCallback(() => {
    setConfiguration(DEFAULT_TRACKING_CONFIG)
  }, [])

  // ================================
  // CAMPAIGN TRACKING STATUS
  // ================================

  const getCampaignTrackingStatus = useCallback(async (campaignId: string): Promise<CampaignTrackingStatus | null> => {
    try {
      const response = await api.get(`/tracking/campaigns/${campaignId}/status`)
      const status = response.data.status

      // Cache the result
      setCampaignTrackingStatuses(prev => ({
        ...prev,
        [campaignId]: status
      }))

      return status
    } catch (err: any) {
      console.error(`Error fetching tracking status for campaign ${campaignId}:`, err)
      return null
    }
  }, [])

  // ================================
  // ACCOUNT TRACKING HEALTH
  // ================================

  const getAccountTrackingHealth = useCallback(async (accountId: string): Promise<AccountTrackingHealth | null> => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useTrackingConfiguration: Cannot get account health - not authenticated')
      return null
    }

    try {
      console.log('📊 useTrackingConfiguration: Fetching tracking health for account:', accountId)
      const response = await api.get(`/tracking/accounts/${accountId}/health`)
      const health = response.data.health

      // Cache the result
      setAccountTrackingHealths(prev => ({
        ...prev,
        [accountId]: health
      }))

      return health
    } catch (err: any) {
      console.error(`❌ useTrackingConfiguration: Error fetching tracking health for account ${accountId}:`, err)
      return null
    }
  }, [isAuthenticated, user?.organizationId])

  const refreshAccountHealth = useCallback(async (accountId?: string) => {
    try {
      setError(null)
      
      if (accountId) {
        await getAccountTrackingHealth(accountId)
      } else {
        // Refresh all accounts
        const response = await api.get('/tracking/accounts/health')
        setAccountTrackingHealths(response.data.accounts || {})
      }
    } catch (err: any) {
      console.error('Error refreshing account health:', err)
      setError(err.response?.data?.error || 'Failed to refresh account health')
    }
  }, [getAccountTrackingHealth])

  // ================================
  // REAL-TIME METRICS
  // ================================

  const getRealtimeMetrics = useCallback(async (campaignId: string): Promise<CampaignEngagementRates | null> => {
    try {
      const response = await api.get(`/tracking/campaigns/${campaignId}/metrics/realtime`)
      return response.data.metrics
    } catch (err: any) {
      console.error(`Error fetching realtime metrics for campaign ${campaignId}:`, err)
      return null
    }
  }, [])

  const subscribeToTrackingUpdates = useCallback((campaignId: string) => {
    // Implementation would use WebSocket or Server-Sent Events
    console.log(`Subscribing to tracking updates for campaign ${campaignId}`)
  }, [])

  const unsubscribeFromTrackingUpdates = useCallback((campaignId: string) => {
    console.log(`Unsubscribing from tracking updates for campaign ${campaignId}`)
  }, [])

  // ================================
  // TRACKING TESTING
  // ================================

  const testTrackingSetup = useCallback(async (accountId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('📊 useTrackingConfiguration: Cannot test tracking - not authenticated')
      return false
    }

    try {
      console.log('📊 useTrackingConfiguration: Testing tracking setup for account:', accountId)
      const response = await api.post(`/tracking/accounts/${accountId}/test`)
      return response.data.success
    } catch (err: any) {
      console.error(`❌ useTrackingConfiguration: Error testing tracking setup for account ${accountId}:`, err)
      return false
    }
  }, [isAuthenticated, user?.organizationId])

  const validateTrackingDomain = useCallback(async (domain: string): Promise<boolean> => {
    try {
      const response = await api.post('/tracking/validate-domain', { domain })
      return response.data.isValid
    } catch (err: any) {
      console.error(`Error validating tracking domain ${domain}:`, err)
      return false
    }
  }, [])

  // ================================
  // INITIALIZATION
  // ================================

  useEffect(() => {
    fetchConfiguration()
  }, [fetchConfiguration])

  // Auto-save configuration changes (debounced)
  useEffect(() => {
    if (!lastUpdated) return // Skip initial load

    const saveTimeout = setTimeout(() => {
      saveConfiguration().catch(console.error)
    }, 2000)

    return () => clearTimeout(saveTimeout)
  }, [configuration]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Configuration management
    configuration,
    updateConfiguration,
    saveConfiguration,
    resetToDefaults,
    
    // Campaign tracking status
    getCampaignTrackingStatus,
    campaignTrackingStatuses,
    
    // Account tracking health
    getAccountTrackingHealth,
    accountTrackingHealths,
    refreshAccountHealth,
    
    // Real-time tracking metrics
    getRealtimeMetrics,
    subscribeToTrackingUpdates,
    unsubscribeFromTrackingUpdates,
    
    // Tracking testing
    testTrackingSetup,
    validateTrackingDomain,
    
    // State management
    isLoading,
    isSaving,
    error,
    lastUpdated
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

export function getTrackingHealthColor(health: AccountTrackingHealth['trackingReliability']) {
  switch (health) {
    case 'excellent': return 'text-green-600 bg-green-100'
    case 'good': return 'text-blue-600 bg-blue-100'
    case 'poor': return 'text-yellow-600 bg-yellow-100'
    case 'critical': return 'text-red-600 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export function getTrackingStatusIcon(status: CampaignTrackingStatus['trackingHealth']) {
  switch (status) {
    case 'healthy': return '✅'
    case 'warning': return '⚠️'
    case 'error': return '❌'
    default: return '⚪'
  }
}

export function calculateTrackingScore(
  pixelRate: number, 
  linkRate: number, 
  errorCount: number
): number {
  const baseScore = (pixelRate + linkRate) / 2
  const penalty = Math.min(errorCount * 5, 50) // Max 50 point penalty
  return Math.max(0, Math.min(100, baseScore - penalty))
}