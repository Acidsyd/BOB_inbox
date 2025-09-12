'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { RefreshCw, Activity, AlertTriangle, CheckCircle } from 'lucide-react'
import { useEmailSync } from '../../hooks/useEmailSync'

interface AutoSyncControlProps {
  className?: string
}

export function AutoSyncControl({ className = '' }: AutoSyncControlProps) {
  const {
    isAutoSyncActive,
    autoSyncStatus,
    autoSyncHealth,
    startAutoSync,
    stopAutoSync,
    getAutoSyncStatus,
    getAutoSyncHealth,
    toggleAutoSync
  } = useEmailSync()

  const [isToggling, setIsToggling] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Load initial status on mount
  useEffect(() => {
    const loadStatus = async () => {
      await getAutoSyncStatus()
      await getAutoSyncHealth()
    }
    
    loadStatus()

    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [getAutoSyncStatus, getAutoSyncHealth])

  const handleToggleSync = async () => {
    setIsToggling(true)
    try {
      const result = await toggleAutoSync()
      if (!result.success) {
        console.error('Failed to toggle sync:', result.error)
      }
    } catch (error) {
      console.error('Error toggling sync:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const formatInterval = (intervalMs: number): string => {
    const minutes = Math.floor(intervalMs / (1000 * 60))
    if (minutes < 60) {
      return `${minutes}m`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
  }

  const getHealthIcon = () => {
    if (!autoSyncHealth) return <Activity className="w-4 h-4 text-gray-400" />
    
    switch (autoSyncHealth.status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getHealthColor = () => {
    if (!autoSyncHealth) return 'text-gray-500'
    
    switch (autoSyncHealth.status) {
      case 'healthy':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className={`p-3 border rounded-lg bg-white ${className}`}>
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getHealthIcon()}
          <span className="font-medium text-sm">Smart Sync</span>
        </div>
        <Switch
          checked={isAutoSyncActive}
          onCheckedChange={handleToggleSync}
          disabled={isToggling}
          className="data-[state=checked]:bg-blue-600"
        />
      </div>

      {/* Status Information */}
      <div className="space-y-2">
        {/* Active Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${isAutoSyncActive ? 'text-green-600' : 'text-gray-500'}`}>
            {isToggling ? (
              <RefreshCw className="w-4 h-4 animate-spin inline" />
            ) : (
              isAutoSyncActive ? 'Active' : 'Inactive'
            )}
          </span>
        </div>

        {/* Account Count */}
        {autoSyncStatus && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Accounts:</span>
            <span className="font-medium text-gray-900">
              {autoSyncStatus.activeAccounts}
            </span>
          </div>
        )}

        {/* Health Status */}
        {autoSyncHealth && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Health:</span>
            <span className={`font-medium capitalize ${getHealthColor()}`}>
              {autoSyncHealth.status}
            </span>
          </div>
        )}

        {/* Errors Count */}
        {autoSyncStatus && autoSyncStatus.totalErrors > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Errors:</span>
            <span className="font-medium text-red-600">
              {autoSyncStatus.totalErrors}
            </span>
          </div>
        )}
      </div>

      {/* Details Toggle */}
      {autoSyncStatus && autoSyncStatus.activeAccounts > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-2 text-xs text-gray-600 hover:text-gray-800"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      )}

      {/* Detailed Account Information */}
      {showDetails && autoSyncStatus && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Account Details</h4>
          {Object.entries(autoSyncStatus.accounts).map(([accountId, account]) => (
            <div key={accountId} className="p-2 bg-gray-50 rounded text-xs space-y-1">
              <div className="font-medium text-gray-900 truncate">
                {account.email}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Interval:</span>
                <span className="text-gray-900">
                  {formatInterval(account.interval)}
                </span>
              </div>
              {account.lastSync && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="text-gray-900">
                    {new Date(account.lastSync).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {account.consecutiveErrors > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Errors:</span>
                  <span className="text-red-600">
                    {account.consecutiveErrors}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`capitalize ${account.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {account.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-3 pt-2 border-t">
        <p className="text-xs text-gray-500 leading-relaxed">
          Smart Sync automatically syncs emails based on account activity. 
          Campaign accounts sync every 1-2 minutes, others sync every 5-30 minutes.
        </p>
      </div>
    </div>
  )
}

export default AutoSyncControl