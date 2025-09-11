'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle,
  Lock,
  Calendar,
  Globe
} from 'lucide-react'
import { PaymentMethod } from '../types/billing'
import { useBilling } from '../hooks/useBilling'

interface PaymentMethodsProps {
  isLoading?: boolean
}

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod
  isDefault?: boolean
  onSetDefault?: (id: string) => void
  onRemove?: (id: string) => void
  isUpdating?: boolean
}

function PaymentMethodCard({ 
  paymentMethod, 
  isDefault, 
  onSetDefault, 
  onRemove,
  isUpdating 
}: PaymentMethodCardProps) {
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    if (!onRemove || isDefault) return
    
    setIsRemoving(true)
    try {
      await onRemove(paymentMethod.id)
    } finally {
      setIsRemoving(false)
    }
  }

  const handleSetDefault = async () => {
    if (!onSetDefault || isDefault) return
    await onSetDefault(paymentMethod.id)
  }

  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase()
    if (brandLower === 'visa') return '💳'
    if (brandLower === 'mastercard') return '💳'
    if (brandLower === 'amex') return '💳'
    if (brandLower === 'discover') return '💳'
    return '💳'
  }

  const getBrandColor = (brand: string) => {
    const brandLower = brand.toLowerCase()
    if (brandLower === 'visa') return 'border-blue-200 bg-blue-50'
    if (brandLower === 'mastercard') return 'border-red-200 bg-red-50'
    if (brandLower === 'amex') return 'border-green-200 bg-green-50'
    return 'border-gray-200 bg-gray-50'
  }

  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isDefault ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-8 rounded border flex items-center justify-center text-xl ${
            getBrandColor(paymentMethod.card?.brand || 'unknown')
          }`}>
            {getBrandIcon(paymentMethod.card?.brand || 'unknown')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">
                {paymentMethod.card?.brand || 'Card'}
              </span>
              <span className="text-gray-600">
                •••• {paymentMethod.card?.last4}
              </span>
              {isDefault && (
                <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires {paymentMethod.card?.exp_month}/{paymentMethod.card?.exp_year}
              </span>
              {paymentMethod.card?.country && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {paymentMethod.card.country}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isDefault && onSetDefault && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSetDefault}
              disabled={isUpdating}
            >
              Set Default
            </Button>
          )}
          {!isDefault && onRemove && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving || isUpdating}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isRemoving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {paymentMethod.card?.funding && (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          {paymentMethod.card.funding.charAt(0).toUpperCase() + paymentMethod.card.funding.slice(1)} card
        </div>
      )}
    </div>
  )
}

export default function PaymentMethods({ isLoading }: PaymentMethodsProps) {
  const { paymentMethods } = useBilling()
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleAddPaymentMethod = async () => {
    setIsAddingCard(true)
    try {
      // Integrate with Stripe Elements or redirect to add payment method flow
      console.log('Add payment method flow')
    } finally {
      setIsAddingCard(false)
    }
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    setIsUpdating(true)
    try {
      console.log('Set default payment method:', paymentMethodId)
      // Implement set default logic
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    try {
      console.log('Remove payment method:', paymentMethodId)
      // Implement remove payment method logic
    } catch (error) {
      console.error('Failed to remove payment method:', error)
    }
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
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-8 rounded" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const defaultPaymentMethod = paymentMethods.find(pm => pm.metadata?.default === 'true') || paymentMethods[0]
  const otherPaymentMethods = paymentMethods.filter(pm => pm.id !== defaultPaymentMethod?.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddPaymentMethod}
            disabled={isAddingCard}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isAddingCard ? 'Adding...' : 'Add Card'}
          </Button>
        </CardTitle>
        <CardDescription>
          Manage your payment methods and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
            <p className="text-gray-500 mb-4">
              Add a payment method to start your subscription
            </p>
            <Button onClick={handleAddPaymentMethod} disabled={isAddingCard}>
              <Plus className="h-4 w-4 mr-2" />
              {isAddingCard ? 'Adding...' : 'Add Your First Card'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Default Payment Method */}
            {defaultPaymentMethod && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Default Payment Method</h4>
                <PaymentMethodCard
                  paymentMethod={defaultPaymentMethod}
                  isDefault={true}
                  onRemove={paymentMethods.length > 1 ? handleRemovePaymentMethod : undefined}
                  isUpdating={isUpdating}
                />
              </div>
            )}

            {/* Other Payment Methods */}
            {otherPaymentMethods.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Other Payment Methods</h4>
                <div className="space-y-3">
                  {otherPaymentMethods.map((pm) => (
                    <PaymentMethodCard
                      key={pm.id}
                      paymentMethod={pm}
                      isDefault={false}
                      onSetDefault={handleSetDefault}
                      onRemove={handleRemovePaymentMethod}
                      isUpdating={isUpdating}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Secure & Encrypted</AlertTitle>
              <AlertDescription>
                Your payment information is securely stored and encrypted by Stripe. 
                We never store your full card details on our servers.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  )
}