'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  ArrowUp, 
  Zap, 
  Crown, 
  TrendingUp, 
  Users, 
  Mail,
  Target,
  Star,
  Gift,
  Clock,
  CheckCircle
} from 'lucide-react'
import { useBilling, useUsageStats } from '@/hooks/useBilling'
import { formatPrice, calculateSavings } from '@/lib/billing'

interface UpgradePromptsProps {
  isLoading?: boolean
}

export default function UpgradePrompts({ isLoading }: UpgradePromptsProps) {
  const { subscription, plans } = useBilling()
  const { usage, getUsagePercentage, isNearLimit } = useUsageStats()

  if (isLoading || !usage || !subscription) {
    return null
  }

  const currentPlan = subscription.plan
  if (!currentPlan) return null

  const isBasicPlan = currentPlan.plan_code.includes('basic')
  const isFullPlan = currentPlan.plan_code.includes('full')

  // Find upgrade options
  const fullPlans = plans.filter(p => p.plan_code.includes('full'))
  const recommendedPlan = fullPlans.find(p => 
    subscription.billing_cycle === 'yearly' ? p.plan_code.includes('yearly') : p.plan_code.includes('monthly')
  ) || fullPlans[0]

  // Check if user should see upgrade prompts
  const emailUsagePercent = getUsagePercentage(usage.emails_sent, usage.emails_quota)
  const accountUsagePercent = getUsagePercentage(usage.email_accounts_connected, usage.email_accounts_quota)
  const shouldPromptUpgrade = isBasicPlan && (emailUsagePercent >= 60 || accountUsagePercent >= 60)

  // Early adopter promotion check
  const hasEarlyAdopterDiscount = subscription.metadata?.promotion === 'EARLY100'

  if (isFullPlan && !hasEarlyAdopterDiscount) {
    // User already has full plan and no special promotions
    return null
  }

  const getUpgradeReasons = () => {
    const reasons = []
    
    if (isNearLimit(usage.emails_sent, usage.emails_quota, 0.6)) {
      reasons.push({
        icon: <Mail className="h-4 w-4" />,
        text: `You've used ${emailUsagePercent}% of your email quota`,
        urgency: emailUsagePercent >= 80 ? 'high' : 'medium'
      })
    }
    
    if (isNearLimit(usage.email_accounts_connected, usage.email_accounts_quota, 0.6)) {
      reasons.push({
        icon: <Users className="h-4 w-4" />,
        text: `${usage.email_accounts_connected}/${usage.email_accounts_quota} email accounts connected`,
        urgency: accountUsagePercent >= 80 ? 'high' : 'medium'
      })
    }

    if (usage.campaigns_created >= usage.campaigns_quota * 0.6) {
      reasons.push({
        icon: <Target className="h-4 w-4" />,
        text: `${usage.campaigns_created}/${usage.campaigns_quota} campaigns created`,
        urgency: usage.campaigns_created >= usage.campaigns_quota * 0.8 ? 'high' : 'medium'
      })
    }

    return reasons
  }

  const upgradeReasons = getUpgradeReasons()
  const hasHighUrgencyReasons = upgradeReasons.some(r => r.urgency === 'high')

  const getUpgradeBenefits = () => {
    if (!recommendedPlan || !currentPlan) return []

    return [
      {
        icon: <Mail className="h-4 w-4" />,
        text: `${(recommendedPlan.emails_per_month - currentPlan.emails_per_month).toLocaleString()} more emails/month`,
        highlight: true
      },
      {
        icon: <Users className="h-4 w-4" />,
        text: `${recommendedPlan.email_accounts_limit - currentPlan.email_accounts_limit} more email accounts`,
        highlight: true
      },
      {
        icon: <TrendingUp className="h-4 w-4" />,
        text: 'Advanced analytics & reporting',
        highlight: false
      },
      {
        icon: <Star className="h-4 w-4" />,
        text: 'Priority customer support',
        highlight: false
      }
    ]
  }

  const upgradeBenefits = getUpgradeBenefits()

  const getSavingsInfo = () => {
    if (!recommendedPlan) return null
    
    if (subscription.billing_cycle === 'yearly') {
      const savings = calculateSavings(recommendedPlan.price_monthly, recommendedPlan.price_yearly)
      return {
        amount: savings.amount,
        percentage: savings.percentage,
        period: 'year'
      }
    }
    
    return null
  }

  const savings = getSavingsInfo()

  const handleUpgrade = () => {
    // Navigate to upgrade page or show upgrade modal
    console.log('Navigate to upgrade:', recommendedPlan?.plan_code)
  }

  // Early adopter already on full plan
  if (isFullPlan && hasEarlyAdopterDiscount) {
    return (
      <Alert variant="success">
        <Gift className="h-4 w-4" />
        <AlertTitle>Early Adopter Benefits Active</AlertTitle>
        <AlertDescription>
          You're enjoying our Full Plan at the special early adopter price. 
          Thanks for being one of our first customers!
        </AlertDescription>
      </Alert>
    )
  }

  // Show upgrade prompt for basic plan users
  if (shouldPromptUpgrade || hasHighUrgencyReasons) {
    return (
      <div className="space-y-4">
        {/* Urgent Upgrade Alert */}
        {hasHighUrgencyReasons && (
          <Alert variant={hasHighUrgencyReasons ? "warning" : "info"}>
            <ArrowUp className="h-4 w-4" />
            <AlertTitle>
              {hasHighUrgencyReasons ? 'Approaching Usage Limits' : 'Consider Upgrading'}
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                {upgradeReasons.map((reason, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {reason.icon}
                    <span className={reason.urgency === 'high' ? 'font-medium' : ''}>{reason.text}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upgrade Recommendation Card */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <span>Upgrade to Full Plan</span>
              </div>
              <Badge variant="default" className="bg-purple-100 text-purple-800">
                Recommended
              </Badge>
            </CardTitle>
            <CardDescription>
              Get more emails, accounts, and advanced features to scale your outreach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits List */}
            <div className="grid gap-3 sm:grid-cols-2">
              {upgradeBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`p-1 rounded ${
                    benefit.highlight ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {benefit.icon}
                  </div>
                  <span className={`text-sm ${benefit.highlight ? 'font-medium text-purple-900' : 'text-gray-700'}`}>
                    {benefit.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Pricing Info */}
            {recommendedPlan && (
              <div className="bg-white/70 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">Full Plan</h4>
                    <p className="text-sm text-gray-600">
                      {recommendedPlan.emails_per_month.toLocaleString()} emails • {recommendedPlan.email_accounts_limit} accounts
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatPrice(
                        subscription.billing_cycle === 'yearly' 
                          ? recommendedPlan.price_yearly 
                          : recommendedPlan.price_monthly,
                        recommendedPlan.currency
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      per {subscription.billing_cycle === 'yearly' ? 'year' : 'month'}
                    </div>
                  </div>
                </div>

                {savings && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Save {formatPrice(savings.amount)} ({savings.percentage}%) with yearly billing</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="text-center">
              <Button onClick={handleUpgrade} size="lg" className="w-full sm:w-auto px-8">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Full Plan
                <ArrowUp className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Upgrade instantly • No downtime • Cancel anytime
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show early adopter promotion for existing users
  const earlyAdopterPromo = plans.find(p => (p as any).metadata?.promotion === 'early_adopter')
  if (earlyAdopterPromo && !hasEarlyAdopterDiscount) {
    return (
      <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-600" />
            Limited Time: Early Adopter Special
          </CardTitle>
          <CardDescription>
            Get Full Plan features at Basic Plan price - First 100 users only!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-700 mb-2">
              50% OFF First Year
            </div>
            <div className="text-lg">
              {formatPrice(150, 'EUR')}/year instead of {formatPrice(300, 'EUR')}/year
            </div>
            <Badge variant="destructive" className="mt-2">
              <Clock className="h-3 w-3 mr-1" />
              Limited spots remaining
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              20,000 emails/month
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              20 email accounts
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Advanced analytics
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Priority support
            </div>
          </div>

          <Button onClick={handleUpgrade} className="w-full bg-yellow-600 hover:bg-yellow-700">
            <Gift className="h-4 w-4 mr-2" />
            Claim Early Adopter Deal
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}