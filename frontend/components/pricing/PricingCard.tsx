'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Star, Clock, Zap, Crown } from 'lucide-react'
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
  popular?: boolean
  icon: typeof Zap
}

interface PricingCardProps {
  plan: Plan
  isYearly: boolean
  isPopular?: boolean
  onSelect?: (planId: string, isYearly: boolean) => void
}

export function PricingCard({ plan, isYearly, isPopular = false, onSelect }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const Icon = plan.icon
  
  const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice
  const monthlyEquivalent = isYearly ? plan.yearlyPrice / 12 : plan.monthlyPrice
  const yearlyDiscount = plan.monthlyPrice * 12 - plan.yearlyPrice
  const discountPercentage = Math.round((yearlyDiscount / (plan.monthlyPrice * 12)) * 100)

  // Special early adopter pricing for Full plan
  const isFullPlan = plan.id === 'full'
  const earlyAdopterPrice = 150 // €150/year for Full plan
  const showEarlyAdopterPrice = isFullPlan && isYearly
  const finalPrice = showEarlyAdopterPrice ? earlyAdopterPrice : currentPrice
  const earlyAdopterSavings = isYearly ? plan.yearlyPrice - earlyAdopterPrice : 0

  const handleSelect = async () => {
    if (onSelect) {
      setIsLoading(true)
      try {
        onSelect(plan.id, isYearly)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Card className={`relative transition-all duration-300 hover:shadow-2xl group ${
      isPopular ? 'border-2 border-purple-500 shadow-2xl scale-105' : 'border border-gray-200 hover:border-purple-300'
    }`}>
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-lg">
            <Star className="w-4 h-4 mr-1" />
            Most Popular
          </div>
        </div>
      )}

      {/* Early Adopter Badge for Full Plan */}
      {showEarlyAdopterPrice && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            50% OFF
          </div>
        </div>
      )}

      <CardHeader className="pb-6">
        <div className="flex items-center mb-4">
          <Icon className={`w-10 h-10 mr-3 ${
            isPopular ? 'text-purple-600' : 'text-blue-600'
          }`} />
          <div>
            <CardTitle className="text-2xl mb-1">{plan.name}</CardTitle>
            <p className="text-gray-600 text-sm">{plan.description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-6 pb-6">
        {/* Pricing Section - Improved Visual Hierarchy */}
        <div className="mb-8">
          <div className="flex items-end mb-3">
            {showEarlyAdopterPrice && (
              <div className="text-xl text-gray-400 line-through mr-3 mb-2">
                €{plan.yearlyPrice}
              </div>
            )}
            <div className="text-5xl font-bold text-gray-900">
              €{finalPrice}
            </div>
            <div className="text-lg text-gray-600 ml-2 mb-2">
              {isYearly ? '/year' : '/month'}
            </div>
          </div>
          
          {/* Enhanced Promotion Messaging */}
          {showEarlyAdopterPrice && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4 border border-green-200">
              <div className="text-green-700 font-bold text-lg mb-1">
                Save €{earlyAdopterSavings} with EARLY100!
              </div>
              <div className="text-sm text-gray-600">
                Only €{Math.round(earlyAdopterPrice / 12)}/month • Limited to first 100 users
              </div>
            </div>
          )}
          
          {/* Standard Pricing Info */}
          {isYearly && !showEarlyAdopterPrice && yearlyDiscount > 0 && (
            <div className="bg-green-50 rounded-lg p-3 mb-3 border border-green-200">
              <div className="text-green-700 font-semibold">
                Save €{yearlyDiscount}/year ({discountPercentage}% off)
              </div>
            </div>
          )}
          
          {isYearly && !showEarlyAdopterPrice && (
            <div className="text-sm text-gray-600">
              €{Math.round(monthlyEquivalent)}/month billed annually
            </div>
          )}
          
          {!isYearly && (
            <div className="text-sm text-gray-600">
              €{plan.yearlyPrice}/year when billed annually
            </div>
          )}
        </div>

        {/* Streamlined Features List */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">What's included:</h4>
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <Check className="w-4 h-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Enhanced CTA Section */}
        <div className="space-y-4">
          {showEarlyAdopterPrice ? (
            <Link href="/register?plan=full_yearly&promo=EARLY100">
              <Button 
                className="w-full btn-primary text-lg py-4 font-bold group-hover:scale-105 transition-transform"
                disabled={isLoading}
                onClick={handleSelect}
              >
                {isLoading ? 'Processing...' : 'Claim 50% OFF Now'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link href={`/register?plan=${plan.id}_${isYearly ? 'yearly' : 'monthly'}`}>
              <Button 
                className={`w-full text-lg py-4 font-semibold ${
                  isPopular ? 'btn-primary group-hover:scale-105' : 'btn-secondary'
                } transition-transform`}
                disabled={isLoading}
                onClick={handleSelect}
              >
                {isLoading ? 'Processing...' : 'Start Free Trial'}
                {isPopular && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </Link>
          )}
          
          <div className="text-center py-2">
            <div className="text-xs text-gray-500 flex items-center justify-center space-x-4">
              <span className="flex items-center">
                <Check className="w-3 h-3 mr-1 text-green-500" />
                14-day trial
              </span>
              <span className="flex items-center">
                <Check className="w-3 h-3 mr-1 text-green-500" />
                No card required
              </span>
              <span className="flex items-center">
                <Check className="w-3 h-3 mr-1 text-green-500" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>

        {/* Improved Cost Comparison */}
        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 mb-2">Cost per 1,000 emails</div>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-2xl font-bold text-green-600">
                €{((finalPrice / (isYearly ? 12 : 1)) / (plan.emailLimit / 1000)).toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 border-l border-gray-300 pl-4">
                <div>Competitors:</div>
                <div className="text-red-600 font-semibold">€4-7</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}