'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Zap,
  Crown,
  XCircle
} from 'lucide-react'
import { useSubscriptionStatus } from '../../hooks/useBilling'
import { formatPrice, formatDate, daysUntilPeriodEnd } from '../../lib/billing'
import { OrganizationSubscription, SubscriptionPlan } from '../../types/billing'

interface SubscriptionOverviewProps {
  isLoading?: boolean
}

export default function SubscriptionOverview({ isLoading }: SubscriptionOverviewProps) {
  const {
    subscription,
    isActive,
    isTrialing,
    isCanceled,
    isPastDue,
    daysUntilPeriodEnd: daysLeft,
    trialDaysLeft,
    hasSubscription
  } = useSubscriptionStatus()

  const getStatusBadge = () => {
    if (isLoading) return <Skeleton className="h-6 w-20" />
    
    if (isPastDue) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Past Due
        </Badge>
      )
    }
    
    if (isCanceled) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Canceled
        </Badge>
      )
    }
    
    if (isTrialing) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3" />
          Trial
        </Badge>
      )
    }
    
    if (isActive) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline">
        No Subscription
      </Badge>
    )
  }

  const getStatusIcon = () => {
    if (isPastDue) return <XCircle className="h-5 w-5 text-red-500" />
    if (isCanceled) return <AlertCircle className="h-5 w-5 text-red-500" />
    if (isTrialing) return <Clock className="h-5 w-5 text-blue-500" />
    if (isActive) return <CheckCircle className="h-5 w-5 text-green-500" />
    return <CreditCard className="h-5 w-5 text-gray-500" />
  }

  const getPlanName = () => {
    if (!subscription?.plan) return 'No Plan'
    return subscription.plan.name
  }

  const getPlanIcon = () => {
    if (!subscription?.plan) return null
    if (subscription.plan.plan_code.includes('full')) {
      return <Crown className="h-4 w-4 text-purple-500" />
    }
    return <Zap className="h-4 w-4 text-blue-500" />
  }

  const getBillingAmount = () => {
    if (!subscription) return null
    
    const isYearly = subscription.billing_cycle === 'yearly'
    const amount = isYearly ? subscription.yearly_price : subscription.monthly_price
    const cycle = isYearly ? 'year' : 'month'
    
    return `${formatPrice(amount, subscription.currency)} per ${cycle}`
  }

  const getNextBillingInfo = () => {
    if (!subscription?.current_period_end) return null
    
    const endDate = new Date(subscription.current_period_end)
    const days = daysUntilPeriodEnd(subscription)
    
    if (isCanceled) {
      return {
        label: 'Access ends',
        date: formatDate(subscription.current_period_end),
        days: days,
        urgency: days <= 7 ? 'high' : days <= 14 ? 'medium' : 'low'
      }
    }
    
    return {
      label: 'Next billing',
      date: formatDate(subscription.current_period_end),
      days: days,
      urgency: days <= 3 ? 'high' : days <= 7 ? 'medium' : 'low'
    }
  }

  const getTrialInfo = () => {
    if (!isTrialing || !subscription?.trial_end) return null
    
    return {
      endDate: formatDate(subscription.trial_end),
      daysLeft: trialDaysLeft,
      urgency: trialDaysLeft <= 3 ? 'high' : trialDaysLeft <= 7 ? 'medium' : 'low'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-500" />
              No Active Subscription
            </div>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Choose a plan to start sending cold emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">
              Get started with our Basic plan or upgrade to Full for advanced features
            </p>
            <Button className="w-full sm:w-auto">
              Choose a Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const billingInfo = getNextBillingInfo()
  const trialInfo = getTrialInfo()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Current Subscription
          </div>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Information */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {getPlanIcon()}
            <div>
              <h3 className="font-semibold text-lg">{getPlanName()}</h3>
              <p className="text-sm text-gray-600">{getBillingAmount()}</p>
            </div>
          </div>
          {subscription?.plan?.plan_code.includes('full') && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Most Popular
            </Badge>
          )}
        </div>

        {/* Trial Information */}
        {trialInfo && (
          <div className={`p-4 rounded-lg border-2 ${
            trialInfo.urgency === 'high' 
              ? 'bg-red-50 border-red-200' 
              : trialInfo.urgency === 'medium'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`h-4 w-4 ${
                trialInfo.urgency === 'high' ? 'text-red-600' :
                trialInfo.urgency === 'medium' ? 'text-yellow-600' : 'text-blue-600'
              }`} />
              <span className="font-medium">Trial Period</span>
            </div>
            <p className="text-sm">
              Your trial ends on {trialInfo.endDate}
              {trialInfo.daysLeft > 0 && (
                <span className="font-medium"> ({trialInfo.daysLeft} days left)</span>
              )}
            </p>
            {trialInfo.urgency !== 'low' && (
              <Button size="sm" className="mt-3">
                Upgrade Now
              </Button>
            )}
          </div>
        )}

        {/* Billing Information */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Next Billing/End Date */}
          {billingInfo && (
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">{billingInfo.label}</p>
                <p className="text-sm text-gray-600">{billingInfo.date}</p>
                {billingInfo.days > 0 && (
                  <p className={`text-xs ${
                    billingInfo.urgency === 'high' ? 'text-red-600' :
                    billingInfo.urgency === 'medium' ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    {billingInfo.days} days
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Billing Cycle */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <CreditCard className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Billing Cycle</p>
              <p className="text-sm text-gray-600 capitalize">
                {subscription?.billing_cycle || 'N/A'}
              </p>
              {subscription?.billing_cycle === 'yearly' && (
                <p className="text-xs text-green-600">Save 17%</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button variant="outline" size="sm">
            Change Plan
          </Button>
          <Button variant="outline" size="sm">
            Update Payment
          </Button>
          {!isCanceled && (
            <Button variant="outline" size="sm">
              Manage Billing
            </Button>
          )}
          {isCanceled && (
            <Button size="sm">
              Reactivate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}