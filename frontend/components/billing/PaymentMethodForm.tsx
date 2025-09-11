'use client'

import React, { useState } from 'react'
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  CardElement
} from '@stripe/react-stripe-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { CreditCard, Lock, AlertCircle } from 'lucide-react'

interface PaymentMethodFormProps {
  onPaymentMethodCreated: (paymentMethodId: string) => void
  onError: (error: string) => void
  isLoading?: boolean
  showBillingAddress?: boolean
}

interface BillingAddress {
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#374151',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#9CA3AF',
      },
      iconColor: '#6B7280',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
  hidePostalCode: true,
}

export default function PaymentMethodForm({
  onPaymentMethodCreated,
  onError,
  isLoading = false,
  showBillingAddress = true
}: PaymentMethodFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [processing, setProcessing] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  })

  const [cardholder, setCardholder] = useState('')

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null)
    setCardComplete(event.complete)
  }

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    if (!cardComplete) {
      setCardError('Please enter complete card information')
      return
    }

    if (!cardholder.trim()) {
      setCardError('Please enter the cardholder name')
      return
    }

    if (showBillingAddress && (!billingAddress.line1 || !billingAddress.city || !billingAddress.postal_code)) {
      setCardError('Please complete the billing address')
      return
    }

    setProcessing(true)
    setCardError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setCardError('Card element not found')
      setProcessing(false)
      return
    }

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholder,
          ...(showBillingAddress && {
            address: {
              line1: billingAddress.line1,
              line2: billingAddress.line2 || undefined,
              city: billingAddress.city,
              state: billingAddress.state || undefined,
              postal_code: billingAddress.postal_code,
              country: billingAddress.country,
            }
          })
        },
      })

      if (error) {
        setCardError(error.message || 'Failed to create payment method')
        onError(error.message || 'Failed to create payment method')
      } else if (paymentMethod) {
        onPaymentMethodCreated(paymentMethod.id)
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred'
      setCardError(errorMessage)
      onError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
        <CardDescription>
          Enter your payment information to complete your subscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardholder">Cardholder Name</Label>
            <Input
              id="cardholder"
              type="text"
              placeholder="Full name on card"
              value={cardholder}
              onChange={(e) => setCardholder(e.target.value)}
              disabled={processing || isLoading}
              required
            />
          </div>

          {/* Card Information */}
          <div className="space-y-4">
            <Label>Card Information</Label>
            <div className="p-3 border rounded-lg bg-white">
              <CardElement 
                options={CARD_ELEMENT_OPTIONS}
                onChange={handleCardChange}
              />
            </div>
          </div>

          {/* Billing Address */}
          {showBillingAddress && (
            <div className="space-y-4">
              <Label>Billing Address</Label>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Address line 1"
                    value={billingAddress.line1}
                    onChange={(e) => handleBillingChange('line1', e.target.value)}
                    disabled={processing || isLoading}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Input
                    placeholder="Address line 2 (optional)"
                    value={billingAddress.line2}
                    onChange={(e) => handleBillingChange('line2', e.target.value)}
                    disabled={processing || isLoading}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="City"
                    value={billingAddress.city}
                    onChange={(e) => handleBillingChange('city', e.target.value)}
                    disabled={processing || isLoading}
                    required
                  />
                  <Input
                    placeholder="State"
                    value={billingAddress.state}
                    onChange={(e) => handleBillingChange('state', e.target.value)}
                    disabled={processing || isLoading}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Postal Code"
                    value={billingAddress.postal_code}
                    onChange={(e) => handleBillingChange('postal_code', e.target.value)}
                    disabled={processing || isLoading}
                    required
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={billingAddress.country}
                    onChange={(e) => handleBillingChange('country', e.target.value)}
                    disabled={processing || isLoading}
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="ES">Spain</option>
                    <option value="NL">Netherlands</option>
                    <option value="BE">Belgium</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {cardError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cardError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={!stripe || processing || isLoading || !cardComplete}
          >
            {processing || isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Save Payment Method
              </>
            )}
          </Button>

          {/* Security Notice */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Your payment is secure</div>
              <div>Your payment information is encrypted and processed by Stripe. We never store your card details.</div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}