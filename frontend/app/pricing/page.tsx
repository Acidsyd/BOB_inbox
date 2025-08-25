'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Check, Zap, Crown, Rocket, Star, Users, TrendingDown, Shield, Mail, Infinity } from 'lucide-react'
import { FeatureComparison } from '../../components/pricing/FeatureComparison'

export default function PricingPage() {
  const [earlyAdoptersCount, setEarlyAdoptersCount] = useState(73)

  useEffect(() => {
    // Mock API call for early adopters count
    const fetchEarlyAdoptersCount = async () => {
      try {
        setEarlyAdoptersCount(73)
      } catch (error) {
        console.error('Failed to fetch early adopters count:', error)
      }
    }
    
    fetchEarlyAdoptersCount()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">OPhir</Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-600 hover:text-gray-900 transition">Features</Link>
              <Link href="/pricing" className="text-purple-600 font-medium">Pricing</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">Login</Link>
              <Link href="/register">
                <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200">
                  Start Free Trial
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-24 lg:pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 opacity-70" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-sm font-medium mb-6 animate-pulse">
            <Star className="w-4 h-4 mr-2" />
            LIMITED TIME: First 100 users get 50% OFF
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Send 60% More Emails at
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> 75% Less Cost</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            While Smartlead charges $39 for 6,000 emails, we give you 8,000 emails for just €15. 
            No credit limits, no setup fees, no catch.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center text-gray-700">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span className="font-medium">8K emails vs competitors' 6K</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span className="font-medium">Email warm-up included</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span className="font-medium">No setup fees ($1K+ elsewhere)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards - 4 Options */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Basic Monthly */}
            <div className="relative bg-white rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  8K ADVANTAGE
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Basic</h3>
                  <Zap className="w-6 h-6 text-gray-400" />
                </div>
                
                <p className="text-sm text-gray-600 mb-4">Beat Smartlead's Basic plan</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€15</span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    vs Smartlead $39 (62% cheaper)
                  </p>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">8,000 emails/month</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">10 email accounts</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Email warm-up included</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">A/B testing (2 variants)</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Advanced analytics</span>
                  </li>
                </ul>
                
                <Link href="/register?plan=basic_monthly">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all duration-200">
                    Start Free Trial
                  </button>
                </Link>
                
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    €1.88 per 1,000 emails
                  </div>
                </div>
              </div>
            </div>

            {/* Full Monthly */}
            <div className="relative bg-white rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  WARM-UP FREE
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Full</h3>
                  <Crown className="w-6 h-6 text-gray-400" />
                </div>
                
                <p className="text-sm text-gray-600 mb-4">Beats Smartlead Pro</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€30</span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    vs Smartlead $94 (68% cheaper)
                  </p>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">50,000 emails/month</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">25 email accounts</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Unlimited warm-up</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">LinkedIn automation</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">White-label option</span>
                  </li>
                </ul>
                
                <Link href="/register?plan=full_monthly">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all duration-200">
                    Start Free Trial
                  </button>
                </Link>
                
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    €0.60 per 1,000 emails
                  </div>
                </div>
              </div>
            </div>

            {/* Unlimited Monthly - Most Popular */}
            <div className="relative bg-white rounded-xl shadow-xl transition-all duration-300 hover:scale-105 ring-2 ring-purple-500">
              <div className="absolute -top-4 left-0 right-0 mx-auto w-fit">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  MOST POPULAR
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Unlimited</h3>
                  <Infinity className="w-6 h-6 text-purple-600" />
                </div>
                
                <p className="text-sm text-gray-600 mb-4">For high-volume senders</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€60</span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Unlimited emails/month</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">100 email accounts</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Multi-client management</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">API access</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Dedicated manager</span>
                  </li>
                </ul>
                
                <Link href="/register?plan=unlimited_monthly">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                    Start Free Trial
                    <ArrowRight className="inline-block w-4 h-4 ml-1" />
                  </button>
                </Link>
                
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    €0 per additional 1,000 emails
                  </div>
                </div>
              </div>
            </div>

            {/* Full Yearly - Early Adopter */}
            <div className="relative bg-white rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce">
                  50% OFF
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Full Yearly</h3>
                  <Rocket className="w-6 h-6 text-orange-500" />
                </div>
                
                <p className="text-sm text-gray-600 mb-4">Best value - save 50%</p>
                
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-lg text-gray-400 line-through mr-2">€300</span>
                    <span className="text-3xl font-bold text-gray-900">€150</span>
                    <span className="text-gray-600 ml-1">/year</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Save €150 - Limited to first 100 users
                  </p>
                </div>
                
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Everything in Full</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">€12.50/month</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Early adopter pricing</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Locked-in rate forever</span>
                  </li>
                </ul>
                
                <Link href="/register?plan=full_yearly&promo=EARLY100">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                    Claim 50% OFF
                    <ArrowRight className="inline-block w-4 h-4 ml-1" />
                  </button>
                </Link>
                
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    €0.63 per 1,000 emails
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Comparison */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              The Real Cost of Cold Email Tools
            </h2>
            <p className="text-xl text-gray-600">
              Compare actual prices and hidden fees vs our transparent pricing
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {/* Our Platform */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="text-center">
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">OPhir Full</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">€30</div>
                  <div className="text-xs text-gray-600 mb-2">50K emails/month</div>
                  <div className="text-xs text-green-600 font-medium mb-3">+ €0 setup fee</div>
                  <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <Star className="w-3 h-3 mr-1" />
                    Best Value
                  </div>
                </div>
              </div>

              {/* Smartlead */}
              <div className="p-6 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Smartlead Pro</div>
                <div className="text-2xl font-bold text-gray-400 line-through mb-1">$94</div>
                <div className="text-xs text-gray-600 mb-2">30K emails/month</div>
                <div className="text-xs text-red-600 font-medium mb-3">+ Setup fees</div>
                <div className="text-sm text-red-600 font-medium">68% more expensive</div>
              </div>

              {/* Lemlist */}
              <div className="p-6 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Lemlist Multi</div>
                <div className="text-2xl font-bold text-gray-400 line-through mb-1">$99</div>
                <div className="text-xs text-gray-600 mb-2">Only 15 accounts max</div>
                <div className="text-xs text-red-600 font-medium mb-3">+ $29/mo warm-up</div>
                <div className="text-sm text-red-600 font-medium">76% more expensive</div>
              </div>

              {/* Outreach */}
              <div className="p-6 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Outreach</div>
                <div className="text-2xl font-bold text-gray-400 line-through mb-1">$100+</div>
                <div className="text-xs text-gray-600 mb-2">Per user/month</div>
                <div className="text-xs text-red-600 font-medium mb-3">+ $1K-8K setup</div>
                <div className="text-sm text-red-600 font-medium">233% more expensive</div>
              </div>
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="mt-12 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 text-center">What You Actually Get</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider">OPhir</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Smartlead</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Lemlist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Price/month</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-purple-600">€30</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">$94</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">$99</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Emails/month</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600">50,000</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">30,000</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">Unlimited*</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Email accounts</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600">25</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">Unlimited</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">15 max</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Warm-up included</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">+$29/mo</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Setup fees</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-green-600">€0</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">Hidden</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">Hidden</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <FeatureComparison />

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Why do you offer 8,000 emails for €15 when Smartlead charges $39 for 6,000?</h3>
              <p className="text-gray-600">Our Gmail API integration eliminates per-email sending costs (typically $0.70-0.90 per 1,000 emails). While competitors rely on expensive SMTP services, we pass the savings directly to you - more emails, lower price, no catch.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Do you charge extra for email warm-up like other platforms?</h3>
              <p className="text-gray-600">No! Email warm-up is included free in all plans. Lemlist charges an extra $29/month for warm-up, while we include it at no additional cost. Our warm-up ensures your emails land in inboxes, not spam folders.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What's the catch compared to expensive platforms like Outreach?</h3>
              <p className="text-gray-600">There's no catch! Outreach charges $100+ per user plus $1K-8K setup fees. We offer the same core functionality at a fraction of the cost with zero setup fees. The only difference is you save thousands.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How can you offer 50,000 emails for €30 when Smartlead Pro costs $94?</h3>
              <p className="text-gray-600">Smartlead Pro gives you 150,000 emails but costs $94/month. Our Full plan gives you 50,000 emails for €30 - that's €0.60 per 1,000 emails vs their $0.63. Plus we include features they charge extra for like unlimited warm-up and white-labeling.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What's the EARLY100 promotion?</h3>
              <p className="text-gray-600">First 100 users get our Full Plan yearly for just €150/year instead of €300/year - that's 50% off! Includes everything: 50,000 emails/month, 25 accounts, warm-up, LinkedIn automation, and white-labeling. Limited to first 100 users.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Why should I switch from my current platform?</h3>
              <p className="text-gray-600">Save 60-75% on your monthly costs while getting more emails and features. No migration headaches, no setup fees, and our team will help you import your data. Most customers save $500-2000+ annually by switching.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-4">
              <Star className="w-4 h-4 mr-2" />
              Limited Time: {100 - earlyAdoptersCount} early adopter spots left
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Stop Overpaying for Cold Email
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Get enterprise-level results at startup prices. Join the smart businesses who've already made the switch.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/register?plan=full_yearly&promo=EARLY100">
              <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg px-8 py-4 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center">
                Claim 50% OFF - Limited Time
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <Link href="/register">
              <button className="bg-white text-gray-900 border border-gray-300 text-lg px-8 py-4 rounded-lg hover:bg-gray-50 transition-all duration-200">
                Start Free Trial
              </button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div className="flex items-center justify-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              14-day free trial
            </div>
            <div className="flex items-center justify-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              No setup fees
            </div>
            <div className="flex items-center justify-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}