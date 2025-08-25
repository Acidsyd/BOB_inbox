'use client'

import React, { useState } from 'react'
import { Check, X, Star, Zap, Crown, Shield } from 'lucide-react'

interface Feature {
  name: string
  description?: string
  basic: boolean | string
  full: boolean | string
  category: 'core' | 'advanced' | 'enterprise'
}

const features: Feature[] = [
  // Core Features
  { 
    name: 'Email Sending Volume', 
    basic: '5,000/month', 
    full: '20,000/month', 
    category: 'core',
    description: 'Maximum emails you can send per month'
  },
  { 
    name: 'Email Accounts', 
    basic: '5 accounts', 
    full: '20 accounts', 
    category: 'core',
    description: 'Number of email accounts you can connect'
  },
  { 
    name: 'Gmail API Integration', 
    basic: true, 
    full: true, 
    category: 'core',
    description: 'Direct Gmail integration for better deliverability'
  },
  { 
    name: 'Email Sequences', 
    basic: 'Basic', 
    full: 'Advanced', 
    category: 'core',
    description: 'Automated email follow-up sequences'
  },
  { 
    name: 'Campaign Analytics', 
    basic: 'Basic', 
    full: 'Advanced', 
    category: 'core',
    description: 'Track opens, clicks, replies, and more'
  },
  { 
    name: 'Email Support', 
    basic: true, 
    full: true, 
    category: 'core',
    description: 'Get help when you need it'
  },

  // Advanced Features
  { 
    name: 'AI Personalization', 
    basic: false, 
    full: true, 
    category: 'advanced',
    description: 'AI-powered message customization'
  },
  { 
    name: 'CRM Integrations', 
    basic: false, 
    full: true, 
    category: 'advanced',
    description: 'Connect with Salesforce, HubSpot, Pipedrive'
  },
  { 
    name: 'Custom Domains', 
    basic: false, 
    full: true, 
    category: 'advanced',
    description: 'Use your own domain for tracking links'
  },
  { 
    name: 'A/B Testing', 
    basic: false, 
    full: true, 
    category: 'advanced',
    description: 'Test different subject lines and content'
  },
  { 
    name: 'Advanced Reporting', 
    basic: false, 
    full: true, 
    category: 'advanced',
    description: 'Detailed performance insights and ROI tracking'
  },
  { 
    name: 'Team Collaboration', 
    basic: false, 
    full: true, 
    category: 'advanced',
    description: 'Multiple team members with role-based permissions'
  },
  { 
    name: 'Priority Support', 
    basic: false, 
    full: true, 
    category: 'advanced',
    description: 'Fast response times and dedicated assistance'
  },

  // Enterprise Features
  { 
    name: 'White-label Solution', 
    basic: false, 
    full: false, 
    category: 'enterprise',
    description: 'Brand the platform as your own'
  },
  { 
    name: 'API Access', 
    basic: false, 
    full: 'Limited', 
    category: 'enterprise',
    description: 'Integrate with your existing systems'
  },
  { 
    name: 'Dedicated Success Manager', 
    basic: false, 
    full: false, 
    category: 'enterprise',
    description: 'Personal account manager for enterprise clients'
  }
]

export function FeatureComparison() {
  const [activeTab, setActiveTab] = useState<'core' | 'advanced' | 'enterprise'>('core')
  
  const filteredFeatures = features.filter(feature => feature.category === activeTab)
  
  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-gray-300 mx-auto" />
      )
    }
    return (
      <span className="text-sm font-medium text-gray-900">
        {value}
      </span>
    )
  }
  
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What's Included
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Both plans include Gmail API integration that eliminates per-email fees.
          </p>
        </div>
        
        {/* Simplified Category Tabs */}
        <div className="flex justify-center mb-10">
          <div className="flex bg-gray-100 rounded-lg p-1 flex-wrap">
            {(['core', 'advanced', 'enterprise'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-3 md:px-6 py-2 md:py-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === category
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {category === 'core' && (
                  <div className="flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Core</span>
                    <span className="sm:hidden">Core</span>
                  </div>
                )}
                {category === 'advanced' && (
                  <div className="flex items-center">
                    <Crown className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Advanced</span>
                    <span className="sm:hidden">Pro</span>
                  </div>
                )}
                {category === 'enterprise' && (
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Enterprise</span>
                    <span className="sm:hidden">Ent</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Responsive Feature Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-3 divide-x divide-gray-200">
              <div className="p-4 md:p-6">
                <div className="text-base md:text-lg font-semibold text-gray-900">Features</div>
              </div>
              <div className="p-4 md:p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Zap className="w-4 md:w-5 h-4 md:h-5 text-blue-600 mr-1 md:mr-2" />
                  <div className="text-base md:text-lg font-semibold text-gray-900">Basic</div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-gray-900">€15</div>
                <div className="text-xs md:text-sm text-gray-600">/month</div>
              </div>
              <div className="p-4 md:p-6 text-center bg-gradient-to-br from-purple-50 to-blue-50">
                <div className="flex items-center justify-center mb-2">
                  <Crown className="w-4 md:w-5 h-4 md:h-5 text-purple-600 mr-1 md:mr-2" />
                  <div className="text-base md:text-lg font-semibold text-gray-900">Full</div>
                  <Star className="w-3 md:w-4 h-3 md:h-4 text-yellow-500 ml-1" />
                </div>
                <div className="text-lg md:text-2xl font-bold text-gray-900">€30</div>
                <div className="text-xs md:text-sm text-gray-600">/month</div>
                <div className="mt-2 inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Popular
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile-Optimized Feature Rows */}
          <div className="divide-y divide-gray-200">
            {filteredFeatures.map((feature, index) => (
              <div key={index} className="grid grid-cols-3 divide-x divide-gray-200 hover:bg-gray-50 transition-colors">
                <div className="p-3 md:p-4">
                  <div className="font-medium text-gray-900 text-sm md:text-base">{feature.name}</div>
                  {feature.description && (
                    <div className="text-xs md:text-sm text-gray-600 mt-1 hidden md:block">{feature.description}</div>
                  )}
                </div>
                <div className="p-3 md:p-4 text-center">
                  {renderFeatureValue(feature.basic)}
                </div>
                <div className="p-3 md:p-4 text-center bg-purple-50 bg-opacity-50">
                  {renderFeatureValue(feature.full)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Enterprise Notice */}
          {activeTab === 'enterprise' && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-t border-gray-200">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 mb-2">
                  Need Enterprise Features?
                </div>
                <p className="text-gray-600 mb-4">
                  Contact us for custom pricing on enterprise features like white-labeling, 
                  dedicated success management, and unlimited API access.
                </p>
                <button className="btn-secondary">
                  Contact Sales
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Streamlined Value Proposition */}
        <div className="mt-10 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 md:p-8 border border-green-200">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Why Choose OPhir?
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-sm">
              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-3 rounded-full mb-3">
                  <Shield className="w-5 md:w-6 h-5 md:h-6 text-green-600" />
                </div>
                <div className="font-semibold mb-2">Gmail API</div>
                <div className="text-gray-600 text-xs md:text-sm">
                  Better deliverability, no per-email fees
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-100 p-3 rounded-full mb-3">
                  <Zap className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
                </div>
                <div className="font-semibold mb-2">Cost Savings</div>
                <div className="text-gray-600 text-xs md:text-sm">
                  Save €500-2000+ monthly vs competitors
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-purple-100 p-3 rounded-full mb-3">
                  <Crown className="w-5 md:w-6 h-5 md:h-6 text-purple-600" />
                </div>
                <div className="font-semibold mb-2">Full Features</div>
                <div className="text-gray-600 text-xs md:text-sm">
                  AI personalization, analytics, automation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}