import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap, RefreshCw, Database, Globe, Users, TrendingUp, Mail, Calendar, FileText, Shield } from 'lucide-react'

export const metadata = {
  title: 'Integrations - OPhir Cold Email Platform',
  description: 'Connect OPhir with 50+ CRMs, sales tools, and marketing platforms. Seamless integrations with Salesforce, HubSpot, Pipedrive, and more.',
}

export default function IntegrationsPage() {
  const crmIntegrations = [
    { name: 'Salesforce', logo: '🔸', description: 'Full bi-directional sync with opportunities and leads', popular: true },
    { name: 'HubSpot', logo: '🟠', description: 'Contact sync, deal tracking, and attribution', popular: true },
    { name: 'Pipedrive', logo: '🟢', description: 'Pipeline management and activity tracking', popular: true },
    { name: 'Zoho CRM', logo: '🔴', description: 'Complete contact and opportunity management' },
    { name: 'Microsoft Dynamics', logo: '🔷', description: 'Enterprise-grade CRM integration' },
    { name: 'Copper', logo: '🟤', description: 'Google Workspace native CRM sync' },
  ]

  const emailIntegrations = [
    { name: 'Gmail', logo: '📧', description: 'Native Gmail integration with OAuth2', popular: true },
    { name: 'Outlook', logo: '📨', description: 'Microsoft 365 and Outlook.com support', popular: true },
    { name: 'IMAP/SMTP', logo: '⚡', description: 'Custom email server configurations' },
  ]

  const marketingTools = [
    { name: 'Zapier', logo: '⚡', description: 'Connect with 3000+ apps automatically', popular: true },
    { name: 'Calendly', logo: '📅', description: 'Automatic meeting booking integration' },
    { name: 'LinkedIn Sales Navigator', logo: '💼', description: 'Advanced prospecting and lead enrichment' },
    { name: 'Apollo', logo: '🚀', description: 'Lead database and enrichment platform' },
    { name: 'ZoomInfo', logo: '🔍', description: 'B2B contact database integration' },
    { name: 'Clearbit', logo: '💡', description: 'Real-time lead enrichment and verification' },
  ]

  const analyticsTools = [
    { name: 'Google Analytics', logo: '📊', description: 'Website attribution and conversion tracking' },
    { name: 'Mixpanel', logo: '📈', description: 'Advanced event tracking and analytics' },
    { name: 'Segment', logo: '🔗', description: 'Customer data platform integration' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <span className="text-2xl font-bold gradient-text cursor-pointer">OPhir</span>
              </Link>
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
              <Zap className="w-4 h-4 mr-2" />
              50+ Native Integrations
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Connect Your Entire
              <span className="gradient-text"> Sales Stack</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Seamlessly integrate OPhir with your existing CRM, sales tools, and marketing platforms. 
              Build powerful workflows that save time and increase efficiency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                  Start Integrating Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
              <Link href="/api">
                <button className="btn-secondary text-lg px-8 py-4">
                  View API Docs
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why <span className="gradient-text">Integrate?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Unlock the full potential of your sales process with seamless data flow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Real-time Sync</h3>
              <p className="text-gray-600">Bi-directional data synchronization keeps everything up to date automatically.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Unified Data</h3>
              <p className="text-gray-600">All your prospect and customer data in one place for better insights.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Better Attribution</h3>
              <p className="text-gray-600">Track the full customer journey from first email to closed deal.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Workflow Automation</h3>
              <p className="text-gray-600">Automate repetitive tasks and focus on what matters most - selling.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CRM Integrations */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              CRM <span className="gradient-text">Integrations</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with the world's most popular CRM platforms
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {crmIntegrations.map((integration, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg card-hover relative">
                {integration.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{integration.logo}</div>
                  <h3 className="text-xl font-bold mb-2">{integration.name}</h3>
                  <p className="text-gray-600 text-sm">{integration.description}</p>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Two-way sync
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Real-time updates
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Custom field mapping
                  </div>
                </div>
                <button className="btn-secondary w-full">
                  Connect {integration.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email Providers */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Email <span className="gradient-text">Providers</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Native support for all major email platforms
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {emailIntegrations.map((integration, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg card-hover">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{integration.logo}</div>
                  <h3 className="text-xl font-bold mb-2">{integration.name}</h3>
                  <p className="text-gray-600 text-sm">{integration.description}</p>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    OAuth2 authentication
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Unlimited accounts
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Auto-warmup included
                  </div>
                </div>
                <button className="btn-primary w-full">
                  Setup {integration.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketing Tools */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Marketing & Sales <span className="gradient-text">Tools</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enhance your workflow with powerful third-party integrations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {marketingTools.map((tool, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                <div className="flex items-center mb-4">
                  <div className="text-2xl mr-3">{tool.logo}</div>
                  <div>
                    <h3 className="font-bold">{tool.name}</h3>
                    {tool.popular && (
                      <span className="text-purple-600 text-xs font-medium">Popular</span>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
                <button className="btn-secondary w-full text-sm">
                  Learn More
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Integrations */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Analytics & <span className="gradient-text">Tracking</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get complete visibility into your funnel performance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {analyticsTools.map((tool, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg card-hover">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{tool.logo}</div>
                  <h3 className="text-xl font-bold mb-2">{tool.name}</h3>
                  <p className="text-gray-600 text-sm">{tool.description}</p>
                </div>
                <button className="btn-secondary w-full">
                  Connect {tool.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl p-12 shadow-lg">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Need a Custom <span className="gradient-text">Integration?</span>
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Use our powerful REST API to build custom integrations and workflows that fit your exact needs.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>RESTful API with comprehensive documentation</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Real-time webhooks for instant notifications</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>SDKs available for popular languages</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Rate limiting and enterprise security</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Link href="/api">
                    <button className="btn-primary flex items-center">
                      View API Docs
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </Link>
                  <Link href="/contact">
                    <button className="btn-secondary">
                      Contact Support
                    </button>
                  </Link>
                </div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-6 text-green-400 font-mono text-sm overflow-x-auto">
                <div className="mb-4 text-gray-400">// Example API call</div>
                <div>
                  <span className="text-blue-400">POST</span> /api/campaigns
                  <br />
                  <span className="text-gray-400">Content-Type:</span> application/json
                  <br />
                  <span className="text-gray-400">Authorization:</span> Bearer your_api_key
                  <br /><br />
                  <span className="text-purple-400">{`{`}</span>
                  <br />
                  &nbsp;&nbsp;<span className="text-yellow-400">"name"</span>: <span className="text-green-400">"Q1 Outreach"</span>,
                  <br />
                  &nbsp;&nbsp;<span className="text-yellow-400">"subject"</span>: <span className="text-green-400">"Quick question"</span>,
                  <br />
                  &nbsp;&nbsp;<span className="text-yellow-400">"prospects"</span>: [<span className="text-green-400">"lead@company.com"</span>]
                  <br />
                  <span className="text-purple-400">{`}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Guide */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Easy <span className="gradient-text">Setup Process</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get your integrations up and running in minutes, not hours
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-6 flex-shrink-0">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Choose Your Integration</h3>
                <p className="text-gray-600">Select from our extensive library of pre-built integrations or use our API for custom solutions.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-6 flex-shrink-0">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Authenticate Securely</h3>
                <p className="text-gray-600">Connect your accounts using OAuth2 or API keys with enterprise-grade security measures.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-6 flex-shrink-0">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Configure Data Flow</h3>
                <p className="text-gray-600">Map fields, set sync preferences, and customize how data flows between your platforms.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-6 flex-shrink-0">
                <span className="text-yellow-600 font-bold">4</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Test & Go Live</h3>
                <p className="text-gray-600">Run tests to ensure everything works perfectly, then activate your integration and start seeing results.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to <span className="gradient-text">Integrate Everything?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect your entire sales stack and supercharge your cold email campaigns
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                Start Integrating Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <Link href="/contact">
              <button className="btn-secondary text-lg px-8 py-4">
                Talk to Integration Expert
              </button>
            </Link>
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