'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap, Shield, Users, BarChart3, Mail, Globe, Sparkles, TrendingUp } from 'lucide-react'

export default function LandingPage() {
  const handleButtonClick = (buttonName: string) => {
    console.log(`🔍 HOMEPAGE CLICK TEST: ${buttonName}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <img src="/mailsender-icon.png" alt="Mailsender" className="w-12 h-12 rounded-xl shadow-md" />
              <span className="text-3xl font-bold gradient-text">Mailsender</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-600 hover:text-gray-900 transition">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</Link>
              <Link href="/resources" className="text-gray-600 hover:text-gray-900 transition">Resources</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">Login</Link>
              <Link href="/register">
                <button className="btn-primary">
                  Start Free Trial
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-bg">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              #1 B2B Email Marketing Platform for 2025
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Scale Your Outreach to
              <span className="gradient-text"> Millions</span>
              <br />
              With AI-Powered Automation
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The only B2B email marketing automation platform that combines professional email account management, 
              advanced AI personalization, and enterprise-grade deliverability 
              to help you book more meetings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <button 
                  className="btn-primary text-lg px-8 py-4 flex items-center justify-center"
                  onClick={() => handleButtonClick('Hero CTA - Start Free Trial')}
                >
                  Start 14-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
              <button 
                className="btn-secondary text-lg px-8 py-4"
                onClick={() => handleButtonClick('Hero CTA - Watch Demo')}
              >
                Watch 2-Min Demo
              </button>
            </div>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Setup in 5 minutes
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">10M+</div>
              <div className="text-gray-600">Emails Sent Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">95%</div>
              <div className="text-gray-600">Inbox Placement Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">15K+</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">3.5x</div>
              <div className="text-gray-600">ROI Increase</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to
              <span className="gradient-text"> Dominate Outreach</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From email warmup to AI personalization, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Professional Email Account Management</h3>
              <p className="text-gray-600 mb-4">
                Connect multiple email accounts and manage them automatically with advanced rotation to maximize deliverability
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Deliverability Optimization</h3>
              <p className="text-gray-600 mb-4">
                Our intelligent system builds your sender reputation through gradual engagement to ensure inbox placement
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Advanced Analytics</h3>
              <p className="text-gray-600 mb-4">
                Track opens, clicks, replies, and conversions with our comprehensive analytics dashboard
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Personalization</h3>
              <p className="text-gray-600 mb-4">
                Generate personalized emails at scale using GPT-4 and your prospect data
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Spam Protection</h3>
              <p className="text-gray-600 mb-4">
                Advanced algorithms prevent your emails from landing in spam folders
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">CRM Integration</h3>
              <p className="text-gray-600 mb-4">
                Seamlessly sync with Salesforce, HubSpot, Pipedrive, and 20+ CRMs
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by <span className="gradient-text">15,000+</span> Sales Teams
            </h2>
            <p className="text-xl text-gray-600">
              From startups to Fortune 500 companies
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Mailsender transformed our outreach. We went from 20 meetings/month to 150+ in just 3 months."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full mr-3"></div>
                <div>
                  <div className="font-semibold">Sarah Chen</div>
                  <div className="text-sm text-gray-600">VP Sales, TechCorp</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "The AI personalization is incredible. Our reply rates increased by 300% overnight."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full mr-3"></div>
                <div>
                  <div className="font-semibold">Mike Johnson</div>
                  <div className="text-sm text-gray-600">CEO, GrowthLabs</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Best investment we made. The ROI is insane - paid for itself in the first week."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full mr-3"></div>
                <div>
                  <div className="font-semibold">Lisa Park</div>
                  <div className="text-sm text-gray-600">Head of Growth, ScaleUp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to <span className="gradient-text">10x Your Outreach?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of companies booking more meetings with BOBinbox
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <button className="btn-secondary text-lg px-8 py-4">
              Book a Demo
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-6">
            No credit card required • Setup in 5 minutes • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="text-2xl font-bold mb-4">BOBinbox</div>
              <p className="text-gray-400 mb-4">
                The most powerful B2B email marketing automation platform for modern sales teams.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">in</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">tw</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">fb</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition">Integrations</Link></li>
                <li><Link href="/api" className="hover:text-white transition">API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="/guides" className="hover:text-white transition">Guides</Link></li>
                <li><Link href="/templates" className="hover:text-white transition">Templates</Link></li>
                <li><Link href="/case-studies" className="hover:text-white transition">Case Studies</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition">About</Link></li>
                <li><Link href="/careers" className="hover:text-white transition">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 BOBinbox. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-400 text-sm hover:text-white transition">Terms</Link>
              <Link href="/privacy" className="text-gray-400 text-sm hover:text-white transition">Privacy</Link>
              <Link href="/cookies" className="text-gray-400 text-sm hover:text-white transition">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}