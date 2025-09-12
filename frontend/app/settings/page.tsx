'use client'

import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppLayout from '../../components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { 
  Mail, 
  Building, 
  CreditCard, 
  Settings, 
  Users, 
  Globe,
  ArrowRight,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'

function SettingsContent() {
  const settingsCards = [
    {
      title: 'Email Accounts',
      description: 'Manage sending accounts, warmup status, and rotation settings',
      icon: Mail,
      href: '/settings/email-accounts',
      status: 'warning',
      statusText: '2 accounts need attention',
      color: 'border-orange-200 bg-orange-50'
    },
    {
      title: 'Organization',
      description: 'Team members, roles, and organization settings',
      icon: Building,
      href: '/settings/organization',
      status: 'success',
      statusText: 'All set up',
      color: 'border-green-200 bg-green-50'
    },
    {
      title: 'Billing & Usage',
      description: 'Subscription, usage limits, and payment methods',
      icon: CreditCard,
      href: '/settings/billing',
      status: 'success',
      statusText: 'Active subscription',
      color: 'border-blue-200 bg-blue-50'
    },
    {
      title: 'Integrations',
      description: 'CRM connections, webhooks, and third-party apps',
      icon: Globe,
      href: '/settings/integrations',
      status: 'neutral',
      statusText: '3 available',
      color: 'border-gray-200 bg-gray-50'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      default:
        return <Settings className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account, team, and platform configuration</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-gray-600">Email Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-gray-600">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-gray-600">Integrations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-2xl font-bold">89%</p>
                <p className="text-sm text-gray-600">Health Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className={`${card.color} border-2 hover:shadow-lg transition-all cursor-pointer`}>
              <Link href={card.href}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Icon className="h-8 w-8 text-gray-700 mr-3" />
                      <div>
                        <CardTitle className="text-lg">{card.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {card.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(card.status)}
                      <span className="ml-2 text-sm font-medium">{card.statusText}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Link>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common configuration tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/settings/email-accounts/new">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Add Email Account
              </Button>
            </Link>
            <Link href="/settings/organization/invite">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            </Link>
            <Link href="/settings/integrations">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                Connect Integration
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <SettingsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}