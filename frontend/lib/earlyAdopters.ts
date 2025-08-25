/**
 * Early Adopter Tracking Utilities
 * Manages the EARLY100 promotion and progress tracking
 */

const EARLY_ADOPTER_LIMIT = 100
const PROMOTION_CODE = 'EARLY100'
const PROMOTION_END_DATE = '2025-03-31T23:59:59Z'

export interface EarlyAdopterStatus {
  current: number
  total: number
  remaining: number
  percentage: number
  isActive: boolean
  timeRemaining: string
  isUrgent: boolean
}

export interface EarlyAdopterConfig {
  code: string
  limit: number
  discount: number
  endDate: string
  description: string
}

// Mock data - in production, this would come from API
let mockEarlyAdoptersCount = 73

export const getEarlyAdopterConfig = (): EarlyAdopterConfig => ({
  code: PROMOTION_CODE,
  limit: EARLY_ADOPTER_LIMIT,
  discount: 50,
  endDate: PROMOTION_END_DATE,
  description: '50% off Full Plan for first 100 users'
})

export const getEarlyAdopterStatus = async (): Promise<EarlyAdopterStatus> => {
  // In production, this would be an API call
  // const response = await fetch('/api/billing/early-adopters')
  // const data = await response.json()
  
  const current = mockEarlyAdoptersCount
  const total = EARLY_ADOPTER_LIMIT
  const remaining = Math.max(0, total - current)
  const percentage = (current / total) * 100
  
  const endDate = new Date(PROMOTION_END_DATE)
  const now = new Date()
  const isActive = now < endDate && remaining > 0
  
  const timeRemaining = calculateTimeRemaining(endDate)
  const isUrgent = percentage >= 70 || remaining <= 30

  return {
    current,
    total,
    remaining,
    percentage,
    isActive,
    timeRemaining,
    isUrgent
  }
}

export const calculateTimeRemaining = (endDate: Date): string => {
  const now = new Date()
  const difference = endDate.getTime() - now.getTime()
  
  if (difference <= 0) {
    return 'Expired'
  }
  
  const days = Math.floor(difference / (1000 * 60 * 60 * 24))
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

export const getUrgencyLevel = (percentage: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (percentage >= 95) return 'critical'
  if (percentage >= 85) return 'high'
  if (percentage >= 70) return 'medium'
  return 'low'
}

export const getUrgencyMessage = (status: EarlyAdopterStatus): string => {
  const level = getUrgencyLevel(status.percentage)
  
  switch (level) {
    case 'critical':
      return `⚡ FINAL ${status.remaining} SPOTS! Offer expires in ${status.timeRemaining}`
    case 'high':
      return `🔥 ALMOST SOLD OUT! Only ${status.remaining} spots remaining`
    case 'medium':
      return `🚀 FILLING UP FAST! ${Math.round(status.percentage)}% claimed`
    default:
      return `🎉 EARLY ADOPTER SPECIAL - ${status.remaining} spots available`
  }
}

export const getProgressColor = (percentage: number): {
  bg: string
  text: string
  border: string
} => {
  if (percentage >= 90) {
    return {
      bg: 'from-red-500 to-red-600',
      text: 'text-red-600',
      border: 'border-red-200'
    }
  }
  if (percentage >= 70) {
    return {
      bg: 'from-orange-500 to-orange-600',
      text: 'text-orange-600',
      border: 'border-orange-200'
    }
  }
  return {
    bg: 'from-green-500 to-green-600',
    text: 'text-green-600',
    border: 'border-green-200'
  }
}

export const formatEarlyAdopterPrice = (originalPrice: number): {
  discounted: number
  savings: number
  percentage: number
} => {
  const config = getEarlyAdopterConfig()
  const discounted = originalPrice - (originalPrice * config.discount / 100)
  const savings = originalPrice - discounted
  
  return {
    discounted,
    savings,
    percentage: config.discount
  }
}

export const isEarlyAdopterEligible = (planCode: string): boolean => {
  // Early adopter promotion only applies to Full plan yearly
  return planCode === 'full_yearly'
}

export const generateEarlyAdopterURL = (planCode: string): string => {
  const baseURL = '/register'
  const params = new URLSearchParams({
    plan: planCode,
    promo: PROMOTION_CODE
  })
  
  return `${baseURL}?${params.toString()}`
}

// Mock function to simulate claiming a spot
export const claimEarlyAdopterSpot = async (): Promise<boolean> => {
  // In production, this would be handled by the subscription creation API
  if (mockEarlyAdoptersCount < EARLY_ADOPTER_LIMIT) {
    mockEarlyAdoptersCount++
    return true
  }
  return false
}

// Utility for tracking analytics
export const trackEarlyAdopterEvent = (event: string, data?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      event_category: 'early_adopter',
      ...data
    })
  }
  
  // Also log for debugging
  console.log(`Early Adopter Event: ${event}`, data)
}

// Social proof messages
export const getRandomTestimonial = (): {
  message: string
  author: string
  company?: string
} => {
  const testimonials = [
    {
      message: "Finally, a cold email platform that doesn't charge per email. Saving us hundreds every month!",
      author: "Marcus R.",
      company: "TechCorp"
    },
    {
      message: "The Gmail API integration is brilliant. Better deliverability and no hidden costs.",
      author: "Sarah K.",
      company: "Growth Agency"
    },
    {
      message: "50% cheaper than our previous tool with twice the features. No brainer decision.",
      author: "David L.",
      company: "StartupXYZ"
    },
    {
      message: "Love the transparent pricing. What you see is what you pay - no surprises.",
      author: "Emma T.",
      company: "Sales Pro"
    }
  ]
  
  return testimonials[Math.floor(Math.random() * testimonials.length)]
}

export default {
  getEarlyAdopterConfig,
  getEarlyAdopterStatus,
  calculateTimeRemaining,
  getUrgencyLevel,
  getUrgencyMessage,
  getProgressColor,
  formatEarlyAdopterPrice,
  isEarlyAdopterEligible,
  generateEarlyAdopterURL,
  claimEarlyAdopterSpot,
  trackEarlyAdopterEvent,
  getRandomTestimonial
}