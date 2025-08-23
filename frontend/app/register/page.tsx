'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { ArrowRight, Mail, Lock, User, Building, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    company: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationName: formData.company
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="flex min-h-screen">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <Link href="/" className="text-3xl font-bold gradient-text">
                OPhir
              </Link>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Start your free trial
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                No credit card required • Setup in 5 minutes
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                      Start Free Trial
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
        </div>

        {/* Right side - Benefits */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-purple-600 to-purple-800 text-white">
          <div className="max-w-md px-8">
            <h3 className="text-2xl font-bold mb-8">
              Join 15,000+ sales teams scaling their outreach
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 mr-3 mt-1 text-green-400" />
                <div>
                  <div className="font-semibold mb-1">Unlimited Email Accounts</div>
                  <div className="text-purple-200 text-sm">Connect and rotate unlimited email accounts automatically</div>
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
      </div>
    </div>
  )
}