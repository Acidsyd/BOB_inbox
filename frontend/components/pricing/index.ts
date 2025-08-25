// Pricing Components
export { PricingCard } from './PricingCard'
export { PlanToggle } from './PlanToggle'
export { PromotionBanner } from './PromotionBanner'
export { FeatureComparison } from './FeatureComparison'
export { ProgressTracker } from './ProgressTracker'
export { SubscriptionModal } from './SubscriptionModal'

// Component Types
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

// Re-export billing types for convenience
export type {
  SubscriptionPlan,
  OrganizationSubscription,
  UsageStats,
  PaymentMethod,
  PromotionValidation,
  BillingContextType
} from '../../types/billing'