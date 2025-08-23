import Link from 'next/link'
import { ArrowRight, Check, Zap, Crown, Rocket } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold gradient-text">OPhir</Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-600 hover:text-gray-900 transition">Features</Link>
              <Link href="/pricing" className="text-purple-600 font-medium">Pricing</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition">Login</Link>
              <Link href="/register">
                <button className="btn-primary">Start Free Trial</button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 gradient-bg">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent
            <span className="gradient-text"> Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your team size and sending volume. All plans include our core features with 14-day free trial.
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <Check className="w-4 h-4 mr-2" />
            No setup fees • No credit card required for trial
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Starter Plan */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 card-hover">
              <div className="flex items-center mb-4">
                <Zap className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">Starter</h3>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">$49<span className="text-lg font-normal text-gray-600">/month</span></div>
                <p className="text-gray-600">Perfect for small teams getting started</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 5 email accounts</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>10,000 emails/month</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Basic warmup & deliverability</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Email sequences</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Email support</span>
                </li>
              </ul>
              
              <Link href="/register">
                <button className="btn-secondary w-full">
                  Start Free Trial
                </button>
              </Link>
            </div>

            {/* Growth Plan - Most Popular */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-purple-500 card-hover relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <Crown className="w-8 h-8 text-purple-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">Growth</h3>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">$149<span className="text-lg font-normal text-gray-600">/month</span></div>
                <p className="text-gray-600">Ideal for growing sales teams</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 25 email accounts</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>100,000 emails/month</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced AI warmup</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>AI personalization</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>CRM integrations</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Priority support</span>
                </li>
              </ul>
              
              <Link href="/register">
                <button className="btn-primary w-full">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 card-hover">
              <div className="flex items-center mb-4">
                <Rocket className="w-8 h-8 text-orange-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">Enterprise</h3>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">$499<span className="text-lg font-normal text-gray-600">/month</span></div>
                <p className="text-gray-600">For large teams and enterprises</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited email accounts</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>1M+ emails/month</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>White-label solution</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced team management</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Dedicated success manager</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>24/7 phone support</span>
                </li>
              </ul>
              
              <button className="btn-secondary w-full">
                Contact Sales
              </button>
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
              <h3 className="text-xl font-bold text-gray-900 mb-3">What's included in the free trial?</h3>
              <p className="text-gray-600">You get full access to all Growth plan features for 14 days, including 25 email accounts, AI personalization, and advanced analytics. No credit card required.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Can I change plans anytime?</h3>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate the billing accordingly.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What email providers do you support?</h3>
              <p className="text-gray-600">We support all major email providers including Gmail, Outlook, Yahoo, and custom SMTP servers. Our system works with any email account that supports IMAP/SMTP.</p>
            </div>

            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How do you ensure high deliverability?</h3>
              <p className="text-gray-600">Our AI-powered warmup system gradually builds your sender reputation, we monitor blacklists in real-time, and we provide automated SPF/DKIM/DMARC setup for optimal deliverability.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Your
            <span className="gradient-text"> Free Trial?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of companies scaling their outreach with OPhir
          </p>
          <Link href="/register">
            <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center mx-auto">
              Start 14-Day Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </Link>
          <p className="text-sm text-gray-600 mt-4">
            No credit card required • Setup in 5 minutes • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  )
}