import Link from 'next/link'
import { ArrowLeft, Home, Search, Mail, BookOpen, Phone } from 'lucide-react'

export const metadata = {
  title: '404 - Page Not Found | OPhir',
  description: 'The page you are looking for could not be found. Return to OPhir homepage or explore our resources.',
}

export default function NotFound() {
  const popularPages = [
    { name: 'Features', href: '/features', icon: Mail, description: 'Explore our powerful cold email features' },
    { name: 'Pricing', href: '/pricing', icon: BookOpen, description: 'View our flexible pricing plans' },
    { name: 'Resources', href: '/resources', icon: BookOpen, description: 'Guides, templates, and best practices' },
    { name: 'Contact', href: '/contact', icon: Phone, description: 'Get in touch with our team' },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
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

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* 404 Illustration */}
          <div className="mb-12">
            <div className="text-9xl font-bold gradient-text mb-4">404</div>
            <div className="text-6xl mb-8">🔍</div>
          </div>

          {/* Error Message */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Oops! Page <span className="gradient-text">Not Found</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              The page you're looking for seems to have vanished into the digital ether. 
              Don't worry though - we've got plenty of other great content to explore!
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/">
              <button className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                <Home className="mr-2 h-5 w-5" />
                Back to Homepage
              </button>
            </Link>
            <Link href="/resources">
              <button className="btn-secondary text-lg px-8 py-4 flex items-center justify-center">
                <Search className="mr-2 h-5 w-5" />
                Browse Resources
              </button>
            </Link>
          </div>

          {/* Popular Pages */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Popular <span className="gradient-text">Pages</span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularPages.map((page, index) => (
                <Link key={index} href={page.href} className="group">
                  <div className="bg-white rounded-2xl p-6 shadow-lg card-hover text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition">
                      <page.icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{page.name}</h3>
                    <p className="text-sm text-gray-600">{page.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Still <span className="gradient-text">Looking?</span>
            </h2>
            <p className="text-gray-600 mb-6">
              Try searching for what you need or contact our support team
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search our site..." 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>
              <button className="btn-primary px-6 py-3">
                Search
              </button>
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Or{' '}
                <Link href="/contact" className="text-purple-600 hover:text-purple-700 font-medium">
                  contact our support team
                </Link>
                {' '}for immediate assistance
              </p>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-12 p-6 bg-blue-50 rounded-2xl">
            <h3 className="font-bold text-gray-900 mb-2">Need Help Getting Started?</h3>
            <p className="text-gray-600 mb-4">
              Our team is here to help you succeed with cold email outreach. 
              Get personalized guidance and expert advice.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact">
                <button className="btn-secondary text-sm px-6 py-2">
                  Talk to Expert
                </button>
              </Link>
              <Link href="/resources">
                <button className="btn-secondary text-sm px-6 py-2">
                  Browse Resources
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-2xl font-bold mb-2">OPhir</div>
              <p className="text-gray-400 text-sm">
                The most powerful cold email platform for modern sales teams.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="/terms" className="text-gray-400 text-sm hover:text-white transition">Terms</Link>
              <Link href="/privacy" className="text-gray-400 text-sm hover:text-white transition">Privacy</Link>
              <Link href="/cookies" className="text-gray-400 text-sm hover:text-white transition">Cookies</Link>
              <Link href="/contact" className="text-gray-400 text-sm hover:text-white transition">Contact</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 OPhir. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}