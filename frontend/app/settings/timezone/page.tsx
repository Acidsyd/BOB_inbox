'use client'

import { useState } from 'react'
import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import AppLayout from '../../../components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Badge } from '../../../components/ui/badge'
import {
  Clock,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  MapPin,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { useTimezone } from '../../../contexts/TimezoneContext'

function TimezoneSettingsContent() {
  const {
    timezone,
    setTimezone,
    timezoneAbbreviation,
    isTimezoneDetected,
    refreshTimezone,
    timezoneInfo
  } = useTimezone()

  const [isChanging, setIsChanging] = useState(false)

  // Popular timezones organized by region
  const timezoneOptions = [
    {
      region: 'North America',
      zones: [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Toronto',
        'America/Vancouver'
      ]
    },
    {
      region: 'Europe',
      zones: [
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Europe/Rome',
        'Europe/Madrid',
        'Europe/Amsterdam',
        'Europe/Stockholm',
        'Europe/Zurich'
      ]
    },
    {
      region: 'Asia Pacific',
      zones: [
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Mumbai',
        'Asia/Dubai',
        'Asia/Singapore',
        'Asia/Hong_Kong',
        'Australia/Sydney',
        'Australia/Melbourne'
      ]
    }
  ]

  const handleTimezoneChange = async (newTimezone: string) => {
    if (newTimezone === 'auto') {
      setIsChanging(true)
      try {
        refreshTimezone()
      } finally {
        setIsChanging(false)
      }
    } else {
      setTimezone(newTimezone)
    }
  }

  const formatTimezone = (tz: string) => {
    return tz.replace('_', ' ').split('/').pop() || tz
  }

  const getCurrentTime = () => {
    try {
      return new Date().toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    } catch (error) {
      return 'Unable to display time'
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="mr-3">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </Link>
          <Clock className="h-6 w-6 text-purple-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timezone & Preferences</h1>
            <p className="text-gray-600">Manage your timezone settings and date display preferences</p>
          </div>
        </div>
      </div>

      {/* Current Timezone Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Current Timezone
              </CardTitle>
              <CardDescription>Your current timezone and local time</CardDescription>
            </div>
            <Badge variant={isTimezoneDetected ? "default" : "secondary"}>
              {isTimezoneDetected ? 'Auto-detected' : 'Manual'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">{timezone}</h3>
                <p className="text-sm text-gray-600">
                  {timezoneAbbreviation} • {getCurrentTime()}
                </p>
              </div>
              <div className="flex items-center">
                {isTimezoneDetected ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTimezone}
                  disabled={isChanging}
                >
                  {isChanging ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Timezone</CardTitle>
          <CardDescription>Choose your timezone or let the system auto-detect it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Auto-detect timezone
                    </div>
                  </SelectItem>
                  {timezoneOptions.map((region) => (
                    <div key={region.region}>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded mt-2">
                        {region.region}
                      </div>
                      {region.zones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          <div className="flex items-center justify-between w-full">
                            <span>{formatTimezone(tz)}</span>
                            <span className="text-xs text-gray-500 ml-2">{tz}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Timezone Impact</p>
                  <p className="text-blue-700">
                    Your timezone affects when emails are sent, campaign scheduling, and how dates are displayed throughout the application.
                    Campaign business hours and active days will be calculated based on your selected timezone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Display Preferences
          </CardTitle>
          <CardDescription>How dates and times are shown in the interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Date Format Examples</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Today:</span>
                    <span className="font-medium">2:30 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yesterday:</span>
                    <span className="font-medium">Yesterday</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">This year:</span>
                    <span className="font-medium">Dec 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other years:</span>
                    <span className="font-medium">Dec 15, 2023</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Campaign Scheduling</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business hours:</span>
                    <span className="font-medium">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active days:</span>
                    <span className="font-medium">Mon - Fri</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timezone:</span>
                    <span className="font-medium">{timezoneAbbreviation}</span>
                  </div>
                </div>
              </div>
            </div>

            {timezoneInfo && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Debug Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <div className="mb-1"><strong>Browser timezone:</strong> {timezoneInfo.browserTimezone}</div>
                    <div className="mb-1"><strong>UTC offset:</strong> {timezoneInfo.timezoneOffset} minutes</div>
                  </div>
                  <div>
                    <div className="mb-1"><strong>DST active:</strong> {timezoneInfo.isDST ? 'Yes' : 'No'}</div>
                    <div className="mb-1"><strong>Validation:</strong> {timezoneInfo.isValid ? 'Valid' : 'Invalid'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TimezoneSettingsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <TimezoneSettingsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}