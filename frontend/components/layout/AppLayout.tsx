'use client'

import { useAuth } from '../lib/auth/context'
import { Menu, X, Bell, Search, ChevronRight, Home } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Link from 'next/link'

interface AppLayoutProps {
  children: React.ReactNode
  hideHeader?: boolean
  hideFooter?: boolean
}

interface BreadcrumbItem {
  label: string
  href?: string
}

const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean)
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' }
  ]
  
  if (segments.length === 0 || segments[0] === 'dashboard') {
    return [{ label: 'Dashboard' }]
  }
  
  // Define route mappings
  const routeMap: Record<string, string> = {
    'import-leads': 'Import Leads',
    'leads': 'Manage Leads',
    'campaigns': 'Campaigns',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'mapping': 'Field Mapping',
    'history': 'Import History',
    'templates': 'Templates',
    'views': 'List Views',
    'enrichment': 'Enrichment',
    'formulas': 'Formula Columns',
    'new': 'Create New',
    'email-accounts': 'Email Accounts',
    'api-integrations': 'API Integrations',
    'column-templates': 'Column Templates',
    'billing': 'Billing',
    'organization': 'Organization'
  }
  
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    
    if (index === segments.length - 1) {
      breadcrumbs.push({ label })
    } else {
      breadcrumbs.push({ label, href: currentPath })
    }
  })
  
  return breadcrumbs
}

export default function AppLayout({ children, hideHeader = false, hideFooter = false }: AppLayoutProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const breadcrumbs = useMemo(() => getBreadcrumbs(pathname), [pathname])

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <nav className="fixed top-0 left-0 bottom-0 flex flex-col w-5/6 max-w-sm bg-white border-r border-gray-200">
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <Link href="/dashboard" className="text-2xl font-bold gradient-text">
              Mailsender
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Sidebar />
          </div>
        </nav>
      </div>

      {/* Desktop sidebar - hide for full screen layouts */}
      {!hideHeader && <Sidebar />}

      {/* Main content area */}
      <div className="flex flex-col w-0 flex-1 min-h-0">
        {/* Top header - conditionally rendered */}
        {!hideHeader && (
          <header className="bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-6 py-4 md:px-8">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Breadcrumbs */}
              <div className="hidden sm:flex items-center">
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2">
                    {breadcrumbs.map((breadcrumb, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <ChevronRight className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" />
                        )}
                        {breadcrumb.href ? (
                          <Link
                            href={breadcrumb.href}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            {breadcrumb.label}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {breadcrumb.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
              </button>

              {/* User profile */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                  <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}