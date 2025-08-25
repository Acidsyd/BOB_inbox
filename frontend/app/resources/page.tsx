import Link from 'next/link'
import { ArrowRight, BookOpen, Users, FileText, Video, Download, TrendingUp, Target, Zap, Clock, BarChart3 } from 'lucide-react'

export const metadata = {
  title: 'Resources - OPhir Cold Email Platform',
  description: 'Access comprehensive cold email resources, guides, templates, best practices, and educational content to maximize your outreach success.',
}

export default function ResourcesPage() {
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
              <Link href="/resources" className="text-gray-900 font-medium">Resources</Link>
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
            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Cold Email <span className="gradient-text">Resources Hub</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Everything you need to master cold email outreach - from beginner guides 
              to advanced strategies, templates, and industry insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/guides">
                <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                  Browse Guides
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
              <Link href="/templates">
                <button className="btn-secondary text-lg px-8 py-4">
                  View Templates
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Guides */}
            <Link href="/guides" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition">
                  <BookOpen className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Email Guides</h3>
                <p className="text-gray-600 mb-4">Comprehensive guides covering cold email best practices, deliverability, and strategy.</p>
                <div className="text-purple-600 font-medium flex items-center justify-center">
                  Explore Guides <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>

            {/* Templates */}
            <Link href="/templates" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Email Templates</h3>
                <p className="text-gray-600 mb-4">Proven email templates for different industries and use cases that drive results.</p>
                <div className="text-purple-600 font-medium flex items-center justify-center">
                  Browse Templates <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>

            {/* Case Studies */}
            <Link href="/case-studies" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Case Studies</h3>
                <p className="text-gray-600 mb-4">Real success stories and results from companies using OPhir for cold email.</p>
                <div className="text-purple-600 font-medium flex items-center justify-center">
                  Read Stories <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>

            {/* Blog */}
            <Link href="/blog" className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg card-hover text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-200 transition">
                  <Users className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Blog & Insights</h3>
                <p className="text-gray-600 mb-4">Latest insights, tips, and trends in cold email marketing and sales automation.</p>
                <div className="text-purple-600 font-medium flex items-center justify-center">
                  Read Blog <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access Resources */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Quick Access <span className="gradient-text">Resources</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get instant access to our most popular resources
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Cold Email Checklist */}
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Cold Email Checklist</h3>
              <p className="text-gray-600 mb-4">
                Essential checklist to ensure your cold emails are optimized for maximum deliverability and response rates.
              </p>
              <button className="btn-secondary w-full flex items-center justify-center">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>

            {/* Email Deliverability Guide */}
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Deliverability Masterclass</h3>
              <p className="text-gray-600 mb-4">
                Complete guide to email deliverability, spam prevention, and inbox placement optimization.
              </p>
              <Link href="/guides">
                <button className="btn-secondary w-full">
                  Read Guide
                </button>
              </Link>
            </div>

            {/* ROI Calculator */}
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">ROI Calculator</h3>
              <p className="text-gray-600 mb-4">
                Calculate the potential ROI of your cold email campaigns with our interactive calculator tool.
              </p>
              <button className="btn-secondary w-full">
                Open Calculator
              </button>
            </div>

            {/* Video Tutorials */}
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                <Video className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Video Tutorials</h3>
              <p className="text-gray-600 mb-4">
                Step-by-step video tutorials covering platform setup, campaign creation, and optimization.
              </p>
              <button className="btn-secondary w-full">
                Watch Videos
              </button>
            </div>

            {/* Email Warmup Guide */}
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Email Warmup Strategy</h3>
              <p className="text-gray-600 mb-4">
                Learn how to properly warm up your email accounts for maximum deliverability and reputation.
              </p>
              <Link href="/guides">
                <button className="btn-secondary w-full">
                  Read Strategy
                </button>
              </Link>
            </div>

            {/* Industry Benchmarks */}
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">Industry Benchmarks</h3>
              <p className="text-gray-600 mb-4">
                Compare your performance against industry standards and best-performing campaigns.
              </p>
              <button className="btn-secondary w-full flex items-center justify-center">
                <Download className="w-4 h-4 mr-2" />
                Get Report
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Path */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Cold Email <span className="gradient-text">Learning Path</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Follow our structured learning path to master cold email from beginner to expert
            </p>
          </div>

          <div className="space-y-8">
            {/* Beginner */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-green-600 font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Beginner Level</h3>
                  <p className="text-gray-600">Master the fundamentals of cold email</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Cold Email Basics</h4>
                  <p className="text-sm text-gray-600">Understanding cold email fundamentals and best practices</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Email Setup</h4>
                  <p className="text-sm text-gray-600">Setting up domains, accounts, and basic authentication</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">First Campaign</h4>
                  <p className="text-sm text-gray-600">Creating and launching your first cold email campaign</p>
                </div>
              </div>
            </div>

            {/* Intermediate */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Intermediate Level</h3>
                  <p className="text-gray-600">Advanced strategies and optimization techniques</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Personalization</h4>
                  <p className="text-sm text-gray-600">Advanced personalization techniques and AI integration</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Deliverability</h4>
                  <p className="text-sm text-gray-600">Optimizing for inbox placement and reputation management</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Analytics</h4>
                  <p className="text-sm text-gray-600">Understanding metrics and optimizing performance</p>
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Advanced Level</h3>
                  <p className="text-gray-600">Expert-level automation and scaling strategies</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Automation</h4>
                  <p className="text-sm text-gray-600">Complex sequences and multi-channel automation</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Scaling</h4>
                  <p className="text-sm text-gray-600">Managing multiple accounts and enterprise-level campaigns</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Integration</h4>
                  <p className="text-sm text-gray-600">CRM integration, APIs, and custom workflows</p>
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
            Ready to Put Knowledge <span className="gradient-text">Into Action?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start your free trial and apply what you've learned with the most powerful cold email platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
            <Link href="/contact">
              <button className="btn-secondary text-lg px-8 py-4">
                Talk to Expert
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