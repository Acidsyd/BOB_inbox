'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { 
  Mail, 
  Users, 
  Target, 
  UserPlus, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  ArrowUp,
  CheckCircle
} from 'lucide-react'
import { useUsageStats, useBilling } from '../../hooks/useBilling'
import { formatDate } from '../../lib/billing'

interface UsageMetersProps {
  isLoading?: boolean
}

interface UsageMeterItemProps {
  icon: React.ReactNode
  title: string
  used: number
  quota: number
  remaining: number
  unit: string
  color: string
  description?: string
  showUpgrade?: boolean
  onUpgrade?: () => void
}

function UsageMeterItem({ 
  icon, 
  title, 
  used, 
  quota, 
  remaining, 
  unit,
  color,
  description,
  showUpgrade,
  onUpgrade 
}: UsageMeterItemProps) {
  const percentage = quota > 0 ? Math.round((used / quota) * 100) : 0
  const isOverLimit = used > quota
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const getProgressColor = () => {
    if (isOverLimit) return 'bg-red-500'
    if (isAtLimit) return 'bg-red-400'
    if (isNearLimit) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getTextColor = () => {
    if (isOverLimit || isAtLimit) return 'text-red-600'
    if (isNearLimit) return 'text-yellow-600'
    return 'text-gray-900'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isOverLimit || isAtLimit ? 'bg-red-100' :
            isNearLimit ? 'bg-yellow-100' : 'bg-gray-100'
          }`}>
            {icon}
          </div>
          <div>
            <h3 className="font-medium text-sm">{title}</h3>
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
        </div>
        <div className={`text-right ${getTextColor()}`}>
          <div className="font-semibold text-sm">
            {used.toLocaleString()} / {quota.toLocaleString()}
          </div>
          <div className="text-xs">
            {isOverLimit ? (
              <span className="text-red-600">Over by {(used - quota).toLocaleString()}</span>
            ) : (
              <span className="text-gray-500">{remaining.toLocaleString()} {unit} left</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={Math.min(percentage, 100)} 
          className="h-2"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{percentage}% used</span>
            {isNearLimit && (
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
            )}
            {isOverLimit && (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
          </div>
          {showUpgrade && isNearLimit && (
            <Button size="sm" variant="outline" onClick={onUpgrade} className="h-6 px-2 text-xs">
              Upgrade
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UsageMeters({ isLoading }: UsageMetersProps) {
  const { usage, getUsagePercentage } = useUsageStats()
  const { subscription, plans } = useBilling()

  const handleUpgrade = () => {
    // Navigate to upgrade page or show upgrade modal
    console.log('Navigate to upgrade')
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage & Quotas
          </CardTitle>
          <CardDescription>Track your monthly usage and quotas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No usage data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const emailPercentage = getUsagePercentage(usage.emails_sent, usage.emails_quota)
  const accountPercentage = getUsagePercentage(usage.email_accounts_connected, usage.email_accounts_quota)
  const campaignPercentage = getUsagePercentage(usage.campaigns_created, usage.campaigns_quota)
  const leadPercentage = getUsagePercentage(usage.leads_imported, usage.leads_quota)

  const hasWarnings = [emailPercentage, accountPercentage, campaignPercentage, leadPercentage]
    .some(p => p >= 80)

  const hasOverages = [
    usage.emails_sent > usage.emails_quota,
    usage.email_accounts_connected > usage.email_accounts_quota,
    usage.campaigns_created > usage.campaigns_quota,
    usage.leads_imported > usage.leads_quota
  ].some(Boolean)

  const periodEnd = usage.period_end ? new Date(usage.period_end) : null
  const daysUntilReset = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage & Quotas
            </div>
            <div className="text-right text-sm text-gray-500">
              {usage.period && (
                <div>Period: {usage.period}</div>
              )}
              {daysUntilReset > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Resets in {daysUntilReset} days
                </div>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Track your monthly usage across all features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Usage */}
          <UsageMeterItem
            icon={<Mail className="h-4 w-4" />}
            title="Emails Sent"
            used={usage.emails_sent}
            quota={usage.emails_quota}
            remaining={usage.emails_remaining}
            unit="emails"
            color="blue"
            description="Cold emails sent this month"
            showUpgrade={emailPercentage >= 80}
            onUpgrade={handleUpgrade}
          />

          {/* Email Accounts */}
          <UsageMeterItem
            icon={<Users className="h-4 w-4" />}
            title="Email Accounts"
            used={usage.email_accounts_connected}
            quota={usage.email_accounts_quota}
            remaining={usage.email_accounts_quota - usage.email_accounts_connected}
            unit="accounts"
            color="green"
            description="Connected email accounts"
            showUpgrade={accountPercentage >= 80}
            onUpgrade={handleUpgrade}
          />

          {/* Campaigns */}
          <UsageMeterItem
            icon={<Target className="h-4 w-4" />}
            title="Campaigns"
            used={usage.campaigns_created}
            quota={usage.campaigns_quota}
            remaining={usage.campaigns_quota - usage.campaigns_created}
            unit="campaigns"
            color="purple"
            description="Email campaigns created"
            showUpgrade={campaignPercentage >= 80}
            onUpgrade={handleUpgrade}
          />

          {/* Leads */}
          <UsageMeterItem
            icon={<UserPlus className="h-4 w-4" />}
            title="Leads Imported"
            used={usage.leads_imported}
            quota={usage.leads_quota}
            remaining={usage.leads_quota - usage.leads_imported}
            unit="leads"
            color="orange"
            description="Lead contacts imported"
            showUpgrade={leadPercentage >= 80}
            onUpgrade={handleUpgrade}
          />
        </CardContent>
      </Card>

      {/* Warning Alerts */}
      {hasOverages && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Usage Limit Exceeded</AlertTitle>
          <AlertDescription>
            You've exceeded one or more usage limits. Consider upgrading your plan to continue using all features.
            <div className="mt-3">
              <Button size="sm" onClick={handleUpgrade}>
                Upgrade Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasOverages && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Approaching Usage Limits</AlertTitle>
          <AlertDescription>
            You're close to reaching your usage limits. Upgrade your plan to avoid interruptions.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={handleUpgrade}>
                View Upgrade Options
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!hasWarnings && !hasOverages && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>All Systems Go</AlertTitle>
          <AlertDescription>
            Your usage is well within limits. Keep up the great work!
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}