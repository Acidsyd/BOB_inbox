'use client'

import React, { useState, useEffect } from 'react'
import { X, CreditCard, Lock, Check, AlertCircle, Star, Clock } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  emailLimit: number
  accountLimit: number
  features: string[]
}

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPlan: Plan | null
  isYearly: boolean
  promotionCode?: string
}

export function SubscriptionModal({ 
  isOpen, 
  onClose, 
  selectedPlan, 
  isYearly, 
  promotionCode 
}: SubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [promoCode, setPromoCode] = useState(promotionCode || '')
  const [promoValidation, setPromoValidation] = useState<{
    valid: boolean
    discount?: number
    message?: string
  }>({ valid: false })
  const [step, setStep] = useState<'summary' | 'payment' | 'processing'>('summary')

  useEffect(() => {
    if (promotionCode) {
      validatePromoCode(promotionCode)
    }
  }, [promotionCode])

  const validatePromoCode = async (code: string) => {
    if (!code || !selectedPlan) return

    try {
      const response = await fetch('/api/billing/validate-promotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          planCode: `${selectedPlan.id}_${isYearly ? 'yearly' : 'monthly'}`
        })
      })

      const data = await response.json()
      
      if (data.success && data.data.validation.valid) {
        setPromoValidation({
          valid: true,
          discount: data.data.validation.discount || 50,
          message: data.data.validation.description
        })
      } else {
        setPromoValidation({
          valid: false,
          message: data.data.validation.reason || 'Invalid promotion code'
        })
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoValidation({
        valid: false,
        message: 'Error validating promotion code'
      })
    }
  }

  const calculatePricing = () => {
    if (!selectedPlan) return { subtotal: 0, discount: 0, total: 0 }

    const subtotal = isYearly ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice
    let discount = 0

    if (promoValidation.valid && promoValidation.discount) {
      discount = (subtotal * promoValidation.discount) / 100
    }

    return {
      subtotal,
      discount,
      total: subtotal - discount
    }
  }

  const handleSubscribe = async () => {
    if (!selectedPlan) return

    setIsLoading(true)
    setError('')
    setStep('processing')

    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planCode: `${selectedPlan.id}_${isYearly ? 'yearly' : 'monthly'}`,
          promotionCode: promoValidation.valid ? promoCode : undefined,
          // In a real implementation, you'd collect payment method here
          paymentMethodId: 'pm_card_visa' // Mock payment method
        })
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to success page or dashboard
        window.location.href = '/dashboard?success=subscription_created'
      } else {
        throw new Error(data.error || 'Failed to create subscription')
      }
    } catch (error: any) {
      setError(error.message || 'Something went wrong. Please try again.')
      setStep('payment')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !selectedPlan) return null

  const pricing = calculatePricing()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Complete Your Subscription
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'summary' && (
            <div className="space-y-6">
              {/* Plan Summary */}
              <Card className="border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {selectedPlan.id === 'full' && <Star className="w-5 h-5 text-purple-600 mr-2" />}
                    {selectedPlan.name} Plan
                    {selectedPlan.id === 'full' && (
                      <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{selectedPlan.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">Email Volume</div>
                      <div className="text-gray-600">{selectedPlan.emailLimit.toLocaleString()}/month</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Email Accounts</div>
                      <div className="text-gray-600">{selectedPlan.accountLimit} accounts</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Promotion Code */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promotion Code (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g., EARLY100)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <Button
                    onClick={() => validatePromoCode(promoCode)}
                    className="btn-secondary"
                    disabled={!promoCode}
                  >
                    Apply
                  </Button>
                </div>
                
                {promoValidation.valid && (
                  <div className="mt-2 flex items-center text-green-600 text-sm">
                    <Check className="w-4 h-4 mr-1" />
                    {promoValidation.message || `${promoValidation.discount}% discount applied!`}
                  </div>
                )}
                
                {promoValidation.message && !promoValidation.valid && (
                  <div className="mt-2 flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {promoValidation.message}
                  </div>
                )}
              </div>

              {/* Pricing Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>{selectedPlan.name} Plan ({isYearly ? 'Annual' : 'Monthly'})</span>
                    <span>€{pricing.subtotal}</span>
                  </div>
                  
                  {pricing.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Promotion Discount ({promoValidation.discount}% off)</span>
                      <span>-€{pricing.discount}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>€{pricing.total}</span>
                    </div>
                    {isYearly && (
                      <div className="text-sm text-gray-600">
                        €{Math.round(pricing.total / 12)}/month when billed annually
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Early Adopter Special Notice */}
              {selectedPlan.id === 'full' && promoCode === 'EARLY100' && promoValidation.valid && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-900 mb-1">
                        🎉 Early Adopter Special
                      </div>
                      <div className="text-sm text-red-800">
                        You're one of the first 100 users! This 50% discount is locked in forever - 
                        you'll pay just €150/year even after renewals.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep('payment')}
                className="w-full btn-primary text-lg py-3"
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-purple-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Payment Information
                </h3>
                <p className="text-gray-600">
                  In a production environment, this would integrate with Stripe Elements
                  for secure payment processing.
                </p>
              </div>

              {/* Mock Payment Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center text-gray-600">
                  <Lock className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm">
                    Secure payment processing powered by Stripe
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={() => setStep('summary')}
                  className="flex-1 btn-secondary"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubscribe}
                  className="flex-1 btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : `Pay €${pricing.total}`}
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Processing Your Subscription
              </h3>
              <p className="text-gray-600">
                Please wait while we set up your account...
              </p>
            </div>
          )}

          {/* Trial Notice */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-4">
              <span>✓ 14-day free trial</span>
              <span>✓ Cancel anytime</span>
              <span>✓ No setup fees</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}