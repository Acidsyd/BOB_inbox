import Link from 'next/link'
import { ArrowRight, Mail, Zap, Shield, Users, BarChart3, Globe, Sparkles, TrendingUp, CheckCircle, Clock, Target, Inbox, Search, Calendar, FileText } from 'lucide-react'

export const metadata = {
  title: 'Features - BOBinbox Professional Email Client',
  description: 'Discover all the powerful features of BOBinbox - unified inbox, smart organization, professional composition, and productivity tools that make email management effortless.',
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold gradient-text">BOBinbox</Link>
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
            Everything You Need for
            <span className="gradient-text"> Professional Email</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            From unified inbox management to smart organization, BOBinbox provides all the tools you need to manage your email communication like a pro.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Inbox Management */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Inbox Management</h2>
                <p className="text-gray-600">Unified inbox that brings all your email accounts together</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Unified Inbox</h3>
                  <p className="text-gray-600 mb-4">See all your emails from multiple accounts in one streamlined view</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Gmail, Outlook, IMAP support
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Smart Threading</h3>
                  <p className="text-gray-600 mb-4">Intelligent conversation threading keeps related emails organized</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    RFC-compliant threading
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Advanced Search</h3>
                  <p className="text-gray-600 mb-4">Find any email instantly with powerful search across all accounts</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Full-text search & filters
                  </div>
                </div>
              </div>
            </div>

            {/* Productivity Tools */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Productivity Tools</h2>
                <p className="text-gray-600">Professional features that save you time</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Rich Text Composition</h3>
                  <p className="text-gray-600 mb-4">Professional email editor with formatting, attachments, and templates</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Full HTML editor & attachments
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Smart Scheduling</h3>
                  <p className="text-gray-600 mb-4">Schedule emails to send at the perfect time across timezones</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Timezone intelligence
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Email Templates</h3>
                  <p className="text-gray-600 mb-4">Save and reuse your most effective email templates</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Template library & variables
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Collaboration */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Security & Collaboration</h2>
                <p className="text-gray-600">Enterprise-grade security with team features</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">OAuth2 Authentication</h3>
                  <p className="text-gray-600 mb-4">Secure OAuth2 integration with Gmail and Outlook - no passwords stored</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Bank-level security
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Team Workspaces</h3>
                  <p className="text-gray-600 mb-4">Organize your team with shared inboxes and collaborative features</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Multi-user access
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                  <h3 className="text-lg font-bold mb-2">Data Encryption</h3>
                  <p className="text-gray-600 mb-4">End-to-end encryption ensures your emails stay private and secure</p>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    256-bit encryption
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
              Professional Features for
              <span className="gradient-text"> Modern Teams</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Search className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Powerful Search</h3>
              <p className="text-gray-600">Find any email instantly with advanced search filters across all your accounts.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <FileText className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Attachment Management</h3>
              <p className="text-gray-600">Easily manage, preview, and organize attachments from all your email accounts.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Users className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Contact Management</h3>
              <p className="text-gray-600">Smart contact organization with conversation history and interaction tracking.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Calendar className="w-12 h-12 text-yellow-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Calendar Integration</h3>
              <p className="text-gray-600">Seamlessly integrate with your calendar for meeting scheduling and reminders.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <Globe className="w-12 h-12 text-red-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Multi-Language Support</h3>
              <p className="text-gray-600">Work in your preferred language with support for multiple international languages.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <BarChart3 className="w-12 h-12 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Email Analytics</h3>
              <p className="text-gray-600">Track your email activity and productivity with insightful analytics and reports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Unify Your
            <span className="gradient-text"> Email Experience?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of professionals who have simplified their email management with BOBinbox
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
              <div className="text-2xl font-bold mb-4">BOBinbox</div>
              <p className="text-gray-400 mb-4">
                The smart email client that unifies all your email accounts in one place.
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