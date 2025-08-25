'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingAPI } from '../lib/billing'
import {
  SubscriptionPlan,
  OrganizationSubscription,
  UsageStats,
  PaymentMethod,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  ValidatePromotionRequest,
  PromotionValidation,
  BillingContextType
} from '../types/billing'

// Query Keys
const BILLING_KEYS = {
  plans: ['billing', 'plans'] as const,
  subscription: ['billing', 'subscription'] as const,
  usage: ['billing', 'usage'] as const,
  usageHistory: (params?: any) => ['billing', 'usage', 'history', params] as const,
  paymentMethods: ['billing', 'payment-methods'] as const,
  invoices: (params?: any) => ['billing', 'invoices', params] as const,
  analytics: (params?: any) => ['billing', 'analytics', params] as const,
  validatePromo: (code: string, plan: string) => ['billing', 'validate-promo', code, plan] as const,
}

export function useBilling(): BillingContextType {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Get Plans
  const { 
    data: plansData, 
    isLoading: plansLoading, 
    error: plansError 
  } = useQuery({
    queryKey: BILLING_KEYS.plans,
    queryFn: async () => {
      const response = await billingAPI.getPlans()
      if (!response.success) throw new Error(response.error || 'Failed to fetch plans')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Get Subscription
  const { 
    data: subscriptionData, 
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSubscription
  } = useQuery({
    queryKey: BILLING_KEYS.subscription,
    queryFn: async () => {
      const response = await billingAPI.getSubscription()
      if (!response.success) throw new Error(response.error || 'Failed to fetch subscription')
      return response.data
    },
    retry: 1,
  })

  // Get Usage
  const { 
    data: usageData, 
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsage
  } = useQuery({
    queryKey: BILLING_KEYS.usage,
    queryFn: async () => {
      const response = await billingAPI.getUsage()
      if (!response.success) throw new Error(response.error || 'Failed to fetch usage')
      return response.data
    },
    retry: 1,
  })

  // Get Payment Methods
  const { 
    data: paymentMethodsData, 
    isLoading: paymentMethodsLoading,
    error: paymentMethodsError
  } = useQuery({
    queryKey: BILLING_KEYS.paymentMethods,
    queryFn: async () => {
      const response = await billingAPI.getPaymentMethods()
      if (!response.success) throw new Error(response.error || 'Failed to fetch payment methods')
      return response.data
    },
    retry: 1,
  })

  // Create Subscription Mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: CreateSubscriptionRequest) => {
      const response = await billingAPI.createSubscription(data)
      if (!response.success) throw new Error(response.error || 'Failed to create subscription')
      return response.data!.subscription
    },
    onSuccess: () => {
      // Invalidate and refetch subscription and usage data
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription })
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.usage })
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create subscription')
    }
  })

  // Update Subscription Mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: UpdateSubscriptionRequest) => {
      const response = await billingAPI.updateSubscription(data)
      if (!response.success) throw new Error(response.error || 'Failed to update subscription')
      return response.data!.subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription })
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.usage })
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update subscription')
    }
  })

  // Cancel Subscription Mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (immediate: boolean = false) => {
      const response = await billingAPI.cancelSubscription(immediate)
      if (!response.success) throw new Error(response.error || 'Failed to cancel subscription')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription })
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to cancel subscription')
    }
  })

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Combine loading states
  const isLoading = plansLoading || subscriptionLoading || usageLoading || paymentMethodsLoading

  // Combine and normalize errors
  const combinedError = error || 
    (plansError as Error)?.message || 
    (subscriptionError as Error)?.message || 
    (usageError as Error)?.message || 
    (paymentMethodsError as Error)?.message

  return {
    // Data
    subscription: subscriptionData?.subscription || null,
    plans: plansData?.plans || [],
    usage: usageData?.usage || null,
    paymentMethods: paymentMethodsData?.paymentMethods || [],
    
    // State
    isLoading,
    error: combinedError,
    
    // Actions
    refreshSubscription: useCallback(async () => {
      await refetchSubscription()
    }, [refetchSubscription]),
    
    refreshUsage: useCallback(async () => {
      await refetchUsage()
    }, [refetchUsage]),
    
    createSubscription: useCallback(async (request: CreateSubscriptionRequest) => {
      return createSubscriptionMutation.mutateAsync(request)
    }, [createSubscriptionMutation]),
    
    updateSubscription: useCallback(async (request: UpdateSubscriptionRequest) => {
      return updateSubscriptionMutation.mutateAsync(request)
    }, [updateSubscriptionMutation]),
    
    cancelSubscription: useCallback(async (immediate?: boolean) => {
      return cancelSubscriptionMutation.mutateAsync(immediate)
    }, [cancelSubscriptionMutation]),
    
    validatePromotion: useCallback(async (request: ValidatePromotionRequest) => {
      const response = await billingAPI.validatePromotion(request)
      if (!response.success) throw new Error(response.error || 'Failed to validate promotion')
      return response.data!.validation
    }, [])
  }
}

// Hook for validating promotion codes
export function usePromotionValidation() {
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<PromotionValidation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validatePromotion = useCallback(async (code: string, planCode: string) => {
    if (!code.trim()) {
      setValidation(null)
      setError(null)
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      const response = await billingAPI.validatePromotion({ code, planCode })
      if (response.success) {
        setValidation(response.data!.validation)
      } else {
        setValidation({ valid: false, reason: response.error })
        setError(response.error || 'Invalid promotion code')
      }
    } catch (error: any) {
      setValidation({ valid: false, reason: 'Failed to validate code' })
      setError(error.message || 'Failed to validate promotion code')
    } finally {
      setIsValidating(false)
    }
  }, [])

  const clearValidation = useCallback(() => {
    setValidation(null)
    setError(null)
  }, [])

  return {
    validation,
    isValidating,
    error,
    validatePromotion,
    clearValidation
  }
}

// Hook for usage statistics
export function useUsageStats() {
  const { usage, refreshUsage } = useBilling()

  const getUsagePercentage = useCallback((used: number, quota: number): number => {
    return quota > 0 ? Math.round((used / quota) * 100) : 0
  }, [])

  const getUsageColor = useCallback((percentage: number): string => {
    if (percentage >= 90) return 'red'
    if (percentage >= 75) return 'yellow'
    if (percentage >= 50) return 'blue'
    return 'green'
  }, [])

  const isNearLimit = useCallback((used: number, quota: number, threshold = 0.8): boolean => {
    return quota > 0 && used / quota >= threshold
  }, [])

  return {
    usage,
    refreshUsage,
    getUsagePercentage,
    getUsageColor,
    isNearLimit
  }
}

// Hook for subscription status
export function useSubscriptionStatus() {
  const { subscription } = useBilling()

  const isActive = subscription?.status === 'active'
  const isTrialing = subscription?.status === 'trialing'
  const isCanceled = subscription?.cancel_at_period_end === true
  const isPastDue = subscription?.status === 'past_due'
  
  const daysUntilPeriodEnd = subscription?.current_period_end 
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  const trialDaysLeft = subscription?.trial_end
    ? Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    subscription,
    isActive,
    isTrialing,
    isCanceled,
    isPastDue,
    daysUntilPeriodEnd: Math.max(0, daysUntilPeriodEnd),
    trialDaysLeft: Math.max(0, trialDaysLeft),
    hasSubscription: !!subscription
  }
}