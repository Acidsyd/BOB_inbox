'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  FileText,
  Calculator,
  DollarSign,
  Settings,
  Download,
  RefreshCw,
  TrendingUp,
  Zap,
  Shield,
  Globe
} from 'lucide-react'

// Import all the advanced billing components
import AdvancedUsageAnalytics from './AdvancedUsageAnalytics'
import AdvancedInvoiceManagement from './AdvancedInvoiceManagement'
import TaxCalculationSystem from './TaxCalculationSystem'
import MultiCurrencySystem from './MultiCurrencySystem'
import AdvancedSubscriptionManagement from './AdvancedSubscriptionManagement'

interface EnterpriseBillingDashboardProps {
  organizationId?: string
}

export default function EnterpriseBillingDashboard({ organizationId }: EnterpriseBillingDashboardProps) {
  const [activeTab, setActiveTab] = useState('analytics')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Simulate API refresh
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Dashboard data refreshed')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    console.log(`Exporting ${activeTab} data in ${format} format`)
    // Implement export functionality
  }

  const tabConfig = [
    {
      id: 'analytics',
      label: 'Usage Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'AI-powered analytics with forecasting',
      badge: 'AI-Enhanced'
    },
    {
      id: 'invoices',
      label: 'Invoice Management',
      icon: <FileText className="h-4 w-4" />,
      description: 'Comprehensive invoice system',
      badge: 'Advanced'
    },
    {
      id: 'tax',
      label: 'Tax Calculation',
      icon: <Calculator className="h-4 w-4" />,
      description: 'Global tax compliance',
      badge: 'Compliance'
    },
    {
      id: 'currency',
      label: 'Multi-Currency',
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Global currency support',
      badge: 'Global'
    },
    {
      id: 'subscription',
      label: 'Subscription Management',
      icon: <Settings className="h-4 w-4" />,
      description: 'Advanced subscription controls',
      badge: 'Enterprise'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Enterprise Billing Dashboard</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Enterprise Ready
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Global Compliance
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    AI-Powered
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-base">
            Comprehensive billing management with advanced analytics, tax compliance, 
            multi-currency support, and enterprise-grade subscription controls.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Feature Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {tabConfig.map((tab) => (
          <Card 
            key={tab.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeTab === tab.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.icon}
                </div>
                <Badge variant={activeTab === tab.id ? 'default' : 'secondary'} className="text-xs">
                  {tab.badge}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm mb-1">{tab.label}</h3>
              <p className="text-xs text-gray-600">{tab.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="hidden">
          {tabConfig.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Usage Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Advanced Usage Analytics
                <Badge variant="outline">AI-Enhanced</Badge>
              </h2>
              <p className="text-gray-600 mt-1">
                Real-time usage insights with AI-powered forecasting and detailed drill-down capabilities
              </p>
            </div>
          </div>
          <AdvancedUsageAnalytics 
            onRefresh={handleRefresh}
            onExport={handleExport}
          />
        </TabsContent>

        {/* Invoice Management Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Management System
                <Badge variant="outline">Advanced</Badge>
              </h2>
              <p className="text-gray-600 mt-1">
                Comprehensive invoice management with PDF generation, automated emails, and detailed tracking
              </p>
            </div>
          </div>
          <AdvancedInvoiceManagement 
            onRefresh={handleRefresh}
          />
        </TabsContent>

        {/* Tax Calculation Tab */}
        <TabsContent value="tax" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax Calculation System
                <Badge variant="outline">Compliance</Badge>
              </h2>
              <p className="text-gray-600 mt-1">
                Location-based tax calculation with VAT/GST support, exemption management, and global compliance
              </p>
            </div>
          </div>
          <TaxCalculationSystem />
        </TabsContent>

        {/* Multi-Currency Tab */}
        <TabsContent value="currency" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Multi-Currency System
                <Badge variant="outline">Global</Badge>
              </h2>
              <p className="text-gray-600 mt-1">
                Real-time currency conversion, location-based detection, and multi-currency pricing support
              </p>
            </div>
          </div>
          <MultiCurrencySystem />
        </TabsContent>

        {/* Subscription Management Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Subscription Management
                <Badge variant="outline">Enterprise</Badge>
              </h2>
              <p className="text-gray-600 mt-1">
                Pause/resume subscriptions, proration calculations, credit management, and trial controls
              </p>
            </div>
          </div>
          <AdvancedSubscriptionManagement />
        </TabsContent>
      </Tabs>

      {/* Feature Highlights Footer */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Enterprise Billing Features</h3>
            <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5 text-sm">
              <div className="space-y-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg inline-block">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="font-medium">AI Forecasting</div>
                <div className="text-gray-600">Predictive analytics for usage and costs</div>
              </div>
              
              <div className="space-y-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg inline-block">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="font-medium">Smart Invoicing</div>
                <div className="text-gray-600">Automated PDF generation and email delivery</div>
              </div>
              
              <div className="space-y-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg inline-block">
                  <Calculator className="h-4 w-4" />
                </div>
                <div className="font-medium">Global Tax Compliance</div>
                <div className="text-gray-600">Automatic VAT/GST calculation and reporting</div>
              </div>
              
              <div className="space-y-2">
                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg inline-block">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="font-medium">Multi-Currency</div>
                <div className="text-gray-600">Real-time conversion and regional pricing</div>
              </div>
              
              <div className="space-y-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg inline-block">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="font-medium">Enterprise Controls</div>
                <div className="text-gray-600">Advanced subscription and credit management</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}