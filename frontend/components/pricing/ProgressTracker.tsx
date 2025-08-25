'use client'

import React, { useEffect, useState } from 'react'
import { Users, Clock, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ProgressTrackerProps {
  current: number
  total: number
}

export function ProgressTracker({ current, total }: ProgressTrackerProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState('')
  
  const percentage = (current / total) * 100
  const remaining = total - current
  
  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => {
      setAnimatedProgress(percentage)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [percentage])
  
  useEffect(() => {
    // Calculate time left until March 31, 2025
    const calculateTimeLeft = () => {
      const endDate = new Date('2025-03-31T23:59:59')
      const now = new Date()
      const difference = endDate.getTime() - now.getTime()
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        
        if (days > 0) {
          return `${days} days`
        } else {
          return `${hours} hours`
        }
      }
      
      return 'Expired'
    }
    
    // Update countdown every hour
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 3600000)
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft())
    
    return () => clearInterval(timer)
  }, [])
  
  const getUrgencyColor = () => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-orange-600'
    return 'text-green-600'
  }
  
  const getProgressBarColor = () => {
    if (percentage >= 90) return 'from-red-500 to-red-600'
    if (percentage >= 70) return 'from-orange-500 to-orange-600'
    return 'from-green-500 to-green-600'
  }
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 border border-purple-200">
      <div className="text-center mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-4">
          <Clock className="w-4 h-4 mr-2" />
          LIMITED TIME: {timeLeft} remaining
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          🎉 Early Adopter Program
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Join the first 100 users to get our Full Plan for just €150/year instead of €300/year. 
          Lock in 50% savings forever with the EARLY100 promo code.
        </p>
      </div>
      
      {/* Progress Visualization */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{current}/100</div>
              <div className="text-sm text-gray-600">spots claimed</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-2xl font-bold ${getUrgencyColor()}`}>
              {remaining}
            </div>
            <div className="text-sm text-gray-600">spots left</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className={`h-4 rounded-full bg-gradient-to-r ${getProgressBarColor()} transition-all duration-2000 ease-out relative overflow-hidden`}
              style={{ width: `${animatedProgress}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-pulse" />
            </div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>0</span>
            <span className={`font-medium ${getUrgencyColor()}`}>
              {percentage.toFixed(1)}% filled
            </span>
            <span>100</span>
          </div>
        </div>
      </div>
      
      {/* Value Proposition */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">€150</div>
          <div className="text-sm text-gray-600">saved per year</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">50%</div>
          <div className="text-sm text-gray-600">discount forever</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">20K</div>
          <div className="text-sm text-gray-600">emails/month</div>
        </div>
      </div>
      
      {/* Testimonial/Social Proof */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <div className="text-gray-900 font-medium mb-2">
              "Finally, a cold email platform that doesn't charge per email. 
              OPhir's Gmail integration saves us hundreds every month."
            </div>
            <div className="text-sm text-gray-600">
              — Marcus R., Sales Director
            </div>
          </div>
        </div>
      </div>
      
      {/* Urgency Messaging */}
      <div className="text-center">
        {percentage >= 90 && (
          <div className="bg-red-100 text-red-700 rounded-lg p-4 mb-6">
            <div className="font-bold text-lg mb-2">⚡ FINAL SPOTS REMAINING!</div>
            <div className="text-sm">
              Only {remaining} spots left. This offer expires when we hit 100 users or March 31st, 2025.
            </div>
          </div>
        )}
        
        {percentage >= 70 && percentage < 90 && (
          <div className="bg-orange-100 text-orange-700 rounded-lg p-4 mb-6">
            <div className="font-bold text-lg mb-2">🔥 FILLING UP FAST!</div>
            <div className="text-sm">
              Over 70% claimed! Secure your 50% discount before spots run out.
            </div>
          </div>
        )}
        
        <Link href="/register?plan=full_yearly&promo=EARLY100">
          <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center mx-auto mb-4">
            Lock in 50% OFF - Code: EARLY100
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-center justify-center">
            ✓ 14-day free trial
          </div>
          <div className="flex items-center justify-center">
            ✓ No credit card required
          </div>
          <div className="flex items-center justify-center">
            ✓ Cancel anytime
          </div>
        </div>
      </div>
    </div>
  )
}