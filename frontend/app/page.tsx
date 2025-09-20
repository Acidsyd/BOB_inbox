'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap, Shield, Users, BarChart3, Mail, Globe, Sparkles, TrendingUp, Inbox, Search, Calendar } from 'lucide-react'

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
              <img src="/mailsender-icon.png" alt="BOBinbox" className="w-12 h-12 rounded-xl shadow-md" />
              <span className="text-3xl font-bold gradient-text">BOBinbox</span>
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
              <Mail className="w-4 h-4 mr-2" />
              The Smart Email Client for Modern Professionals
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Unify All Your Email
              <span className="gradient-text"> In One Place</span>
              <br />
              Like Gmail, But Smarter
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A professional email client that brings together all your email accounts with intelligent
              organization, advanced search, and productivity features that help you manage
              your communication more efficiently.
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
              <div className="text-4xl font-bold gradient-text mb-2">100+</div>
              <div className="text-gray-600">Email Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">15K+</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text mb-2">24/7</div>
              <div className="text-gray-600">Email Sync</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for
              <span className="gradient-text"> Professional Email</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From unified inbox to smart organization, all your email tools in one place
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Inbox className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Unified Inbox</h3>
              <p className="text-gray-600 mb-4">
                Connect all your email accounts (Gmail, Outlook, IMAP) and manage them from one intelligent inbox with conversation threading
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Search & Organization</h3>
              <p className="text-gray-600 mb-4">
                Find any email instantly with advanced search, smart filters, and automatic organization across all your accounts
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Rich Text Composition</h3>
              <p className="text-gray-600 mb-4">
                Compose beautiful emails with our advanced rich text editor, templates, and variable insertion for professional communication
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Scheduling</h3>
              <p className="text-gray-600 mb-4">
                Schedule emails across timezones, set follow-up sequences, and automate your communication workflow
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Enterprise Security</h3>
              <p className="text-gray-600 mb-4">
                OAuth2 authentication, end-to-end encryption, and enterprise-grade security for your sensitive communications
              </p>
              <Link href="/features" className="text-purple-600 font-medium flex items-center">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Productivity Analytics</h3>
              <p className="text-gray-600 mb-4">
                Track email activity, response times, and communication patterns to improve your productivity
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
              Trusted by <span className="gradient-text">15,000+</span> Professionals
            </h2>
            <p className="text-xl text-gray-600">
              From freelancers to Fortune 500 companies
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
                "BOBinbox revolutionized how I manage email. All my accounts in one place with smart organization - it's like having a personal assistant."
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
                "The unified inbox and smart search saved me hours every week. Finding emails across 5 accounts is now instant."
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
                "Finally, an email client that works like I think. Thread conversations, smart scheduling, and beautiful composition."
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
            Ready to <span className="gradient-text">Transform Your Email?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of professionals managing their email smarter with BOBinbox
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
                The smart email client that unifies all your accounts with professional productivity features.
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