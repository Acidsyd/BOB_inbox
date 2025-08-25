'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WifiOff, RefreshCw, Home, Activity } from 'lucide-react'
import Link from 'next/link'
import { useOfflineQueue } from '@/hooks/useOffline'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const { queuedActions, queueCount, syncQueue, canSync } = useOfflineQueue()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (isOnline) {
      window.history.back()
    } else {
      window.location.reload()
    }
  }

  const handleSync = async () => {
    if (canSync) {
      await syncQueue()
      // Optionally navigate back or to dashboard
      window.location.href = '/dashboard'
    }
  }

  if (isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">Back Online!</CardTitle>
            <CardDescription>
              Your connection has been restored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queueCount > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-2">
                  You have {queueCount} queued action{queueCount !== 1 ? 's' : ''} waiting to sync.
                </p>
                <Button onClick={handleSync} className="w-full" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button onClick={handleRetry} className="flex-1">
                Continue
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">You're Offline</CardTitle>
          <CardDescription>
            Check your internet connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Offline features available */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Available Offline:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• View cached dashboard data</li>
              <li>• Browse recent campaigns</li>
              <li>• Create draft content</li>
              <li>• Access help documentation</li>
            </ul>
          </div>

          {/* Queued actions */}
          {queueCount > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-900 mb-2">
                Queued Actions ({queueCount})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {queuedActions.slice(0, 3).map((action) => (
                  <div key={action.id} className="text-xs text-yellow-800 bg-yellow-100 p-2 rounded">
                    {action.description}
                  </div>
                ))}
                {queueCount > 3 && (
                  <div className="text-xs text-yellow-700">
                    +{queueCount - 3} more actions queued
                  </div>
                )}
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                These will be executed when you reconnect.
              </p>
            </div>
          )}

          <div className="flex space-x-2">
            <Button onClick={handleRetry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Connection tips */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Connection Tips:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Check your WiFi or mobile data</li>
              <li>• Try moving to a different location</li>
              <li>• Restart your router if using WiFi</li>
              <li>• Check if other websites work</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}