import Link from 'next/link'
import { ArrowRight, Code, Database, Zap, Shield, Clock, CheckCircle, Copy, ExternalLink, Book, Users, Settings } from 'lucide-react'

export const metadata = {
  title: 'API Documentation - OPhir Cold Email Platform',
  description: 'Comprehensive REST API documentation for OPhir. Build custom integrations, automate workflows, and manage campaigns programmatically.',
}

export default function APIPage() {
  const endpoints = [
    {
      method: 'GET',
      endpoint: '/api/campaigns',
      description: 'List all campaigns',
      response: 'Array of campaign objects'
    },
    {
      method: 'POST',
      endpoint: '/api/campaigns',
      description: 'Create a new campaign',
      response: 'Created campaign object'
    },
    {
      method: 'GET',
      endpoint: '/api/campaigns/{id}',
      description: 'Get campaign details',
      response: 'Campaign object with full details'
    },
    {
      method: 'PUT',
      endpoint: '/api/campaigns/{id}',
      description: 'Update campaign',
      response: 'Updated campaign object'
    },
    {
      method: 'POST',
      endpoint: '/api/campaigns/{id}/start',
      description: 'Start campaign execution',
      response: 'Campaign execution status'
    },
    {
      method: 'GET',
      endpoint: '/api/prospects',
      description: 'List all prospects',
      response: 'Array of prospect objects'
    },
    {
      method: 'POST',
      endpoint: '/api/prospects',
      description: 'Add new prospects',
      response: 'Created prospect objects'
    },
    {
      method: 'GET',
      endpoint: '/api/analytics/campaigns/{id}',
      description: 'Get campaign analytics',
      response: 'Analytics data object'
    }
  ]

  const sdks = [
    { name: 'Node.js', logo: '🟢', status: 'Available', description: 'Official Node.js SDK with TypeScript support' },
    { name: 'Python', logo: '🐍', status: 'Available', description: 'Python SDK with async/await support' },
    { name: 'PHP', logo: '🐘', status: 'Available', description: 'PHP SDK compatible with Laravel and Symfony' },
    { name: 'Go', logo: '🔷', status: 'Coming Soon', description: 'Go SDK with context support' },
    { name: 'Ruby', logo: '💎', status: 'Coming Soon', description: 'Ruby gem with Rails integration' },
    { name: 'Java', logo: '☕', status: 'Coming Soon', description: 'Java SDK with Spring Boot support' }
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
              <Code className="w-4 h-4 mr-2" />
              RESTful API & SDKs
            </div>
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Build with the
              <span className="gradient-text"> OPhir API</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Powerful REST API that lets you build custom integrations, automate workflows, 
              and manage your cold email campaigns programmatically with enterprise-grade reliability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                  Get API Key Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
              <button className="btn-secondary text-lg px-8 py-4 flex items-center justify-center">
                <ExternalLink className="mr-2 h-5 w-5" />
                View Full Docs
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* API Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              API <span className="gradient-text">Features</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to build robust integrations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">RESTful Design</h3>
              <p className="text-gray-600">Standard HTTP methods and status codes with predictable resource-oriented URLs.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">JSON Responses</h3>
              <p className="text-gray-600">All API responses are in JSON format with consistent structure and error handling.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Authentication</h3>
              <p className="text-gray-600">API key authentication with optional OAuth2 support and rate limiting.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Real-time Webhooks</h3>
              <p className="text-gray-600">Receive instant notifications about campaign events and status changes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Quick <span className="gradient-text">Start Example</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get up and running in minutes with our simple API
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold mb-6">Create Your First Campaign</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <span className="text-purple-600 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Get Your API Key</h4>
                      <p className="text-gray-600 text-sm">Sign up and get your API key from the dashboard settings.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <span className="text-blue-600 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Add Prospects</h4>
                      <p className="text-gray-600 text-sm">Upload your prospect list via API or CSV import.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <span className="text-green-600 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Create Campaign</h4>
                      <p className="text-gray-600 text-sm">Set up your email templates and campaign settings.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <span className="text-yellow-600 font-bold text-sm">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Launch & Monitor</h4>
                      <p className="text-gray-600 text-sm">Start your campaign and track results in real-time.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 text-green-400 font-mono text-sm overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">// Create a new campaign</div>
                <button className="text-gray-400 hover:text-white transition">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                <div><span className="text-blue-400">const</span> <span className="text-yellow-400">campaign</span> <span className="text-white">=</span> <span className="text-blue-400">await</span> <span className="text-yellow-400">fetch</span><span className="text-white">(</span></div>
                <div className="ml-2"><span className="text-green-400">'https://api.ophir.com/v1/campaigns'</span><span className="text-white">,</span></div>
                <div className="ml-2"><span className="text-white">{`{`}</span></div>
                <div className="ml-4"><span className="text-yellow-400">method</span><span className="text-white">:</span> <span className="text-green-400">'POST'</span><span className="text-white">,</span></div>
                <div className="ml-4"><span className="text-yellow-400">headers</span><span className="text-white">:</span> <span className="text-white">{`{`}</span></div>
                <div className="ml-6"><span className="text-green-400">'Authorization'</span><span className="text-white">:</span> <span className="text-green-400">'Bearer YOUR_API_KEY'</span><span className="text-white">,</span></div>
                <div className="ml-6"><span className="text-green-400">'Content-Type'</span><span className="text-white">:</span> <span className="text-green-400">'application/json'</span></div>
                <div className="ml-4"><span className="text-white">{`}`}</span><span className="text-white">,</span></div>
                <div className="ml-4"><span className="text-yellow-400">body</span><span className="text-white">:</span> <span className="text-yellow-400">JSON</span><span className="text-white">.</span><span className="text-yellow-400">stringify</span><span className="text-white">({`{`}</span></div>
                <div className="ml-6"><span className="text-yellow-400">name</span><span className="text-white">:</span> <span className="text-green-400">'Q1 Outreach Campaign'</span><span className="text-white">,</span></div>
                <div className="ml-6"><span className="text-yellow-400">subject</span><span className="text-white">:</span> <span className="text-green-400">'Quick question about {`{company}`}'</span><span className="text-white">,</span></div>
                <div className="ml-6"><span className="text-yellow-400">template</span><span className="text-white">:</span> <span className="text-green-400">'Hi {`{firstName}`}, ...'</span><span className="text-white">,</span></div>
                <div className="ml-6"><span className="text-yellow-400">prospects</span><span className="text-white">:</span> <span className="text-white">[</span><span className="text-green-400">'lead@company.com'</span><span className="text-white">]</span></div>
                <div className="ml-4"><span className="text-white">{`}`}</span><span className="text-white">)</span></div>
                <div className="ml-2"><span className="text-white">{`}`}</span></div>
                <div><span className="text-white">)</span><span className="text-white">.</span><span className="text-yellow-400">then</span><span className="text-white">(</span><span className="text-yellow-400">res</span> <span className="text-white">{`=>`}</span> <span className="text-yellow-400">res</span><span className="text-white">.</span><span className="text-yellow-400">json</span><span className="text-white">())</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Core <span className="gradient-text">Endpoints</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Main API endpoints to get you started
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-4 text-left font-semibold">Method</th>
                    <th className="px-6 py-4 text-left font-semibold">Endpoint</th>
                    <th className="px-6 py-4 text-left font-semibold">Description</th>
                    <th className="px-6 py-4 text-left font-semibold">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((endpoint, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">{endpoint.endpoint}</td>
                      <td className="px-6 py-4 text-gray-600">{endpoint.description}</td>
                      <td className="px-6 py-4 text-gray-600">{endpoint.response}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center mt-8">
            <button className="btn-secondary flex items-center mx-auto">
              <Book className="w-4 h-4 mr-2" />
              View Complete API Reference
            </button>
          </div>
        </div>
      </section>

      {/* SDKs */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Official <span className="gradient-text">SDKs</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Pre-built SDKs for popular programming languages
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sdks.map((sdk, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg card-hover">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">{sdk.logo}</div>
                    <h3 className="text-xl font-bold">{sdk.name}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    sdk.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sdk.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-6">{sdk.description}</p>
                <button className={`w-full ${sdk.status === 'Available' ? 'btn-primary' : 'btn-secondary cursor-not-allowed'}`}>
                  {sdk.status === 'Available' ? 'Download SDK' : 'Coming Soon'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl p-12 shadow-lg">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Real-time <span className="gradient-text">Webhooks</span>
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Stay informed about campaign events, email opens, clicks, and replies with our webhook system.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Campaign status updates</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Email opens and clicks tracking</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Reply notifications</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span>Delivery status updates</span>
                  </div>
                </div>
                <button className="btn-primary flex items-center">
                  Setup Webhooks
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
              <div className="bg-gray-900 rounded-2xl p-6 text-green-400 font-mono text-sm overflow-x-auto">
                <div className="mb-4 text-gray-400">// Webhook payload example</div>
                <div>
                  <span className="text-purple-400">{`{`}</span>
                  <br />
                  &nbsp;&nbsp;<span className="text-yellow-400">"event"</span>: <span className="text-green-400">"email.opened"</span>,
                  <br />
                  &nbsp;&nbsp;<span className="text-yellow-400">"timestamp"</span>: <span className="text-green-400">"2025-01-24T10:30:00Z"</span>,
                  <br />
                  &nbsp;&nbsp;<span className="text-yellow-400">"data"</span>: <span className="text-purple-400">{`{`}</span>
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-400">"campaign_id"</span>: <span className="text-green-400">"camp_123"</span>,
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-400">"prospect_email"</span>: <span className="text-green-400">"lead@company.com"</span>,
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-400">"user_agent"</span>: <span className="text-green-400">"Mozilla/5.0..."</span>,
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-400">"ip_address"</span>: <span className="text-green-400">"192.168.1.1"</span>
                  <br />
                  &nbsp;&nbsp;<span className="text-purple-400">{`}`}</span>,
                  <br />
                  &nbsp;&nbsp;<span className="text-yellow-400">"webhook_id"</span>: <span className="text-green-400">"wh_456"</span>
                  <br />
                  <span className="text-purple-400">{`}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rate Limits & Authentication */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Authentication & <span className="gradient-text">Limits</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Secure and reliable API access with generous limits
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Authentication</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">API Key Authentication</h4>
                  <p className="text-gray-600 text-sm">Include your API key in the Authorization header for all requests.</p>
                  <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm mt-2">
                    Authorization: Bearer your_api_key
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">OAuth2 (Coming Soon)</h4>
                  <p className="text-gray-600 text-sm">Full OAuth2 support for third-party integrations and enhanced security.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Rate Limits</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Starter Plan</span>
                  <span className="text-gray-600">1,000 req/hour</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Pro Plan</span>
                  <span className="text-gray-600">5,000 req/hour</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Enterprise</span>
                  <span className="text-gray-600">Custom limits</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Rate limits are applied per API key. Contact support for higher limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to <span className="gradient-text">Start Building?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Get your API key today and start integrating OPhir into your workflow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                Get API Key Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <Link href="/contact">
              <button className="btn-secondary text-lg px-8 py-4">
                Talk to Developer Support
              </button>
            </Link>
          </div>
          <p className="text-sm text-gray-600 mt-6">
            No credit card required • Generous free tier • Comprehensive docs
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