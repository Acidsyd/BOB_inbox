import { 
  SubscriptionPlan,
  OrganizationSubscription,
  UsageStats,
  PaymentMethod,
  Invoice,
  BillingAnalytics,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  ValidatePromotionRequest,
  PromotionValidation,
  BillingPortalRequest,
  UsageHistoryRequest,
  ApiResponse,
  PaginatedResponse
} from '../types/billing'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

class BillingAPI {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${API_BASE}/api/billing${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options?.headers
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Plans
  async getPlans(): Promise<ApiResponse<{
    plans: SubscriptionPlan[]
    currency: string
    billingCycles: string[]
    promotions: Record<string, any>
  }>> {
    return this.request('/plans')
  }

  // Subscription Management
  async getSubscription(): Promise<ApiResponse<{
    hasSubscription: boolean
    subscription?: OrganizationSubscription
    trialStatus?: string
    message?: string
  }>> {
    return this.request('/subscription')
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<ApiResponse<{
    subscription: OrganizationSubscription
    message: string
  }>> {
    return this.request('/subscribe', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateSubscription(data: UpdateSubscriptionRequest): Promise<ApiResponse<{
    subscription: OrganizationSubscription
    message: string
  }>> {
    return this.request('/subscription', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async cancelSubscription(immediate = false): Promise<ApiResponse<{
    cancellation: any
    message: string
  }>> {
    return this.request(`/subscription?immediate=${immediate}`, {
      method: 'DELETE'
    })
  }

  // Usage Tracking
  async getUsage(): Promise<ApiResponse<{
    usage: UsageStats
    quotas: any
    period: string
    utilizationPercentage: number
  }>> {
    return this.request('/usage')
  }

  async getUsageHistory(params?: UsageHistoryRequest): Promise<ApiResponse<{
    history: UsageStats[]
    period: {
      start?: string
      end?: string
    }
    filters: {
      category?: string
      limit: number
    }
  }>> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.category) queryParams.append('category', params.category)

    const query = queryParams.toString()
    return this.request(`/usage/history${query ? `?${query}` : ''}`)
  }

  // Payment Methods
  async getPaymentMethods(): Promise<ApiResponse<{
    paymentMethods: PaymentMethod[]
  }>> {
    return this.request('/payment-methods')
  }

  async addPaymentMethod(paymentMethodId: string, setAsDefault = false): Promise<ApiResponse<{
    paymentMethod: PaymentMethod
    message: string
  }>> {
    return this.request('/payment-methods', {
      method: 'POST',
      body: JSON.stringify({
        paymentMethodId,
        setAsDefault
      })
    })
  }

  async removePaymentMethod(paymentMethodId: string): Promise<ApiResponse<{
    result: any
    message: string
  }>> {
    return this.request(`/payment-methods/${paymentMethodId}`, {
      method: 'DELETE'
    })
  }

  // Invoices
  async getInvoices(params?: {
    limit?: number
    startingAfter?: string
    endingBefore?: string
    status?: string
  }): Promise<ApiResponse<PaginatedResponse<Invoice> & {
    pagination: {
      limit: number
      startingAfter?: string
      endingBefore?: string
      hasMore: boolean
    }
  }>> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.startingAfter) queryParams.append('startingAfter', params.startingAfter)
    if (params?.endingBefore) queryParams.append('endingBefore', params.endingBefore)
    if (params?.status) queryParams.append('status', params.status)

    const query = queryParams.toString()
    return this.request(`/invoices${query ? `?${query}` : ''}`)
  }

  async getInvoice(invoiceId: string): Promise<ApiResponse<{
    invoice: Invoice
  }>> {
    return this.request(`/invoices/${invoiceId}`)
  }

  // Billing Portal
  async createBillingPortalSession(data: BillingPortalRequest): Promise<ApiResponse<{
    portalSession: { url: string }
    message: string
  }>> {
    return this.request('/portal', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Promotions
  async validatePromotion(data: ValidatePromotionRequest): Promise<ApiResponse<{
    validation: PromotionValidation
    message: string
  }>> {
    return this.request('/validate-promotion', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Analytics
  async getBillingAnalytics(params?: {
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<{
    analytics: BillingAnalytics
  }>> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const query = queryParams.toString()
    return this.request(`/analytics${query ? `?${query}` : ''}`)
  }

  // Advanced Analytics
  async getAdvancedUsageAnalytics(params?: {
    startDate?: string
    endDate?: string
    granularity?: 'hour' | 'day' | 'week' | 'month'
    includeForecasting?: boolean
    includeDrillDown?: boolean
  }): Promise<ApiResponse<{
    analytics: any // UsageAnalyticsData
  }>> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.granularity) queryParams.append('granularity', params.granularity)
    if (params?.includeForecasting) queryParams.append('includeForecasting', 'true')
    if (params?.includeDrillDown) queryParams.append('includeDrillDown', 'true')

    const query = queryParams.toString()
    return this.request(`/analytics/advanced${query ? `?${query}` : ''}`)
  }

  // Invoice Management
  async generateInvoice(params: {
    subscriptionId: string
    period?: { start: string; end: string }
    items?: Array<{ description: string; amount: number; quantity?: number }>
  }): Promise<ApiResponse<{
    invoice: any // Enhanced Invoice type
    downloadUrl: string
  }>> {
    return this.request('/invoices/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  async downloadInvoice(invoiceId: string, format: 'pdf' | 'csv' | 'xlsx'): Promise<ApiResponse<{
    downloadUrl: string
    expiresAt: string
  }>> {
    return this.request(`/invoices/${invoiceId}/download?format=${format}`)
  }

  async sendInvoiceEmail(invoiceId: string, email?: string): Promise<ApiResponse<{
    sent: boolean
    message: string
  }>> {
    return this.request(`/invoices/${invoiceId}/email`, {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  }

  // Tax Calculation
  async calculateTax(params: {
    amount: number
    country: string
    state?: string
    postalCode?: string
    customerType?: 'individual' | 'business'
    vatNumber?: string
  }): Promise<ApiResponse<{
    tax: {
      amount: number
      rate: number
      type: 'vat' | 'gst' | 'sales_tax'
      jurisdiction: string
      exempt: boolean
    }
    total: number
  }>> {
    return this.request('/tax/calculate', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  async validateVatNumber(vatNumber: string, country: string): Promise<ApiResponse<{
    valid: boolean
    name?: string
    address?: string
    exemptFromVat: boolean
  }>> {
    return this.request('/tax/validate-vat', {
      method: 'POST',
      body: JSON.stringify({ vatNumber, country })
    })
  }

  // Multi-Currency Support
  async getCurrencyRates(baseCurrency = 'EUR'): Promise<ApiResponse<{
    rates: Record<string, number>
    lastUpdated: string
    supportedCurrencies: string[]
  }>> {
    return this.request(`/currency/rates?base=${baseCurrency}`)
  }

  async convertPrice(amount: number, from: string, to: string): Promise<ApiResponse<{
    convertedAmount: number
    rate: number
    lastUpdated: string
  }>> {
    return this.request('/currency/convert', {
      method: 'POST',
      body: JSON.stringify({ amount, from, to })
    })
  }

  // Advanced Subscription Management
  async pauseSubscription(subscriptionId: string, resumeDate?: string): Promise<ApiResponse<{
    subscription: any // OrganizationSubscription
    pausedUntil?: string
    message: string
  }>> {
    return this.request(`/subscription/${subscriptionId}/pause`, {
      method: 'POST',
      body: JSON.stringify({ resumeDate })
    })
  }

  async resumeSubscription(subscriptionId: string): Promise<ApiResponse<{
    subscription: any // OrganizationSubscription
    message: string
  }>> {
    return this.request(`/subscription/${subscriptionId}/resume`, {
      method: 'POST'
    })
  }

  async scheduleSubscriptionChange(params: {
    subscriptionId: string
    newPlanCode: string
    effectiveDate: string
    prorate?: boolean
  }): Promise<ApiResponse<{
    scheduledChange: any
    prorationAmount?: number
    message: string
  }>> {
    return this.request('/subscription/schedule-change', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  async addCredits(params: {
    subscriptionId: string
    amount: number
    reason: string
    expiresAt?: string
  }): Promise<ApiResponse<{
    credit: any
    newBalance: number
    message: string
  }>> {
    return this.request('/subscription/credits', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  async getSubscriptionCredits(subscriptionId: string): Promise<ApiResponse<{
    balance: number
    credits: Array<{
      id: string
      amount: number
      reason: string
      createdAt: string
      expiresAt?: string
      used: boolean
    }>
  }>> {
    return this.request(`/subscription/${subscriptionId}/credits`)
  }

  // Health Check
  async getHealth(): Promise<ApiResponse<{
    status: string
    timestamp: string
    services: Record<string, boolean>
    error?: string
  }>> {
    return this.request('/health')
  }
}

// Create singleton instance
export const billingAPI = new BillingAPI()

// Export enhanced analytics functions
export const usageAnalyticsAPI = {
  async getAdvancedAnalytics(params?: any) {
    return billingAPI.getAdvancedUsageAnalytics(params)
  },
  
  async exportData(format: 'csv' | 'xlsx' | 'pdf', data: any) {
    // This would typically call a backend endpoint
    console.log(`Exporting data in ${format} format:`, data)
    // For now, return a mock response
    return {
      success: true,
      data: {
        downloadUrl: `https://api.mailsender.com/exports/usage-analytics.${format}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    }
  }
}

// Helper functions for common operations
export const formatPrice = (amount: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount)
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const calculateSavings = (monthlyPrice: number, yearlyPrice: number): {
  amount: number
  percentage: number
} => {
  const annualMonthly = monthlyPrice * 12
  const savings = annualMonthly - yearlyPrice
  const percentage = Math.round((savings / annualMonthly) * 100)
  
  return {
    amount: savings,
    percentage
  }
}

export const getPlanBadge = (planCode: string): {
  label: string
  color: string
} => {
  if (planCode.includes('full')) {
    return { label: 'Most Popular', color: 'purple' }
  }
  if (planCode.includes('basic')) {
    return { label: 'Starter', color: 'blue' }
  }
  return { label: 'Plan', color: 'gray' }
}

export const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return 'red'
  if (percentage >= 75) return 'yellow'
  if (percentage >= 50) return 'blue'
  return 'green'
}

export const isSubscriptionActive = (subscription?: OrganizationSubscription | null): boolean => {
  return subscription?.status === 'active' && !subscription?.cancel_at_period_end
}

export const daysUntilPeriodEnd = (subscription?: OrganizationSubscription | null): number => {
  if (!subscription?.current_period_end) return 0
  
  const endDate = new Date(subscription.current_period_end)
  const now = new Date()
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

// Enhanced utility functions
export const formatCurrency = (amount: number, currency = 'EUR', locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount)
}

export const calculateProration = (params: {
  oldAmount: number
  newAmount: number
  daysRemaining: number
  totalDays: number
}): { prorationAmount: number; isCredit: boolean } => {
  const { oldAmount, newAmount, daysRemaining, totalDays } = params
  const dailyOld = oldAmount / totalDays
  const dailyNew = newAmount / totalDays
  const prorationAmount = (dailyNew - dailyOld) * daysRemaining
  
  return {
    prorationAmount: Math.abs(prorationAmount),
    isCredit: prorationAmount < 0
  }
}

export const getTaxDisplayName = (taxType: string, jurisdiction: string): string => {
  const taxTypes: Record<string, string> = {
    'vat': 'VAT',
    'gst': 'GST',
    'sales_tax': 'Sales Tax',
    'hst': 'HST'
  }
  
  return `${taxTypes[taxType] || 'Tax'} (${jurisdiction})`
}

export const getRecommendationPriority = (type: string): {
  color: string
  bgColor: string
  borderColor: string
} => {
  const priorities: Record<string, any> = {
    'high': {
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    'medium': {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    'low': {
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  }
  
  return priorities[type] || priorities['medium']
}

export const formatUsageMetric = (value: number, metric: string): string => {
  const formatters: Record<string, (val: number) => string> = {
    'emails_sent': (val) => `${val.toLocaleString()} emails`,
    'campaigns_created': (val) => `${val} campaigns`,
    'leads_imported': (val) => `${val.toLocaleString()} leads`,
    'quota_utilization': (val) => `${val}%`,
    'cost_per_email': (val) => `€${val.toFixed(3)}`,
    'growth_rate': (val) => `+${val.toFixed(1)}%`
  }
  
  return formatters[metric]?.(value) || value.toString()
}