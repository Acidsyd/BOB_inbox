'use client'

import React from 'react'
import { Wifi, WifiOff, RefreshCw as Sync, Clock, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOfflineQueue } from '../../hooks/useOffline'

// Connection status indicator
export function ConnectionStatus({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = React.useState(true)
  const { queueCount, syncQueue, canSync } = useOfflineQueue()

  React.useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    
    setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  if (isOnline && queueCount === 0) {
    return (
      <div className={cn("flex items-center space-x-2 text-green-600", className)}>
        <div className="relative">
          <Wifi className="h-4 w-4" />
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span className="text-xs font-medium">Online</span>
      </div>
    )
  }

  if (isOnline && queueCount > 0) {
    return (
      <button
        onClick={canSync ? syncQueue : undefined}
        className={cn(
          "flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors",
          canSync && "cursor-pointer",
          className
        )}
        disabled={!canSync}
      >
        <div className="relative">
          <Sync className={cn("h-4 w-4", canSync && "animate-spin")} />
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full" />
        </div>
        <span className="text-xs font-medium">
          {queueCount} queued
        </span>
      </button>
    )
  }

  return (
    <div className={cn("flex items-center space-x-2 text-yellow-600", className)}>
      <div className="relative">
        <WifiOff className="h-4 w-4" />
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
      </div>
      <span className="text-xs font-medium">Offline</span>
      {queueCount > 0 && (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
          {queueCount}
        </span>
      )}
    </div>
  )
}

// Generic status indicator
interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'warning' | 'idle' | 'pending'
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showPulse?: boolean
  className?: string
}

export function StatusIndicator({ 
  status, 
  label, 
  size = 'md',
  showPulse = false,
  className 
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Loader2 className={cn(sizeClasses[size], "animate-spin")} />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          dotColor: 'bg-blue-500'
        }
      case 'success':
        return {
          icon: <CheckCircle className={sizeClasses[size]} />,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          dotColor: 'bg-green-500'
        }
      case 'error':
        return {
          icon: <XCircle className={sizeClasses[size]} />,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          dotColor: 'bg-red-500'
        }
      case 'warning':
        return {
          icon: <AlertCircle className={sizeClasses[size]} />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          dotColor: 'bg-yellow-500'
        }
      case 'pending':
        return {
          icon: <Clock className={sizeClasses[size]} />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          dotColor: 'bg-gray-500'
        }
      default: // idle
        return {
          icon: <div className={cn(sizeClasses[size], "rounded-full bg-gray-300")} />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          dotColor: 'bg-gray-400'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={cn("flex items-center space-x-2", config.color, className)}>
      <div className="relative">
        {config.icon}
        {showPulse && (
          <div className={cn(
            "absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse",
            config.dotColor
          )} />
        )}
      </div>
      {label && (
        <span className="text-xs font-medium">
          {label}
        </span>
      )}
    </div>
  )
}

// Progress status with percentage
interface ProgressStatusProps {
  percentage: number
  label?: string
  status?: 'active' | 'complete' | 'error'
  className?: string
}

export function ProgressStatus({ 
  percentage, 
  label, 
  status = 'active',
  className 
}: ProgressStatusProps) {
  const statusColors = {
    active: 'text-blue-600',
    complete: 'text-green-600',
    error: 'text-red-600'
  }

  const progressColors = {
    active: 'bg-blue-600',
    complete: 'bg-green-600',
    error: 'bg-red-600'
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <span className={cn("text-sm font-medium", statusColors[status])}>
            {label}
          </span>
        )}
        <span className={cn("text-sm font-mono", statusColors[status])}>
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300 ease-out",
            progressColors[status]
          )}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  )
}

// Health status indicator
interface HealthStatusProps {
  health: number // 0-100
  label?: string
  thresholds?: {
    good: number // default 80
    warning: number // default 60
  }
  className?: string
}

export function HealthStatus({ 
  health, 
  label = "Health",
  thresholds = { good: 80, warning: 60 },
  className 
}: HealthStatusProps) {
  const getHealthStatus = () => {
    if (health >= thresholds.good) return 'good'
    if (health >= thresholds.warning) return 'warning'
    return 'poor'
  }

  const healthStatus = getHealthStatus()
  
  const statusConfig = {
    good: {
      color: 'text-green-600',
      bg: 'bg-green-600',
      label: 'Excellent'
    },
    warning: {
      color: 'text-yellow-600', 
      bg: 'bg-yellow-600',
      label: 'Good'
    },
    poor: {
      color: 'text-red-600',
      bg: 'bg-red-600', 
      label: 'Poor'
    }
  }

  const config = statusConfig[healthStatus]

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
          <div 
            className={cn("text-xs font-bold", config.color)}
          >
            {Math.round(health)}%
          </div>
        </div>
        <div 
          className={cn("absolute inset-0 rounded-full border-2", config.bg)}
          style={{
            background: `conic-gradient(${config.bg} ${health * 3.6}deg, #e5e7eb 0deg)`
          }}
        />
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className={cn("text-xs", config.color)}>{config.label}</div>
      </div>
    </div>
  )
}

// Sync status component
interface SyncStatusProps {
  lastSync?: Date
  syncing?: boolean
  onSync?: () => void
  className?: string
}

export function SyncStatus({ 
  lastSync, 
  syncing = false, 
  onSync,
  className 
}: SyncStatusProps) {
  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <button
        onClick={onSync}
        disabled={syncing || !onSync}
        className={cn(
          "p-1 rounded-full transition-colors",
          syncing ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
        )}
      >
        <Sync className={cn("h-4 w-4", syncing && "animate-spin")} />
      </button>
      <div className="text-xs text-gray-500">
        {syncing ? (
          "Syncing..."
        ) : lastSync ? (
          `Last sync: ${getTimeAgo(lastSync)}`
        ) : (
          "Never synced"
        )}
      </div>
    </div>
  )
}