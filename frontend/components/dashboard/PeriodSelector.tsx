'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface PeriodSelectorProps {
  selectedPeriod: string
  onPeriodChange: (period: string) => void
  periodDisplay?: string
}

export default function PeriodSelector({ 
  selectedPeriod, 
  onPeriodChange,
  periodDisplay 
}: PeriodSelectorProps) {
  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' }
  ]

  const getCurrentMonthYear = () => {
    const now = new Date()
    return new Intl.DateTimeFormat('en-US', { 
      month: 'long', 
      year: 'numeric' 
    }).format(now)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    // For now, just trigger a custom period change
    // In full implementation, this would calculate prev/next month dates
    const now = new Date()
    
    if (direction === 'prev') {
      now.setMonth(now.getMonth() - 1)
    } else {
      now.setMonth(now.getMonth() + 1)
    }
    
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
    
    // For custom period navigation, we'll use a special format
    onPeriodChange(`custom:${startDate}:${endDate}`)
  }

  const formatPeriodDisplay = () => {
    if (periodDisplay) return periodDisplay
    
    switch (selectedPeriod) {
      case 'today':
        return new Intl.DateTimeFormat('en-US', { 
          month: 'long', 
          day: 'numeric',
          year: 'numeric' 
        }).format(new Date())
      case 'week':
        // Get Monday of current week
        const now = new Date()
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(now.setDate(diff))
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        
        return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'month':
        return getCurrentMonthYear()
      default:
        if (selectedPeriod.startsWith('custom:')) {
          const [, startStr, endStr] = selectedPeriod.split(':')
          const start = new Date(startStr)
          const end = new Date(endStr)
          
          if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
            return new Intl.DateTimeFormat('en-US', { 
              month: 'long', 
              year: 'numeric' 
            }).format(start)
          }
          
          return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        }
        return getCurrentMonthYear()
    }
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      {/* Period Buttons */}
      <div className="flex gap-2">
        {periods.map(period => (
          <Button
            key={period.key}
            variant={selectedPeriod === period.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange(period.key)}
            className="text-sm"
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Current Period Display with Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('prev')}
          className="p-1 h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2 min-w-[180px] justify-center">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900">
            {formatPeriodDisplay()}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('next')}
          className="p-1 h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}