'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '@/lib/auth/context'
import { useBilling, usePromotionValidation } from '@/hooks/useBilling'
import { ArrowRight, Mail, Lock, User, Building, CheckCircle, CreditCard, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PlanSelection from '@/components/billing/PlanSelection'
import PaymentMethodForm from '@/components/billing/PaymentMethodForm'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface RegisterFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  company: string
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  const { plans, createSubscription, isLoading: billingLoading } = useBilling()
  const { validatePromotion, validation, isValidating, clearValidation } = usePromotionValidation()
  
  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    company: ''
  })
  
  // Registration flow state
  const [currentStep, setCurrentStep] = useState<'account' | 'payment' | 'processing' | 'success'>('account')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
  
  // Plan and promotion state
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('')
  const [promotionCode, setPromotionCode] = useState<string>('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  
  // Get plan from URL parameters and validate promotion
  useEffect(() => {
    const planParam = searchParams.get('plan')
    const promoParam = searchParams.get('promo')
    
    if (planParam) {
      setSelectedPlanCode(planParam)
      setBillingCycle(planParam.includes('yearly') ? 'yearly' : 'monthly')
    } else {
      // Default to basic monthly if no plan specified
      setSelectedPlanCode('basic_monthly')
      setBillingCycle('monthly')
    }
    
    if (promoParam) {
      setPromotionCode(promoParam)
    }
  }, [searchParams])
  
  // Validate promotion when plan or promo changes
  useEffect(() => {
    if (promotionCode && selectedPlanCode && plans.length > 0) {
      validatePromotion(promotionCode, selectedPlanCode)
    } else {
      clearValidation()
    }
  }, [promotionCode, selectedPlanCode, plans, validatePromotion, clearValidation])
  
  const selectedPlan = plans.find(plan => plan.plan_code === selectedPlanCode)

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.company) {
      setError('Please fill in all required fields')
      return
    }
    
    if (!selectedPlan) {
      setError('Please select a plan to continue')
      return
    }
    
    // Move to payment step
    setCurrentStep('payment')
  }
  
  const handlePaymentMethodCreated = (pmId: string) => {
    setPaymentMethodId(pmId)
    handleCompleteRegistration(pmId)
  }
  
  const handlePaymentError = (errorMessage: string) => {
    setError(`Payment error: ${errorMessage}`)
  }
  
  const handleCompleteRegistration = async (pmId: string) => {
    setCurrentStep('processing')
    setError('')
    setLoading(true)
    
    try {
      // 1. Register the user account
      const userResult = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationName: formData.company
      })
      
      // 2. Create the subscription
      const subscriptionData = {
        planCode: selectedPlanCode,
        paymentMethodId: pmId,
        ...(promotionCode && validation?.valid && { promotionCode })
      }
      
      await createSubscription(subscriptionData)
      
      // 3. Success - redirect to dashboard
      setCurrentStep('success')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration')
      setCurrentStep('payment') // Go back to payment step
    } finally {
      setLoading(false)
    }
  }
  
  const handleBackToAccount = () => {
    setCurrentStep('account')
    setPaymentMethodId(null)
    setError('')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {/* Account Step */}
        <div className={`flex items-center space-x-2 ${
          currentStep === 'account' ? 'text-purple-600' : 
          ['payment', 'processing', 'success'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'account' ? 'border-purple-600 bg-purple-50' :
            ['payment', 'processing', 'success'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
          }`}>
            {['payment', 'processing', 'success'].includes(currentStep) ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <span className="text-sm font-medium">Account</span>
        </div>
        
        <div className={`h-px w-8 ${
          ['payment', 'processing', 'success'].includes(currentStep) ? 'bg-green-300' : 'bg-gray-300'
        }`} />
        
        {/* Payment Step */}
        <div className={`flex items-center space-x-2 ${
          currentStep === 'payment' ? 'text-purple-600' :
          ['processing', 'success'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'payment' ? 'border-purple-600 bg-purple-50' :
            ['processing', 'success'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
          }`}>
            {['processing', 'success'].includes(currentStep) ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
          </div>
          <span className="text-sm font-medium">Payment</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="flex min-h-screen">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center">
              <Link href="/" className="text-3xl font-bold gradient-text">
                OPhir
              </Link>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                {currentStep === 'account' && 'Start your free trial'}
                {currentStep === 'payment' && 'Complete your subscription'}
                {currentStep === 'processing' && 'Setting up your account'}
                {currentStep === 'success' && 'Welcome to OPhir!'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {currentStep === 'account' && 'Create your account and choose your plan'}
                {currentStep === 'payment' && 'Secure payment to activate your subscription'}
                {currentStep === 'processing' && 'Please wait while we set up your account...'}
                {currentStep === 'success' && 'Your account is ready! Redirecting to dashboard...'}
              </p>
            </div>
            
            {renderStepIndicator()}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Account Registration Form */}
            {currentStep === 'account' && (
              <div className="space-y-6">
                {/* Plan Selection */}
                {selectedPlan && (
                  <div className="mb-6">
                    <PlanSelection
                      selectedPlanCode={selectedPlanCode}
                      plan={selectedPlan}
                      promotion={validation}
                      billingCycle={billingCycle}
                      isLoading={billingLoading}
                    />
                  </div>
                )}
                
                <form className="space-y-6" onSubmit={handleAccountSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="sr-only">
                      First name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="lastName" className="sr-only">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Work email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="sr-only">
                    Company
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      id="company"
                      name="company"
                      type="text"
                      required
                      className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Company name"
                      value={formData.company}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

                  <div>
                    <button
                      type="submit"
                      disabled={loading || billingLoading}
                      className="btn-primary w-full flex justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading || billingLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{' '}
                      <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
              </div>
            )}
            
            {/* Payment Method Form */}
            {currentStep === 'payment' && (
              <div className="space-y-6">
                {/* Show selected plan summary */}
                {selectedPlan && (
                  <div className="mb-6">
                    <PlanSelection
                      selectedPlanCode={selectedPlanCode}
                      plan={selectedPlan}
                      promotion={validation}
                      billingCycle={billingCycle}
                      isLoading={false}
                    />
                  </div>
                )}
                
                <Elements stripe={stripePromise}>
                  <PaymentMethodForm
                    onPaymentMethodCreated={handlePaymentMethodCreated}
                    onError={handlePaymentError}
                    isLoading={loading}
                    showBillingAddress={true}
                  />
                </Elements>
                
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleBackToAccount}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    ← Back to account details
                  </button>
                </div>
              </div>
            )}
            
            {/* Processing State */}
            {currentStep === 'processing' && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium text-gray-900">Setting up your account...</p>
                <p className="text-sm text-gray-600 mt-2">This may take a few seconds</p>
              </div>
            )}
            
            {/* Success State */}
            {currentStep === 'success' && (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Account created successfully!</p>
                <p className="text-sm text-gray-600">Redirecting to your dashboard...</p>
              </div>
            )}
          </div>
        </div>

        
        {/* Right side - Benefits (only show on account step) */}
        {currentStep === 'account' && (
          <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-purple-600 to-purple-800 text-white">
            <div className="max-w-md px-8">
              <h3 className="text-2xl font-bold mb-8">
                Join 15,000+ sales teams scaling their outreach
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 mr-3 mt-1 text-green-400" />
                  <div>
                    <div className="font-semibold mb-1">Professional Email Account Management</div>
                    <div className="text-purple-200 text-sm">Connect and manage multiple email accounts with automatic rotation</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 mr-3 mt-1 text-green-400" />
                  <div>
                    <div className="font-semibold mb-1">AI-Powered Warmup</div>
                    <div className="text-purple-200 text-sm">Intelligent warmup system ensures 95%+ inbox placement</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 mr-3 mt-1 text-green-400" />
                  <div>
                    <div className="font-semibold mb-1">Advanced Analytics</div>
                    <div className="text-purple-200 text-sm">Track everything with real-time campaign insights</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 mr-3 mt-1 text-green-400" />
                  <div>
                    <div className="font-semibold mb-1">Scale to Millions</div>
                    <div className="text-purple-200 text-sm">Send 1M+ emails per day with enterprise reliability</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="text-sm text-purple-200 mb-2">"Best investment we've made"</div>
                <div className="font-semibold">- Sarah Chen, VP Sales at TechCorp</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}