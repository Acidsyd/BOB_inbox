import Link from 'next/link'
import { ArrowRight, Mail, Zap, Shield, Users, BarChart3, Globe, Sparkles, TrendingUp, CheckCircle, Clock, Target } from 'lucide-react'

export const metadata = {
  title: 'Features - OPhir B2B Email Marketing Platform',
  description: 'Discover all the powerful features of OPhir - professional email account management, AI-powered deliverability optimization, advanced analytics, personalization, and more for B2B email marketing success.',
}

export default function FeaturesPage() {
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
              <Link href="/features" className="text-purple-600 font-medium">Features</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</Link>
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
            Everything You Need to
            <span className="gradient-text"> Dominate Outreach</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            From deliverability optimization to AI personalization, OPhir provides all the tools you need to scale your B2B email marketing campaigns while maintaining exceptional deliverability.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Email Management */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Management</h2>
                <p className="text-gray-600">Powerful tools to manage unlimited email accounts</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Unlimited Email Accounts</h3>
                  <p className="text-gray-600 mb-4">Connect and manage unlimited email accounts from all major providers</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Gmail, Outlook, Custom SMTP
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Smart Rotation</h3>
                  <p className="text-gray-600 mb-4">Automatically rotate email accounts to maximize deliverability</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    AI-powered rotation logic
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Health Monitoring</h3>
                  <p className="text-gray-600 mb-4">Real-time monitoring of email account health and reputation</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    24/7 reputation tracking
                  </div>
                </div>
              </div>
            </div>

            {/* Deliverability */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Deliverability</h2>
                <p className="text-gray-600">Industry-leading inbox placement rates</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">AI-Powered Warmup</h3>
                  <p className="text-gray-600 mb-4">Intelligent warmup system that builds sender reputation gradually</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    95%+ inbox placement rate
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Spam Protection</h3>
                  <p className="text-gray-600 mb-4">Advanced algorithms prevent emails from landing in spam folders</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Real-time spam testing
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Domain Authentication</h3>
                  <p className="text-gray-600 mb-4">Automated SPF, DKIM, and DMARC setup for maximum trust</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    One-click DNS setup
                  </div>
                </div>
              </div>
            </div>

            {/* Automation */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Automation</h2>
                <p className="text-gray-600">Intelligent automation that scales</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">AI Personalization</h3>
                  <p className="text-gray-600 mb-4">Generate personalized emails at scale using GPT-4</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Advanced AI models
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Smart Sequences</h3>
                  <p className="text-gray-600 mb-4">Automated follow-up sequences with intelligent timing</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Behavioral triggers
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Reply Detection</h3>
                  <p className="text-gray-600 mb-4">Automatically pause sequences when prospects reply</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    99% accuracy rate
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Advanced Features for
              <span className="gradient-text"> Enterprise Teams</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <BarChart3 className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Advanced Analytics</h3>
              <p className="text-gray-600">Track opens, clicks, replies, and conversions with detailed insights and attribution.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Globe className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">CRM Integration</h3>
              <p className="text-gray-600">Seamlessly sync with Salesforce, HubSpot, Pipedrive, and 20+ other CRMs.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Users className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Team Collaboration</h3>
              <p className="text-gray-600">Multi-user access with role-based permissions and team performance tracking.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Clock className="w-12 h-12 text-yellow-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Timezone Intelligence</h3>
              <p className="text-gray-600">Send emails at the optimal time for each prospect's timezone automatically.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Target className="w-12 h-12 text-red-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Lead Scoring</h3>
              <p className="text-gray-600">AI-powered lead scoring to prioritize your hottest prospects automatically.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Sparkles className="w-12 h-12 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">A/B Testing</h3>
              <p className="text-gray-600">Test subject lines, content, and sending times to optimize performance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your
            <span className="gradient-text"> Cold Email Game?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of companies already scaling their outreach with OPhir
          </p>
          <Link href="/register">
            <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center mx-auto">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="text-2xl font-bold mb-4">OPhir</div>
              <p className="text-gray-400 mb-4">
                The most powerful cold email platform for modern sales teams.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">in</span>
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">tw</span>
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
              © 2025 OPhir. All rights reserved.
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