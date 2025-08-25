'use client'

import React, { useState, useEffect } from 'react'
import { X, Star, Clock, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface PromotionBannerProps {
  earlyAdoptersCount: number
}

export function PromotionBanner({ earlyAdoptersCount }: PromotionBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState('')
  
  useEffect(() => {
    // Calculate time left until March 31, 2025
    const calculateTimeLeft = () => {
      const endDate = new Date('2025-03-31T23:59:59')
      const now = new Date()
      const difference = endDate.getTime() - now.getTime()
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        
        return `${days}d ${hours}h ${minutes}m`
      }
      
      return 'Expired'
    }
    
    // Update countdown every minute
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 60000)
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft())
    
    return () => clearInterval(timer)
  }, [])
  
  const spotsLeft = 100 - earlyAdoptersCount
  const progressPercentage = (earlyAdoptersCount / 100) * 100
  
  if (!isVisible || spotsLeft <= 0) {
    return null
  }
  
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex items-center space-x-2">
              <div className="bg-white bg-opacity-25 rounded-full p-1">
                <Star className="w-4 h-4 text-yellow-300" />
              </div>
              <div className="font-semibold text-base">EARLY100 Special</div>
            </div>
            
            <div className="hidden md:flex items-center space-x-3 text-sm">
              <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                {spotsLeft} spots left
              </span>
              <span className="text-xs opacity-90">
                Ends: {timeLeft}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="font-bold text-lg">50% OFF</div>
              <div className="text-xs opacity-90">Full Plan</div>
            </div>
            
            <Link href="/register?plan=full_yearly&promo=EARLY100">
              <button className="bg-white text-orange-600 px-3 py-2 rounded-md font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center">
                Claim
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </Link>
            
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Simplified Progress Bar */}
        <div className="mt-2 bg-white bg-opacity-20 rounded-full h-1.5 hidden md:block">
          <div 
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Mobile Layout */}
        <div className="md:hidden mt-2 flex items-center justify-center text-xs">
          <span className="bg-white bg-opacity-20 px-2 py-1 rounded mr-2">
            {spotsLeft} left
          </span>
          <span>•</span>
          <span className="ml-2 opacity-90">
            {timeLeft} remaining
          </span>
        </div>
      </div>
    </div>
  )
}