'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { 
  Calendar,
  Pause,
  Play,
  ArrowUpCircle,
  ArrowDownCircle,
  Gift,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap,
  Calculator,
  History,
  TrendingUp,
  Plus,
  Minus,
  RefreshCw
} from 'lucide-react'
import { formatPrice, formatDate, calculateProration } from '@/lib/billing'
import { OrganizationSubscription, SubscriptionPlan } from '@/types/billing'

// Enhanced Subscription Types
interface SubscriptionAction {
  id: string
  type: 'pause' | 'resume' | 'upgrade' | 'downgrade' | 'cancel' | 'trial_start' | 'trial_end' | 'credit_added'
  scheduledDate?: string
  effectiveDate: string
  oldPlan?: SubscriptionPlan
  newPlan?: SubscriptionPlan
  prorationAmount?: number
  reason?: string
  createdAt: string
  status: 'pending' | 'completed' | 'cancelled'
  metadata?: Record<string, any>
}

interface SubscriptionCredit {
  id: string
  subscriptionId: string
  amount: number
  currency: string
  description: string
  type: 'adjustment' | 'refund' | 'promotional' | 'compensation'
  appliedToInvoice?: string
  expiresAt?: string
  createdAt: string
  usedAmount: number
  remainingAmount: number
  status: 'active' | 'used' | 'expired' | 'cancelled'
}

interface TrialConfiguration {
  id: string
  planId: string
  durationDays: number
  requiresPaymentMethod: boolean
  autoConvertToPaid: boolean
  features: string[]
  limitations: Record<string, number>
  customMessage?: string
}

interface ProrationPreview {
  currentPeriodStart: string
  currentPeriodEnd: string
  daysRemaining: number
  totalDays: number
  currentPlanAmount: number
  newPlanAmount: number
  prorationAmount: number
  isCredit: boolean
  nextInvoiceAmount: number
  effectiveDate: string
}

// Mock Data
const mockSubscription: OrganizationSubscription = {
  id: 'sub_current',
  organization_id: 'org_123',
  plan_id: 'plan_full',
  stripe_customer_id: 'cus_123',
  stripe_subscription_id: 'sub_stripe_123',
  status: 'active',
  billing_cycle: 'monthly',
  current_period_start: '2024-08-01T00:00:00Z',
  current_period_end: '2024-08-31T23:59:59Z',
  cancel_at_period_end: false,
  trial_start: '2024-07-01T00:00:00Z',
  trial_end: '2024-07-15T00:00:00Z',
  monthly_price: 30.00,
  yearly_price: 300.00,
  currency: 'EUR',
  metadata: {},
  created_at: '2024-07-01T00:00:00Z',
  updated_at: '2024-08-23T10:00:00Z'
}

const mockPlans: SubscriptionPlan[] = [
  {
    id: 'plan_basic',
    plan_code: 'basic_monthly',
    name: 'Basic Plan',
    description: 'Perfect for individuals and small teams',
    price_monthly: 15.00,
    price_yearly: 150.00,
    currency: 'EUR',
    emails_per_month: 5000,
    email_accounts_limit: 3,
    campaigns_limit: 10,
    leads_limit: 1000,
    features: {},
    active: true,
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'plan_full',
    plan_code: 'full_monthly',
    name: 'Full Plan',
    description: 'Best for growing businesses',
    price_monthly: 30.00,
    price_yearly: 300.00,
    currency: 'EUR',
    emails_per_month: 15000,
    email_accounts_limit: 10,
    campaigns_limit: 50,
    leads_limit: 5000,
    features: {},
    active: true,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'plan_unlimited',
    plan_code: 'unlimited_monthly',
    name: 'Unlimited Plan',
    description: 'For large enterprises',
    price_monthly: 60.00,
    price_yearly: 600.00,
    currency: 'EUR',
    emails_per_month: 100000,
    email_accounts_limit: 50,
    campaigns_limit: 200,
    leads_limit: 50000,
    features: {},
    active: true,
    sort_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

const mockActions: SubscriptionAction[] = [
  {
    id: 'action_001',
    type: 'upgrade',
    effectiveDate: '2024-08-01T00:00:00Z',
    oldPlan: mockPlans[0],
    newPlan: mockPlans[1],
    prorationAmount: 12.50,
    reason: 'Plan upgrade requested by user',
    createdAt: '2024-07-30T14:30:00Z',
    status: 'completed'
  },
  {
    id: 'action_002',
    type: 'credit_added',
    effectiveDate: '2024-08-15T00:00:00Z',
    reason: 'Customer service adjustment',
    createdAt: '2024-08-15T10:00:00Z',
    status: 'completed',
    metadata: { amount: 25.00, type: 'compensation' }
  }
]

const mockCredits: SubscriptionCredit[] = [
  {
    id: 'credit_001',
    subscriptionId: 'sub_current',
    amount: 25.00,
    currency: 'EUR',
    description: 'Service interruption compensation',
    type: 'compensation',
    createdAt: '2024-08-15T10:00:00Z',
    usedAmount: 0,
    remainingAmount: 25.00,
    status: 'active'
  },
  {
    id: 'credit_002',
    subscriptionId: 'sub_current',
    amount: 15.00,
    currency: 'EUR',
    description: 'Promotional credit - Early Adopter',
    type: 'promotional',
    expiresAt: '2024-12-31T23:59:59Z',
    createdAt: '2024-07-01T00:00:00Z',
    usedAmount: 15.00,
    remainingAmount: 0,
    status: 'used',
    appliedToInvoice: 'inv_001'
  }
]

interface SubscriptionControlsProps {
  subscription: OrganizationSubscription
  onAction?: (action: Omit<SubscriptionAction, 'id' | 'createdAt' | 'status'>) => void
}

function SubscriptionControls({ subscription, onAction }: SubscriptionControlsProps) {
  const [isPausing, setIsPausing] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [pauseDate, setPauseDate] = useState('')
  const [resumeDate, setResumeDate] = useState('')
  const [pauseReason, setPauseReason] = useState('')

  const isPaused = subscription.status === 'paused'
  const canPause = subscription.status === 'active' && !subscription.cancel_at_period_end
  const canResume = isPaused

  const handlePause = async () => {
    setIsPausing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await onAction?.({
        type: 'pause',
        effectiveDate: pauseDate || new Date().toISOString(),
        reason: pauseReason || 'User requested pause',
        scheduledDate: pauseDate || undefined
      })
      
      setPauseDate('')
      setPauseReason('')
    } finally {
      setIsPausing(false)
    }
  }

  const handleResume = async () => {
    setIsResuming(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await onAction?.({
        type: 'resume',
        effectiveDate: resumeDate || new Date().toISOString(),
        reason: 'User requested resume',
        scheduledDate: resumeDate || undefined
      })
      
      setResumeDate('')
    } finally {
      setIsResuming(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Subscription Controls
        </CardTitle>
        <CardDescription>
          Manage your subscription status and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={subscription.status === 'active' ? 'success' : 'secondary'}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </Badge>
              {subscription.cancel_at_period_end && (
                <Badge variant="destructive">Cancelling at period end</Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Current period: {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
            </div>
          </div>
          
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">Full Plan (Monthly)</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">{formatPrice(subscription.monthly_price, subscription.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Next billing:</span>
              <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
            </div>
          </div>
        </div>

        {/* Pause/Resume Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pause Subscription */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Pause Subscription
            </h4>
            
            {canPause ? (
              <>
                <div className="space-y-2">
                  <Label>Pause Date (Optional)</Label>
                  <Input
                    type="date"
                    value={pauseDate}
                    onChange={(e) => setPauseDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    placeholder="Reason for pausing subscription..."
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    rows={2}
                  />
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pause Subscription</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to pause your subscription? You won't be billed during the pause period.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          During the pause:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Your service will be temporarily suspended</li>
                            <li>No charges will occur</li>
                            <li>Your data will be preserved</li>
                            <li>You can resume anytime</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline">Cancel</Button>
                        <Button onClick={handlePause} disabled={isPausing}>
                          {isPausing ? 'Pausing...' : 'Confirm Pause'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {isPaused ? 'Subscription is already paused' : 'Cannot pause cancelled subscriptions'}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Resume Subscription */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Play className="h-4 w-4" />
              Resume Subscription
            </h4>
            
            {canResume ? (
              <>
                <div className="space-y-2">
                  <Label>Resume Date (Optional)</Label>
                  <Input
                    type="date"
                    value={resumeDate}
                    onChange={(e) => setResumeDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <Button onClick={handleResume} disabled={isResuming} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  {isResuming ? 'Resuming...' : 'Resume Subscription'}
                </Button>
              </>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Subscription is currently active
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PlanChangePreviewProps {
  currentPlan: SubscriptionPlan
  targetPlan: SubscriptionPlan
  subscription: OrganizationSubscription
  onConfirm?: (preview: ProrationPreview) => void
}

function PlanChangePreview({ currentPlan, targetPlan, subscription, onConfirm }: PlanChangePreviewProps) {
  const [preview, setPreview] = useState<ProrationPreview | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])

  const isUpgrade = targetPlan.price_monthly > currentPlan.price_monthly
  const changeType = isUpgrade ? 'upgrade' : 'downgrade'

  useEffect(() => {
    calculateProrationPreview()
  }, [effectiveDate, targetPlan])

  const calculateProrationPreview = async () => {
    setIsCalculating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const periodStart = new Date(subscription.current_period_start)
      const periodEnd = new Date(subscription.current_period_end)
      const changeDate = new Date(effectiveDate)
      
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
      const daysRemaining = Math.ceil((periodEnd.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24))
      
      const prorationResult = calculateProration({
        oldAmount: currentPlan.price_monthly,
        newAmount: targetPlan.price_monthly,
        daysRemaining,
        totalDays
      })

      const newPreview: ProrationPreview = {
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        daysRemaining,
        totalDays,
        currentPlanAmount: currentPlan.price_monthly,
        newPlanAmount: targetPlan.price_monthly,
        prorationAmount: prorationResult.prorationAmount,
        isCredit: prorationResult.isCredit,
        nextInvoiceAmount: prorationResult.isCredit ? 
          Math.max(0, targetPlan.price_monthly - prorationResult.prorationAmount) :
          targetPlan.price_monthly + prorationResult.prorationAmount,
        effectiveDate
      }

      setPreview(newPreview)
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Plan Change Preview
        </CardTitle>
        <CardDescription>
          Calculate proration for plan changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Current Plan</div>
            <div className="font-medium">{currentPlan.name}</div>
            <div className="text-lg font-bold text-red-600">
              {formatPrice(currentPlan.price_monthly, subscription.currency)}
            </div>
          </div>
          
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-gray-600 mb-1">New Plan</div>
            <div className="font-medium">{targetPlan.name}</div>
            <div className="text-lg font-bold text-green-600">
              {formatPrice(targetPlan.price_monthly, subscription.currency)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Effective Date</Label>
          <Input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {isCalculating ? (
          <div className="p-4 border rounded-lg">
            <Skeleton className="h-20" />
          </div>
        ) : preview ? (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              {isUpgrade ? (
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-blue-600" />
              )}
              Proration Calculation
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Days remaining in period:</span>
                <span className="font-medium">{preview.daysRemaining} of {preview.totalDays}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Current plan (prorated):</span>
                <span className="font-medium text-red-600">
                  -{formatPrice((preview.currentPlanAmount / preview.totalDays) * preview.daysRemaining, subscription.currency)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>New plan (prorated):</span>
                <span className="font-medium text-green-600">
                  +{formatPrice((preview.newPlanAmount / preview.totalDays) * preview.daysRemaining, subscription.currency)}
                </span>
              </div>
              
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">
                  {preview.isCredit ? 'Credit' : 'Additional charge'}:
                </span>
                <span className={`font-bold ${preview.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                  {preview.isCredit ? '-' : '+'}{formatPrice(preview.prorationAmount, subscription.currency)}
                </span>
              </div>
              
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Next invoice amount:</span>
                <span className="font-bold">
                  {formatPrice(preview.nextInvoiceAmount, subscription.currency)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {preview && (
          <Button onClick={() => onConfirm?.(preview)} className="w-full">
            {isUpgrade ? (
              <>
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Confirm Upgrade
              </>
            ) : (
              <>
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Confirm Downgrade
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface CreditManagementProps {
  credits: SubscriptionCredit[]
  onAddCredit?: (credit: Omit<SubscriptionCredit, 'id' | 'createdAt' | 'usedAmount' | 'remainingAmount' | 'status'>) => void
}

function CreditManagement({ credits, onAddCredit }: CreditManagementProps) {
  const [isAddingCredit, setIsAddingCredit] = useState(false)
  const [newCredit, setNewCredit] = useState({
    amount: '',
    description: '',
    type: 'adjustment' as const,
    expiresAt: ''
  })

  const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0)
  const usedCredits = credits.reduce((sum, credit) => sum + credit.usedAmount, 0)
  const remainingCredits = credits.reduce((sum, credit) => sum + credit.remainingAmount, 0)

  const handleAddCredit = async () => {
    if (!newCredit.amount || !newCredit.description) return

    setIsAddingCredit(true)
    try {
      await onAddCredit?.({
        subscriptionId: 'sub_current',
        amount: parseFloat(newCredit.amount),
        currency: 'EUR',
        description: newCredit.description,
        type: newCredit.type,
        expiresAt: newCredit.expiresAt || undefined
      })
      
      setNewCredit({ amount: '', description: '', type: 'adjustment', expiresAt: '' })
    } finally {
      setIsAddingCredit(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Account Credits
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Credit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Account Credit</DialogTitle>
                <DialogDescription>
                  Add credit to this subscription for adjustments or compensation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={newCredit.amount}
                    onChange={(e) => setNewCredit(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Reason for credit..."
                    value={newCredit.description}
                    onChange={(e) => setNewCredit(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Credit Type</Label>
                  <Select 
                    value={newCredit.type} 
                    onValueChange={(value: any) => setNewCredit(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="compensation">Compensation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Expires At (Optional)</Label>
                  <Input
                    type="date"
                    value={newCredit.expiresAt}
                    onChange={(e) => setNewCredit(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button onClick={handleAddCredit} disabled={isAddingCredit}>
                    {isAddingCredit ? 'Adding...' : 'Add Credit'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage account credits and adjustments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credit Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-600">Total Credits</div>
            <div className="text-xl font-bold text-blue-900">
              {formatPrice(totalCredits)}
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600">Used</div>
            <div className="text-xl font-bold text-gray-900">
              {formatPrice(usedCredits)}
            </div>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-600">Available</div>
            <div className="text-xl font-bold text-green-900">
              {formatPrice(remainingCredits)}
            </div>
          </div>
        </div>

        {/* Credit History */}
        {credits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No credits available</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium">Credit History</h4>
            {credits.map((credit) => (
              <div key={credit.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {credit.type.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        variant={
                          credit.status === 'active' ? 'success' :
                          credit.status === 'used' ? 'secondary' :
                          credit.status === 'expired' ? 'destructive' :
                          'outline'
                        }
                      >
                        {credit.status}
                      </Badge>
                    </div>
                    <div className="font-medium">{credit.description}</div>
                    <div className="text-sm text-gray-500">
                      Added: {formatDate(credit.createdAt)}
                      {credit.expiresAt && ` • Expires: ${formatDate(credit.expiresAt)}`}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatPrice(credit.amount, credit.currency)}
                    </div>
                    {credit.usedAmount > 0 && (
                      <div className="text-sm text-gray-500">
                        Used: {formatPrice(credit.usedAmount, credit.currency)}
                      </div>
                    )}
                    {credit.remainingAmount > 0 && (
                      <div className="text-sm text-green-600">
                        Available: {formatPrice(credit.remainingAmount, credit.currency)}
                      </div>
                    )}
                  </div>
                </div>
                
                {credit.status === 'active' && credit.remainingAmount > 0 && (
                  <div className="mt-3">
                    <Progress 
                      value={(credit.usedAmount / credit.amount) * 100} 
                      className="h-2" 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SubscriptionHistoryProps {
  actions: SubscriptionAction[]
}

function SubscriptionHistory({ actions }: SubscriptionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Subscription History
        </CardTitle>
        <CardDescription>
          Timeline of subscription changes and actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No subscription history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => {
              const getActionIcon = () => {
                switch (action.type) {
                  case 'pause': return <Pause className="h-4 w-4" />
                  case 'resume': return <Play className="h-4 w-4" />
                  case 'upgrade': return <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  case 'downgrade': return <ArrowDownCircle className="h-4 w-4 text-blue-600" />
                  case 'cancel': return <AlertTriangle className="h-4 w-4 text-red-600" />
                  case 'credit_added': return <Gift className="h-4 w-4 text-purple-600" />
                  default: return <Settings className="h-4 w-4" />
                }
              }

              const getActionDescription = () => {
                switch (action.type) {
                  case 'pause': return 'Subscription paused'
                  case 'resume': return 'Subscription resumed'
                  case 'upgrade': 
                    return `Upgraded from ${action.oldPlan?.name} to ${action.newPlan?.name}`
                  case 'downgrade':
                    return `Downgraded from ${action.oldPlan?.name} to ${action.newPlan?.name}`
                  case 'cancel': return 'Subscription cancelled'
                  case 'credit_added': 
                    return `Credit added: ${formatPrice(action.metadata?.amount || 0)}`
                  default: return 'Subscription modified'
                }
              }

              return (
                <div key={action.id} className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-none mt-1">
                    {getActionIcon()}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{getActionDescription()}</div>
                      <Badge 
                        variant={
                          action.status === 'completed' ? 'success' :
                          action.status === 'pending' ? 'default' :
                          'secondary'
                        }
                      >
                        {action.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>Effective: {formatDate(action.effectiveDate)}</div>
                      {action.prorationAmount && (
                        <div>
                          Proration: {formatPrice(action.prorationAmount)}
                        </div>
                      )}
                      {action.reason && (
                        <div>Reason: {action.reason}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdvancedSubscriptionManagement() {
  const [subscription] = useState<OrganizationSubscription>(mockSubscription)
  const [plans] = useState<SubscriptionPlan[]>(mockPlans)
  const [actions, setActions] = useState<SubscriptionAction[]>(mockActions)
  const [credits, setCredits] = useState<SubscriptionCredit[]>(mockCredits)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)

  const currentPlan = plans.find(p => p.id === subscription.plan_id) || plans[1]

  const handleSubscriptionAction = async (actionData: Omit<SubscriptionAction, 'id' | 'createdAt' | 'status'>) => {
    const newAction: SubscriptionAction = {
      ...actionData,
      id: `action_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }

    setActions(prev => [newAction, ...prev])
    
    // Simulate processing
    setTimeout(() => {
      setActions(prev => prev.map(action => 
        action.id === newAction.id 
          ? { ...action, status: 'completed' as const }
          : action
      ))
    }, 2000)
  }

  const handleAddCredit = async (creditData: Omit<SubscriptionCredit, 'id' | 'createdAt' | 'usedAmount' | 'remainingAmount' | 'status'>) => {
    const newCredit: SubscriptionCredit = {
      ...creditData,
      id: `credit_${Date.now()}`,
      createdAt: new Date().toISOString(),
      usedAmount: 0,
      remainingAmount: creditData.amount,
      status: 'active'
    }

    setCredits(prev => [newCredit, ...prev])
  }

  const handlePlanChangeConfirm = (preview: ProrationPreview) => {
    if (!selectedPlan) return

    const isUpgrade = selectedPlan.price_monthly > currentPlan.price_monthly

    handleSubscriptionAction({
      type: isUpgrade ? 'upgrade' : 'downgrade',
      effectiveDate: preview.effectiveDate,
      oldPlan: currentPlan,
      newPlan: selectedPlan,
      prorationAmount: preview.prorationAmount,
      reason: `User requested ${isUpgrade ? 'upgrade' : 'downgrade'}`
    })

    setSelectedPlan(null)
  }

  return (
    <div className="space-y-6">
      {/* Subscription Controls */}
      <SubscriptionControls 
        subscription={subscription}
        onAction={handleSubscriptionAction}
      />

      {/* Plan Change Preview */}
      {selectedPlan && (
        <PlanChangePreview
          currentPlan={currentPlan}
          targetPlan={selectedPlan}
          subscription={subscription}
          onConfirm={handlePlanChangeConfirm}
        />
      )}

      {/* Plan Selection for Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Change Plan
          </CardTitle>
          <CardDescription>
            Select a different plan to see proration preview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.filter(p => p.id !== currentPlan.id).map((plan) => (
              <div 
                key={plan.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="text-center">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <div className="text-2xl font-bold my-2">
                    {formatPrice(plan.price_monthly, plan.currency)}
                  </div>
                  <div className="text-sm text-gray-500">per month</div>
                  
                  <div className="mt-3 space-y-1 text-xs text-gray-600">
                    <div>{plan.emails_per_month.toLocaleString()} emails/month</div>
                    <div>{plan.email_accounts_limit} email accounts</div>
                    <div>{plan.campaigns_limit} campaigns</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Credit Management */}
      <CreditManagement 
        credits={credits}
        onAddCredit={handleAddCredit}
      />

      {/* Subscription History */}
      <SubscriptionHistory actions={actions} />
    </div>
  )
}