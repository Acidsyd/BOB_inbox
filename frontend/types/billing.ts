export interface SubscriptionPlan {
  id: string
  plan_code: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  currency: string
  emails_per_month: number
  email_accounts_limit: number
  campaigns_limit: number
  leads_limit: number
  features: Record<string, any>
  stripe_price_id_monthly?: string
  stripe_price_id_yearly?: string
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface OrganizationSubscription {
  id: string
  organization_id: string
  plan_id: string
  stripe_customer_id: string
  stripe_subscription_id?: string
  stripe_payment_method_id?: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  billing_cycle: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string
  trial_start?: string
  trial_end?: string
  monthly_price: number
  yearly_price: number
  currency: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan
}

export interface UsageStats {
  id: string
  organization_id: string
  period_month: number
  period_year: number
  period_start: string
  period_end: string
  emails_sent: number
  emails_quota: number
  emails_remaining: number
  overage_emails: number
  email_accounts_connected: number
  email_accounts_quota: number
  campaigns_created: number
  campaigns_quota: number
  active_campaigns: number
  leads_imported: number
  leads_quota: number
  last_reset_date: string
  auto_reset: boolean
  created_at: string
  updated_at: string
  period?: string
  utilizationPercentage?: number
}

export interface Promotion {
  id: string
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  max_uses?: number
  max_uses_per_customer: number
  current_uses: number
  valid_from: string
  valid_until?: string
  minimum_amount?: number
  applicable_plans: string[]
  first_time_only: boolean
  stripe_coupon_id?: string
  stripe_promotion_code_id?: string
  active: boolean
  created_at: string
}

export interface PromotionValidation {
  valid: boolean
  code?: string
  discount?: number
  description?: string
  reason?: string
  promotion?: Promotion
}

export interface PaymentMethod {
  id: string
  object: string
  card?: {
    brand: string
    country: string
    exp_month: number
    exp_year: number
    funding: string
    last4: string
  }
  created: number
  customer: string
  livemode: boolean
  metadata: Record<string, any>
  type: string
}

export interface Invoice {
  id: string
  object: string
  amount_due: number
  amount_paid: number
  amount_remaining: number
  currency: string
  customer: string
  description?: string
  hosted_invoice_url?: string
  invoice_pdf?: string
  lines: {
    data: Array<{
      id: string
      amount: number
      currency: string
      description?: string
      period: {
        start: number
        end: number
      }
      plan?: {
        id: string
        nickname?: string
      }
    }>
  }
  number?: string
  paid: boolean
  receipt_number?: string
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
  subscription?: string
  created: number
  due_date?: number
}

export interface PaymentHistory {
  id: string
  organization_id: string
  subscription_id?: string
  stripe_payment_intent_id?: string
  stripe_invoice_id?: string
  stripe_charge_id?: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'pending' | 'refunded'
  payment_method?: string
  description?: string
  invoice_pdf_url?: string
  receipt_url?: string
  failure_code?: string
  failure_message?: string
  retry_count: number
  payment_date?: string
  created_at: string
}

export interface BillingAnalytics {
  totalRevenue: number
  monthlyRecurringRevenue: number
  annualRecurringRevenue: number
  averageRevenuePerUser: number
  churnRate: number
  lifetimeValue: number
  paymentHistory: PaymentHistory[]
  usageTrends: Array<{
    period: string
    emails_sent: number
    quota_utilization: number
  }>
}

// Enhanced Usage Analytics Types
export interface UsageAnalyticsData {
  current: UsageStats
  historical: UsageStats[]
  trends: {
    daily: UsageTrendData[]
    weekly: UsageTrendData[]
    monthly: UsageTrendData[]
  }
  forecasting: {
    nextMonth: UsageForecast
    nextQuarter: UsageForecast
    recommendations: string[]
  }
  drillDown: {
    emailsByDomain: Array<{ domain: string; count: number; percentage: number }>
    campaignPerformance: Array<{ name: string; sent: number; opened: number; clicked: number }>
    accountUtilization: Array<{ account: string; sent: number; quota: number; utilization: number }>
  }
}

export interface UsageTrendData {
  period: string
  periodType: 'hour' | 'day' | 'week' | 'month'
  timestamp: string
  emails_sent: number
  emails_delivered: number
  emails_opened: number
  emails_clicked: number
  email_accounts_connected: number
  email_accounts_active: number
  campaigns_created: number
  campaigns_active: number
  leads_imported: number
  leads_processed: number
  quota_utilization: number
  cost_per_email: number
  revenue_generated?: number
}

export interface UsageForecast {
  predicted_emails: number
  predicted_accounts_needed: number
  predicted_cost: number
  confidence_level: number
  growth_rate: number
  seasonality_factor: number
  recommendations: Array<{
    type: 'upgrade' | 'optimize' | 'warning'
    message: string
    priority: 'high' | 'medium' | 'low'
    action?: string
  }>
}

export interface DrillDownFilter {
  dateRange: { start: string; end: string }
  metric: 'emails_sent' | 'accounts' | 'campaigns' | 'leads'
  dimension: 'domain' | 'campaign' | 'account' | 'time'
  aggregation: 'sum' | 'average' | 'count'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  hasMore: boolean
  limit: number
  startingAfter?: string
  endingBefore?: string
}

// Request Types
export interface CreateSubscriptionRequest {
  planCode: string
  paymentMethodId: string
  promotionCode?: string
  billingAddress?: {
    line1: string
    line2?: string
    city: string
    state?: string
    postal_code: string
    country: string
  }
}

export interface UpdateSubscriptionRequest {
  planCode?: string
  paymentMethodId?: string
  cancelAtPeriodEnd?: boolean
}

export interface ValidatePromotionRequest {
  code: string
  planCode: string
}

export interface BillingPortalRequest {
  returnUrl: string
}

export interface UsageHistoryRequest {
  startDate?: string
  endDate?: string
  limit?: number
  category?: 'emails_sent' | 'email_accounts_connected' | 'campaigns_created' | 'leads_imported'
}

export interface UsageAnalyticsRequest {
  startDate?: string
  endDate?: string
  granularity?: 'hour' | 'day' | 'week' | 'month'
  includeForecasting?: boolean
  includeDrillDown?: boolean
  filter?: DrillDownFilter
}

// Component Props Types
export interface PricingPlan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  emailLimit: number
  accountLimit: number
  features: string[]
  popular?: boolean
  icon: React.ComponentType<any>
}

export interface BillingContextType {
  subscription: OrganizationSubscription | null
  plans: SubscriptionPlan[]
  usage: UsageStats | null
  paymentMethods: PaymentMethod[]
  isLoading: boolean
  error: string | null
  refreshSubscription: () => Promise<void>
  refreshUsage: () => Promise<void>
  createSubscription: (request: CreateSubscriptionRequest) => Promise<OrganizationSubscription>
  updateSubscription: (request: UpdateSubscriptionRequest) => Promise<OrganizationSubscription>
  cancelSubscription: (immediate?: boolean) => Promise<any>
  validatePromotion: (request: ValidatePromotionRequest) => Promise<PromotionValidation>
}

// Utility Types
export type PlanCode = 'basic_monthly' | 'basic_yearly' | 'full_monthly' | 'full_yearly'
export type BillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'