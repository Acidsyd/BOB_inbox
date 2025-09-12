'use client'

import React, { useState } from 'react'
import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import AppLayout from '../../../components/layout/AppLayout'
import { Button } from '../../../components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Skeleton } from '../../../components/ui/skeleton'
import { 
  ArrowLeft, 
  CreditCard, 
  AlertTriangle, 
  RefreshCw,
  ExternalLink,
  Settings as SettingsIcon
} from 'lucide-react'
import Link from 'next/link'

// Billing Components
import SubscriptionOverview from '../../../components/billing/SubscriptionOverview'
import UsageMeters from '../../../components/billing/UsageMeters'
import PaymentMethods from '../../../components/billing/PaymentMethods'
import InvoiceHistory from '../../../components/billing/InvoiceHistory'
import BillingPortal from '../../../components/billing/BillingPortal'
import UpgradePrompts from '../../../components/billing/UpgradePrompts'
import UsageAnalytics from '../../../components/billing/UsageAnalytics'
// Removed enterprise billing dashboard for simplification

// Hooks
import { useBilling, useSubscriptionStatus } from '../../../hooks/useBilling'

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ReactNode
}

function TabButton({ active, onClick, children, icon }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700 border border-blue-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function BillingContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'payment' | 'invoices' | 'analytics' | 'portal' | 'enterprise'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { 
    subscription, 
    plans, 
    usage, 
    paymentMethods, 
    isLoading, 
    error,
    refreshSubscription,
    refreshUsage
  } = useBilling()
  
  const { 
    isActive, 
    isTrialing, 
    isCanceled, 
    isPastDue,
    hasSubscription 
  } = useSubscriptionStatus()

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        refreshSubscription(),
        refreshUsage()
      ])
    } catch (error) {
      console.error('Failed to refresh billing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Get priority alerts
  const getPriorityAlerts = () => {
    const alerts = []
    
    if (isPastDue) {
      alerts.push({
        type: 'error' as const,
        title: 'Payment Past Due',
        message: 'Your account payment is past due. Please update your payment method to avoid service interruption.',
        action: () => setActiveTab('payment'),
        actionLabel: 'Update Payment Method'
      })
    }
    
    if (isCanceled) {
      alerts.push({
        type: 'warning' as const,
        title: 'Subscription Canceled',
        message: 'Your subscription will end at the current period. Reactivate to continue using all features.',
        action: () => setActiveTab('portal'),
        actionLabel: 'Reactivate Subscription'
      })
    }
    
    if (usage && usage.emails_sent >= usage.emails_quota * 0.9) {
      alerts.push({
        type: 'warning' as const,
        title: 'Approaching Email Limit',
        message: `You've used ${Math.round((usage.emails_sent / usage.emails_quota) * 100)}% of your email quota this month.`,
        action: () => setActiveTab('usage'),
        actionLabel: 'View Usage Details'
      })
    }
    
    return alerts
  }

  const priorityAlerts = getPriorityAlerts()

  const tabs = [
    { 
      key: 'overview' as const, 
      label: 'Overview', 
      icon: <SettingsIcon className="h-4 w-4" />,
      count: priorityAlerts.length
    },
    { 
      key: 'enterprise' as const, 
      label: 'Enterprise Dashboard', 
      icon: <SettingsIcon className="h-4 w-4" />,
      badge: 'New'
    },
    { 
      key: 'usage' as const, 
      label: 'Usage & Quotas', 
      icon: <CreditCard className="h-4 w-4" />,
      count: usage && (usage.emails_sent >= usage.emails_quota * 0.8) ? 1 : 0
    },
    { 
      key: 'payment' as const, 
      label: 'Payment Methods', 
      icon: <CreditCard className="h-4 w-4" />,
      count: paymentMethods.length === 0 ? 1 : 0
    },
    { 
      key: 'invoices' as const, 
      label: 'Invoices', 
      icon: <CreditCard className="h-4 w-4" />
    },
    { 
      key: 'analytics' as const, 
      label: 'Analytics', 
      icon: <CreditCard className="h-4 w-4" />
    },
    { 
      key: 'portal' as const, 
      label: 'Billing Portal', 
      icon: <ExternalLink className="h-4 w-4" />
    }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Usage</h1>
            <p className="text-gray-600">Manage your subscription and view usage</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {hasSubscription && (
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-800' :
              isTrialing ? 'bg-blue-100 text-blue-800' :
              isPastDue ? 'bg-red-100 text-red-800' :
              isCanceled ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {subscription?.status?.charAt(0).toUpperCase() + (subscription?.status?.slice(1) || '')}
            </div>
          )}
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Billing Data</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              className="ml-3"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Priority Alerts */}
      {priorityAlerts.map((alert, index) => (
        <Alert key={index} variant={alert.type} className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>
            {alert.message}
            {alert.action && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={alert.action}
                className="ml-3"
              >
                {alert.actionLabel}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            icon={tab.icon}
          >
            {tab.label}
            {tab.count && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {tab.count}
              </span>
            )}
            {(tab as any).badge && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {(tab as any).badge}
              </span>
            )}
          </TabButton>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <SubscriptionOverview isLoading={isLoading} />
            <UpgradePrompts isLoading={isLoading} />
            <div className="grid gap-6 lg:grid-cols-2">
              <UsageMeters isLoading={isLoading} />
              <div className="space-y-6">
                <PaymentMethods isLoading={isLoading} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-6">
            <UsageMeters isLoading={isLoading} />
            <UsageAnalytics isLoading={isLoading} />
          </div>
        )}

        {activeTab === 'payment' && (
          <PaymentMethods isLoading={isLoading} />
        )}

        {activeTab === 'invoices' && (
          <InvoiceHistory isLoading={isLoading} />
        )}

        {activeTab === 'analytics' && (
          <UsageAnalytics isLoading={isLoading} />
        )}

        {activeTab === 'portal' && (
          <BillingPortal isLoading={isLoading} />
        )}

        {activeTab === 'enterprise' && (
          <EnterpriseBillingDashboard />
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading billing information...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <BillingContent />
      </AppLayout>
    </ProtectedRoute>
  )
}