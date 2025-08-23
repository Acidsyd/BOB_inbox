'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Mail, 
  Download,
  Calendar,
  Target,
  Zap
} from 'lucide-react'

function AnalyticsContent() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track performance, optimize campaigns, and measure ROI</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-green-600">
              +3 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,847</div>
            <p className="text-xs text-green-600">
              +23% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34.2%</div>
            <p className="text-xs text-green-600">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.8%</div>
            <p className="text-xs text-green-600">
              +1.3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Email Performance Over Time</CardTitle>
            <CardDescription>Sent, opened, and replied emails by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Email performance chart</p>
                <p className="text-sm text-gray-400">Charts integration needed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Comparison</CardTitle>
            <CardDescription>Performance metrics across campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Campaign comparison chart</p>
                <p className="text-sm text-gray-400">Charts integration needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Campaigns</CardTitle>
            <CardDescription>Campaigns with highest engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Q1 Outbound Campaign', 'Tech Companies Outreach', 'Follow-up Sequence'].map((campaign, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{campaign}</p>
                    <p className="text-xs text-gray-500">
                      {35 - idx * 5}% open rate
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {150 - idx * 20} replies
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Account Health</CardTitle>
            <CardDescription>Sender reputation scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { email: 'john@company.com', health: 95 },
                { email: 'sarah@company.com', health: 78 },
                { email: 'mike@company.com', health: 45 }
              ].map((account, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{account.email}</p>
                    <p className="text-xs text-gray-500">Health Score</p>
                  </div>
                  <div className={`text-sm font-medium ${
                    account.health >= 90 ? 'text-green-600' : 
                    account.health >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {account.health}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest campaign events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                'Campaign "Q1 Outbound" completed',
                'New reply from prospect',
                'Email account health declined'
              ].map((activity, idx) => (
                <div key={idx} className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm">{activity}</p>
                    <p className="text-xs text-gray-500">
                      {2 + idx} hours ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AnalyticsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}