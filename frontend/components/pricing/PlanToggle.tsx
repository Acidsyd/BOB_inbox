'use client'

import React from 'react'
import { Check } from 'lucide-react'

interface PlanToggleProps {
  isYearly: boolean
  onToggle: (isYearly: boolean) => void
}

export function PlanToggle({ isYearly, onToggle }: PlanToggleProps) {
  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h3>
        <p className="text-gray-600">
          Save 20% with annual billing
        </p>
      </div>
      
      {/* Streamlined Toggle Switch */}
      <div className="relative flex items-center bg-gray-100 rounded-full p-1">
        <div
          className={`absolute top-1 bottom-1 bg-white rounded-full shadow-lg transition-all duration-300 ${
            isYearly ? 'left-1/2 right-1' : 'left-1 right-1/2'
          }`}
        />
        
        <button
          className={`relative z-10 px-4 md:px-6 py-2 md:py-3 text-sm font-medium rounded-full transition-colors duration-200 ${
            !isYearly 
              ? 'text-gray-900' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => onToggle(false)}
        >
          Monthly
        </button>
        
        <button
          className={`relative z-10 px-4 md:px-6 py-2 md:py-3 text-sm font-medium rounded-full transition-colors duration-200 flex items-center ${
            isYearly 
              ? 'text-gray-900' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => onToggle(true)}
        >
          Annual
          <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
            20% OFF
          </span>
        </button>
      </div>

      {/* Condensed Benefits */}
      {isYearly && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200 max-w-md">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-700 mb-2">
              Annual Savings Unlocked!
            </div>
            <div className="flex justify-center space-x-4 text-sm text-gray-700">
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-1" />
                <span>2 months free</span>
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-1" />
                <span>EARLY100 eligible</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}