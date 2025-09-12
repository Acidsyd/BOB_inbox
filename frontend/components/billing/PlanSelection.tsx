'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Check, Crown, Zap, Infinity, Rocket } from 'lucide-react'
import { SubscriptionPlan, PromotionValidation } from '../../types/billing'
import { formatPrice } from '../../lib/billing'

interface PlanSelectionProps {
  selectedPlanCode: string
  plan?: SubscriptionPlan
  promotion?: PromotionValidation
  billingCycle: 'monthly' | 'yearly'
  isLoading?: boolean
}

const PLAN_ICONS = {
  basic: Zap,
  full: Crown,
  unlimited: Infinity,
  yearly: Rocket
}

const PLAN_COLORS = {
  basic: 'border-blue-200 bg-blue-50',
  full: 'border-purple-200 bg-purple-50',
  unlimited: 'border-yellow-200 bg-yellow-50',
  yearly: 'border-orange-200 bg-orange-50'
}

function getPlanFeatures(planCode: string): string[] {
  if (planCode.includes('basic')) {
    return [
      '8,000 emails/month',
      '10 email accounts',
      'Email warm-up included',
      'A/B testing (2 variants)',
      'Advanced analytics',
      'Basic support'
    ]
  }
  
  if (planCode.includes('full')) {
    return [
      '50,000 emails/month',
      '25 email accounts',
      'Unlimited warm-up',
      'A/B testing (unlimited)',
      'Advanced analytics',
      'LinkedIn automation',
      'White-label option',
      'Priority support'
    ]
  }
  
  if (planCode.includes('unlimited')) {
    return [
      'Unlimited emails/month',
      '100 email accounts',
      'Multi-client management',
      'A/B testing (unlimited)',
      'Advanced analytics',
      'LinkedIn automation',
      'API access',
      'Dedicated account manager',
      '24/7 phone support'
    ]
  }

  return []
}

function getPlanType(planCode: string): string {
  if (planCode.includes('basic')) return 'basic'
  if (planCode.includes('full')) return 'full'
  if (planCode.includes('unlimited')) return 'unlimited'
  if (planCode.includes('yearly')) return 'yearly'
  return 'basic'
}

function getPlanName(planCode: string): string {
  if (planCode === 'basic_monthly') return 'Basic Monthly'
  if (planCode === 'basic_yearly') return 'Basic Yearly'
  if (planCode === 'full_monthly') return 'Full Monthly'
  if (planCode === 'full_yearly') return 'Full Yearly'
  if (planCode === 'unlimited_monthly') return 'Unlimited Monthly'
  if (planCode === 'unlimited_yearly') return 'Unlimited Yearly'
  return planCode
}

export default function PlanSelection({
  selectedPlanCode,
  plan,
  promotion,
  billingCycle,
  isLoading = false
}: PlanSelectionProps) {
  const planType = getPlanType(selectedPlanCode)
  const IconComponent = PLAN_ICONS[planType as keyof typeof PLAN_ICONS] || Zap
  const planColor = PLAN_COLORS[planType as keyof typeof PLAN_COLORS] || PLAN_COLORS.basic
  
  const features = getPlanFeatures(selectedPlanCode)
  const planName = getPlanName(selectedPlanCode)
  
  // Calculate pricing
  const basePrice = billingCycle === 'monthly' 
    ? (plan?.price_monthly || 0)
    : (plan?.price_yearly || 0)
  
  const discountAmount = promotion?.valid && promotion.discount 
    ? (basePrice * promotion.discount / 100)
    : 0
  
  const finalPrice = basePrice - discountAmount
  const currency = plan?.currency || 'EUR'

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 ${planColor} relative overflow-hidden`}>
      {/* Plan Badge */}
      {selectedPlanCode.includes('unlimited') && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium transform rotate-12">
          Most Popular
        </div>
      )}
      
      {selectedPlanCode.includes('yearly') && promotion?.valid && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold transform rotate-12 animate-pulse">
          {promotion.discount}% OFF
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${planColor.replace('bg-', 'bg-').replace('50', '100')}`}>
            <IconComponent className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <div className="text-lg font-bold">{planName}</div>
            <div className="text-sm text-gray-600 font-normal">
              Selected plan for your subscription
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pricing */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            {discountAmount > 0 && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(basePrice, currency)}
              </span>
            )}
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(finalPrice, currency)}
            </span>
            <span className="text-gray-600">
              /{billingCycle === 'monthly' ? 'month' : 'year'}
            </span>
          </div>
          
          {discountAmount > 0 && (
            <div className="text-sm text-green-600 font-medium">
              Save {formatPrice(discountAmount, currency)} with {promotion?.code}
            </div>
          )}
          
          {billingCycle === 'yearly' && !promotion?.valid && (
            <div className="text-sm text-green-600 font-medium">
              Billed yearly - Save {formatPrice(basePrice * 2, currency)} vs monthly
            </div>
          )}
        </div>

        {/* Features */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">What's included:</h4>
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Promotional Info */}
        {promotion?.valid && promotion.description && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                PROMO: {promotion.code}
              </Badge>
              <span className="text-gray-700">{promotion.description}</span>
            </div>
          </div>
        )}

        {/* Trial Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">14-day free trial included</div>
            <div>Try all features risk-free. Cancel anytime during trial.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}