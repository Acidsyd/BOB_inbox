'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { ArrowRight, Mail, Lock, User, Building, CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  
  // Static beta plans (no billing API needed)
  const staticPlans = [
    { 
      plan_code: 'basic', 
      name: 'Basic', 
      price: 29, 
      interval: 'month',
      description: 'Perfect for small teams getting started',
      features: ['Up to 1,000 leads', '10 campaigns', '200 emails/day', '3 email accounts']
    },
    { 
      plan_code: 'pro', 
      name: 'Pro', 
      price: 79, 
      interval: 'month',
      description: 'Most popular - great for growing businesses',
      features: ['Up to 10,000 leads', '50 campaigns', '1,000 emails/day', '10 email accounts']
    },
    { 
      plan_code: 'enterprise', 
      name: 'Enterprise', 
      price: 199, 
      interval: 'month',
      description: 'For large teams with advanced needs',
      features: ['Unlimited leads', 'Unlimited campaigns', '5,000 emails/day', 'Unlimited accounts']
    }
  ]
  
  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    company: ''
  })
  
  // Registration flow state
  const [currentStep, setCurrentStep] = useState<'account' | 'processing' | 'success'>('account')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Plan state - simplified for beta
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('basic')
  
  // Get plan from URL parameters
  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam && staticPlans.find(p => p.plan_code === planParam)) {
      setSelectedPlanCode(planParam)
    }
  }, [searchParams])
  
  const selectedPlan = staticPlans.find(plan => plan.plan_code === selectedPlanCode)

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.company) {
      setError('Please fill in all required fields: first name, last name, email, password, and company name')
      return
    }
    
    if (!selectedPlan) {
      setError('Please select a plan to continue')
      return
    }
    
    // Skip payment step for beta - go directly to registration
    handleCompleteRegistration()
  }
  
  const handlePaymentMethodCreated = (pmId: string) => {
    setPaymentMethodId(pmId)
    handleCompleteRegistration(pmId)
  }
  
  const handlePaymentError = (errorMessage: string) => {
    setError(`Payment error: ${errorMessage}`)
  }
  
  const handleCompleteRegistration = async (pmId?: string) => {
    setCurrentStep('processing')
    setError('')
    setLoading(true)
    
    try {
      // 1. Register the user account with beta access
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationName: formData.company,
        planType: selectedPlanCode || 'basic'
      })
      
      // 2. Skip subscription creation for beta users
      // TODO: Add subscription creation when payment is enabled
      
      // 3. Success - redirect to dashboard
      setCurrentStep('success')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration')
      setCurrentStep('account') // Go back to account step
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
          ['processing', 'success'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'account' ? 'border-purple-600 bg-purple-50' :
            ['processing', 'success'].includes(currentStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'
          }`}>
            {['processing', 'success'].includes(currentStep) ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <span className="text-sm font-medium">Account Setup</span>
        </div>
        
        <div className={`h-px w-8 ${
          ['processing', 'success'].includes(currentStep) ? 'bg-green-300' : 'bg-gray-300'
        }`} />
        
        {/* Success Step */}
        <div className={`flex items-center space-x-2 ${
          currentStep === 'success' ? 'text-green-600' : 'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            currentStep === 'success' ? 'border-green-600 bg-green-50' : 'border-gray-300'
          }`}>
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">Complete</span>
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
                BOBinbox
              </Link>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                {currentStep === 'account' && 'Join the BOBinbox Beta'}
                {currentStep === 'processing' && 'Setting up your account'}
                {currentStep === 'success' && 'Welcome to BOBinbox!'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {currentStep === 'account' && 'Get 90 days of free access to all features'}
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
                {/* Beta Access Banner */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">Free Beta Access</h3>
                      <p className="text-xs text-green-700 mt-1">
                        Get 90 days of full access to all features. No payment required during beta.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Plan Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Choose your plan (Free during beta)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {staticPlans.map((plan) => (
                      <div
                        key={plan.plan_code}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedPlanCode === plan.plan_code
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPlanCode(plan.plan_code)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                          <div className="text-sm text-gray-500">
                            <span className="line-through">${plan.price}/mo</span>
                            <span className="ml-2 text-green-600 font-medium">FREE</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          {plan.features.map((feature, idx) => (
                            <li key={idx}>• {feature}</li>
                          ))}
                        </ul>
                        {selectedPlanCode === plan.plan_code && (
                          <div className="mt-2 text-purple-600 text-sm font-medium">
                            ✓ Selected
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
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
                      disabled={loading}
                      className="btn-primary w-full flex justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Start Beta Trial (Free)
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
                <p className="text-lg font-medium text-gray-900 mb-2">Welcome to BOBinbox Beta!</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Your beta access includes:</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>• 90 days free access to all {selectedPlan?.name || 'selected'} features</li>
                      <li>• No payment required during beta period</li>
                      <li>• Full platform access and support</li>
                    </ul>
                  </div>
                </div>
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