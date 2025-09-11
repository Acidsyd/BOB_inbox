'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../lib/auth/context'
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Settings, 
  Inbox,
  LogOut,
  ChevronDown,
  Target,
  FileText,
  HelpCircle,
  BarChart3
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    name: 'Inbox',
    href: '/inbox',
    icon: Inbox,
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: Target,
  },
  {
    name: 'Lead Lists',
    href: '/leads/lists',
    icon: Users,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { name: 'Email Accounts', href: '/settings/email-accounts' },
      { name: 'Billing', href: '/settings/billing' },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Settings'])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    )
  }

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4">
          <Link href="/dashboard" className="flex items-center space-x-4">
            <img src="/bobinbox-icon.png" alt="BOBinbox" className="w-16 h-16 rounded-lg shadow-sm" />
            <span className="text-3xl font-bold gradient-text">BOBinbox</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="mt-8 px-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isExpanded = expandedItems.includes(item.name)
            const hasChildren = item.children && item.children.length > 0
            const isMainAction = (item as any).isMainAction

            return (
              <div key={item.name}>
                <div className="group">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive 
                          ? 'bg-purple-50 text-purple-700' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="mr-3 h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children!.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`group flex items-center px-2 py-2 text-sm rounded-md ${
                          pathname === child.href
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>


        {/* Logout */}
        <div className="px-4 pb-4 border-t border-gray-200 pt-4">
          <button
            onClick={logout}
            className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}