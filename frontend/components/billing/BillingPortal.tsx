'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { 
  ExternalLink, 
  Settings, 
  CreditCard, 
  Receipt, 
  Shield,
  ArrowRight,
  Info
} from 'lucide-react'
import { billingAPI } from '../lib/billing'

interface BillingPortalProps {
  isLoading?: boolean
}

export default function BillingPortal({ isLoading }: BillingPortalProps) {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenBillingPortal = async () => {
    setIsRedirecting(true)
    setError(null)

    try {
      const returnUrl = `${window.location.origin}/settings/billing`
      const response = await billingAPI.createBillingPortalSession({ returnUrl })
      
      if (response.success && response.data?.portalSession?.url) {
        // Redirect to Stripe billing portal
        window.location.href = response.data.portalSession.url
      } else {
        throw new Error(response.error || 'Failed to create billing portal session')
      }
    } catch (error: any) {
      console.error('Failed to open billing portal:', error)
      setError(error.message || 'Failed to open billing portal. Please try again.')
    } finally {
      setIsRedirecting(false)
    }
  }

  const portalFeatures = [
    {
      icon: <CreditCard className="h-4 w-4" />,
      title: 'Update Payment Methods',
      description: 'Add, remove, or change your default payment method'
    },
    {
      icon: <Receipt className="h-4 w-4" />,
      title: 'Download Invoices',
      description: 'Access and download all your billing history and receipts'
    },
    {
      icon: <Settings className="h-4 w-4" />,
      title: 'Manage Subscription',
      description: 'Update billing details, change plans, or cancel your subscription'
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: 'Secure & Private',
      description: 'All changes are processed securely through Stripe'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Billing Portal
        </CardTitle>
        <CardDescription>
          Manage your subscription, payment methods, and billing details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Customer Self-Service Portal</AlertTitle>
          <AlertDescription>
            Our billing portal is powered by Stripe, providing you with secure access to 
            manage all aspects of your subscription and billing information.
          </AlertDescription>
        </Alert>

        {/* Features Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {portalFeatures.map((feature, index) => (
            <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{feature.title}</h4>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Action Button */}
        <div className="text-center pt-4 border-t">
          <Button 
            onClick={handleOpenBillingPortal}
            disabled={isRedirecting || isLoading}
            className="w-full sm:w-auto px-8"
          >
            {isRedirecting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Opening Portal...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Billing Portal
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-3">
            You'll be redirected to a secure Stripe portal where you can manage your billing details.
            You'll be returned to this page when you're done.
          </p>
        </div>

        {/* Security Note */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900 mb-1">Secure & Trusted</h4>
              <p className="text-sm text-green-700">
                Your billing portal is hosted by Stripe, a PCI-compliant payment processor 
                trusted by millions of businesses worldwide. Your payment information is 
                never stored on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => {
                // Add logic to navigate directly to payment methods or pre-select in portal
                handleOpenBillingPortal()
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Payment Method
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => {
                // Add logic to navigate directly to invoice history or pre-select in portal
                handleOpenBillingPortal()
              }}
            >
              <Receipt className="h-4 w-4 mr-2" />
              View Invoice History
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}