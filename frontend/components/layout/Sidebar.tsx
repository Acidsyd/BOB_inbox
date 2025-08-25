'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  TrendingUp, 
  Settings, 
  Inbox,
  Plus,
  LogOut,
  ChevronDown,
  Target,
  Upload,
  FileSpreadsheet,
  Database,
  Zap,
  Layout,
  History,
  Filter,
  BarChart3,
  FileText,
  HelpCircle
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard', 
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Import Leads',
    href: '/import-leads',
    icon: Upload,
    isPrimary: true,
    children: [
      { name: 'Upload Files', href: '/import-leads' },
      { name: 'Field Mapping', href: '/import-leads/mapping' },
      { name: 'Import History', href: '/import-leads/history' },
      { name: 'Templates', href: '/import-leads/templates' },
    ]
  },
  {
    name: 'Manage Leads',
    href: '/leads',
    icon: Users,
    children: [
      { name: 'All Leads', href: '/leads' },
      { name: 'List Views', href: '/leads/views' },
      { name: 'Enrichment', href: '/leads/enrichment' },
      { name: 'Formula Columns', href: '/leads/formulas' },
    ]
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: Target,
    children: [
      { name: 'All Campaigns', href: '/campaigns' },
      { name: 'Create Campaign', href: '/campaigns/new' },
    ]
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Activity Logs',
    href: '/logs',
    icon: FileText,
  },
  {
    name: 'Support',
    href: '/support',
    icon: HelpCircle,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { name: 'Email Accounts', href: '/settings/email-accounts' },
      { name: 'API Integrations', href: '/settings/api-integrations' },
      { name: 'Column Templates', href: '/settings/column-templates' },
      { name: 'Organization', href: '/settings/organization' },
      { name: 'Billing', href: '/settings/billing' },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Import Leads', 'Manage Leads'])

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
          <Link href="/dashboard" className="text-2xl font-bold gradient-text">
            Mailsender
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
            const isPrimary = (item as any).isPrimary

            return (
              <div key={item.name}>
                <div className="group">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors ${
                        isActive 
                          ? 'bg-purple-50 text-purple-700' 
                          : isPrimary
                            ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                            : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className={`mr-3 h-5 w-5 ${isPrimary ? 'text-purple-600' : ''}`} />
                        <span className={isPrimary ? 'font-semibold' : ''}>{item.name}</span>
                        {isPrimary && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                            NEW
                          </span>
                        )}
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
                          : isPrimary
                            ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isPrimary ? 'text-purple-600' : ''}`} />
                      <span className={isPrimary ? 'font-semibold' : ''}>{item.name}</span>
                      {isPrimary && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                          NEW
                        </span>
                      )}
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

        {/* Quick Action Buttons */}
        <div className="px-4 pb-4 space-y-2">
          <Link href="/import-leads">
            <button className="btn-primary w-full flex items-center justify-center">
              <Upload className="h-4 w-4 mr-2" />
              Import Leads
            </button>
          </Link>
          <Link href="/campaigns/new">
            <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </button>
          </Link>
        </div>

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