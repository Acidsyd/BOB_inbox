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
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">BOBinbox</Link>
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
            Professional Email Client at
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> Unbeatable Prices</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get all the features of premium email clients like Outlook and Thunderbird,
            plus unified inbox management and professional tools.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center text-gray-700">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span className="font-medium">Unified inbox for all accounts</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span className="font-medium">Professional composition tools</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              <span className="font-medium">Smart scheduling & templates</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards - 4 Options */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Personal Monthly */}
            <div className="relative bg-white rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  STARTER
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Personal</h3>
                  <Zap className="w-6 h-6 text-gray-400" />
                </div>

                <p className="text-sm text-gray-600 mb-4">Perfect for individual professionals</p>

                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€15</span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    vs Gmail Business $6/user
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">5 email accounts</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Unified inbox management</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Smart email threading</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Email templates & scheduling</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Rich text composition</span>
                  </li>
                </ul>

                <Link href="/register?plan=personal_monthly">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all duration-200">
                    Start Free Trial
                  </button>
                </Link>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    €3 per email account
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Monthly */}
            <div className="relative bg-white rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  POPULAR
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Professional</h3>
                  <Crown className="w-6 h-6 text-gray-400" />
                </div>

                <p className="text-sm text-gray-600 mb-4">For teams and power users</p>

                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€30</span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    vs Outlook Business $12.50/user
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">25 email accounts</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Team collaboration features</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Advanced search & filtering</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Calendar integration</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Priority support</span>
                  </li>
                </ul>

                <Link href="/register?plan=professional_monthly">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all duration-200">
                    Start Free Trial
                  </button>
                </Link>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    €1.20 per email account
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise Monthly - Most Popular */}
            <div className="relative bg-white rounded-xl shadow-xl transition-all duration-300 hover:scale-105 ring-2 ring-purple-500">
              <div className="absolute -top-4 left-0 right-0 mx-auto w-fit">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  MOST POPULAR
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
                  <Infinity className="w-6 h-6 text-purple-600" />
                </div>

                <p className="text-sm text-gray-600 mb-4">For large organizations</p>

                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">€60</span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Unlimited email accounts</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Advanced security features</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Custom integrations</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">SSO & user management</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700">Dedicated account manager</span>
                  </li>
                </ul>

                <Link href="/register?plan=enterprise_monthly">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                    Start Free Trial
                    <ArrowRight className="inline-block w-4 h-4 ml-1" />
                  </button>
                </Link>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    Custom enterprise pricing
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Yearly - Early Adopter */}
            <div className="relative bg-white rounded-xl shadow-lg transition-all duration-300 hover:scale-105">
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce">
                  50% OFF
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">Professional Yearly</h3>
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
                    <span className="text-gray-700">Everything in Professional</span>
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

                <Link href="/register?plan=professional_yearly&promo=EARLY100">
                  <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                    Claim 50% OFF
                    <ArrowRight className="inline-block w-4 h-4 ml-1" />
                  </button>
                </Link>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 text-center">
                    €0.50 per email account
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
              Professional Email Clients Comparison
            </h2>
            <p className="text-xl text-gray-600">
              Compare features and pricing with other professional email solutions
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {/* Our Platform */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="text-center">
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">BOBinbox Professional</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">€30</div>
                  <div className="text-xs text-gray-600 mb-2">25 email accounts</div>
                  <div className="text-xs text-green-600 font-medium mb-3">+ €0 setup fee</div>
                  <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <Star className="w-3 h-3 mr-1" />
                    Best Value
                  </div>
                </div>
              </div>

              {/* Outlook */}
              <div className="p-6 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Outlook Business</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">$12.50</div>
                <div className="text-xs text-gray-600 mb-2">Per user/month</div>
                <div className="text-xs text-red-600 font-medium mb-3">Single account per user</div>
                <div className="text-sm text-gray-600">Individual pricing model</div>
              </div>

              {/* Gmail Business */}
              <div className="p-6 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Gmail Business</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">$6</div>
                <div className="text-xs text-gray-600 mb-2">Per user/month</div>
                <div className="text-xs text-red-600 font-medium mb-3">Single account per user</div>
                <div className="text-sm text-gray-600">Basic features only</div>
              </div>

              {/* Thunderbird */}
              <div className="p-6 text-center">
                <div className="text-lg font-semibold text-gray-700 mb-2">Thunderbird</div>
                <div className="text-2xl font-bold text-green-600 mb-1">Free</div>
                <div className="text-xs text-gray-600 mb-2">Open source</div>
                <div className="text-xs text-red-600 font-medium mb-3">No cloud sync</div>
                <div className="text-sm text-gray-600">Limited features</div>
              </div>
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="mt-12 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 text-center">Feature Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider">BOBinbox</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Outlook</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gmail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Multiple accounts</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">Limited</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">Limited</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Unified inbox</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-500">No</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Smart threading</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Cloud sync</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Team features</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-yellow-500">Enterprise only</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-yellow-500">Limited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

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
              <h3 className="text-xl font-bold text-gray-900 mb-3">How is BOBinbox different from Gmail or Outlook?</h3>
              <p className="text-gray-600">BOBinbox is designed specifically for managing multiple email accounts in one unified interface. Unlike Gmail or Outlook that charge per user, we offer account-based pricing that's perfect for professionals managing multiple email addresses.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Can I import my existing emails and contacts?</h3>
              <p className="text-gray-600">Yes! BOBinbox supports OAuth2 integration with Gmail and Outlook, and IMAP for other providers. All your existing emails, contacts, and folder structures are preserved and synced automatically.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Is my email data secure?</h3>
              <p className="text-gray-600">Absolutely. We use OAuth2 authentication (no passwords stored), 256-bit encryption, and industry-standard security practices. Your email data remains on the original servers - we just provide a unified interface.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What email providers do you support?</h3>
              <p className="text-gray-600">We support Gmail, Outlook, and any email provider with IMAP access. OAuth2 integration provides the smoothest experience for Gmail and Outlook accounts.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Can I try BOBinbox before purchasing?</h3>
              <p className="text-gray-600">Yes! We offer a 14-day free trial for all plans. No credit card required to start your trial.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Do you offer team and enterprise features?</h3>
              <p className="text-gray-600">Yes! Our Professional and Enterprise plans include team collaboration, shared inboxes, user management, and advanced security features perfect for businesses of all sizes.</p>
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
              Ready to Unify Your Email Experience?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of professionals who have simplified their email management with BOBinbox.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/register?plan=professional_yearly&promo=EARLY100">
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