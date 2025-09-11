'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Globe } from 'lucide-react'

export interface TimezoneOffset {
  label: string
  value: string // 'auto' | '+2' | '+1' | '0' | '-5' etc.
  hours: number // offset in hours from UTC
}

const TIMEZONE_OPTIONS: TimezoneOffset[] = [
  { label: 'Auto (Browser)', value: 'auto', hours: 0 },
  { label: 'UTC +2 (Rome)', value: '+2', hours: 2 },
  { label: 'UTC +1 (Berlin)', value: '+1', hours: 1 },
  { label: 'UTC (London)', value: '0', hours: 0 },
  { label: 'UTC -5 (EST)', value: '-5', hours: -5 },
  { label: 'UTC -8 (PST)', value: '-8', hours: -8 },
]

interface TimezoneSelectorProps {
  onTimezoneChange: (timezone: TimezoneOffset) => void
  className?: string
}

export function TimezoneSelector({ onTimezoneChange, className }: TimezoneSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneOffset>(TIMEZONE_OPTIONS[0])

  // Load saved timezone preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('user-timezone-offset')
    if (saved) {
      const savedOption = TIMEZONE_OPTIONS.find(opt => opt.value === saved)
      if (savedOption) {
        setSelectedTimezone(savedOption)
        onTimezoneChange(savedOption)
      }
    } else {
      // Auto-detect browser timezone offset
      const browserOffset = -(new Date().getTimezoneOffset() / 60)
      const autoOption = TIMEZONE_OPTIONS.find(opt => opt.value === 'auto') || TIMEZONE_OPTIONS[0]
      autoOption.hours = browserOffset
      setSelectedTimezone(autoOption)
      onTimezoneChange(autoOption)
    }
  }, [onTimezoneChange])

  const handleTimezoneChange = (timezone: TimezoneOffset) => {
    // For auto mode, calculate actual browser offset
    if (timezone.value === 'auto') {
      const browserOffset = -(new Date().getTimezoneOffset() / 60)
      timezone = { ...timezone, hours: browserOffset }
    }
    
    setSelectedTimezone(timezone)
    localStorage.setItem('user-timezone-offset', timezone.value)
    onTimezoneChange(timezone)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-1 ${className}`}>
          <Globe className="h-3 w-3" />
          <span className="hidden sm:inline">{selectedTimezone.label}</span>
          <span className="sm:hidden">🌍</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {TIMEZONE_OPTIONS.map((option) => (
          <DropdownMenuItem 
            key={option.value}
            onClick={() => handleTimezoneChange(option)}
            className={selectedTimezone.value === option.value ? 'bg-blue-50 text-blue-700' : ''}
          >
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              {option.value === 'auto' && (
                <span className="text-xs text-gray-500">
                  Currently: UTC{-(new Date().getTimezoneOffset() / 60) >= 0 ? '+' : ''}{-(new Date().getTimezoneOffset() / 60)}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}