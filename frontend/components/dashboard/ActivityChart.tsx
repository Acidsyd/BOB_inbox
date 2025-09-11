'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useState } from 'react'

interface ActivityData {
  date: string
  sent: number
  replies: number
  bounces?: number
}

interface ActivityChartProps {
  data: ActivityData[]
  title?: string
  period?: string
}

export default function ActivityChart({ 
  data, 
  title = 'Email Activity',
  period = 'month'
}: ActivityChartProps) {
  const [metric, setMetric] = useState<'sent' | 'replies' | 'both'>('both')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // Format date for display based on period
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    
    if (period === 'today') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric' })
    } else if (period === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Transform data for display
  const chartData = data.map(item => ({
    ...item,
    formattedDate: formatDate(item.date),
    displayDate: item.date
  }))

  // Calculate totals and averages
  const totalSent = data.reduce((sum, item) => sum + item.sent, 0)
  const totalReplies = data.reduce((sum, item) => sum + item.replies, 0)
  const avgSentPerDay = data.length > 0 ? (totalSent / data.length).toFixed(1) : '0'
  const avgRepliesPerDay = data.length > 0 ? (totalReplies / data.length).toFixed(1) : '0'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label)
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-medium mb-2">{formattedDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="formattedDate" 
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis fontSize={12} />
        <Tooltip content={<CustomTooltip />} labelKey="displayDate" />
        
        {(metric === 'sent' || metric === 'both') && (
          <Line 
            type="monotone" 
            dataKey="sent" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            name="Emails Sent"
          />
        )}
        
        {(metric === 'replies' || metric === 'both') && (
          <Line 
            type="monotone" 
            dataKey="replies" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            name="Replies Received"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="formattedDate" 
          fontSize={12}
          tick={{ fontSize: 12 }}
        />
        <YAxis fontSize={12} />
        <Tooltip content={<CustomTooltip />} labelKey="displayDate" />
        
        {(metric === 'sent' || metric === 'both') && (
          <Bar 
            dataKey="sent" 
            fill="#3B82F6"
            name="Emails Sent"
            radius={[2, 2, 0, 0]}
          />
        )}
        
        {(metric === 'replies' || metric === 'both') && (
          <Bar 
            dataKey="replies" 
            fill="#10B981"
            name="Replies Received"
            radius={[2, 2, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Daily activity for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">No activity data available</p>
            <p className="text-sm mt-2">Email activity will appear here once you start sending campaigns</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Daily activity for the selected period
            </CardDescription>
          </div>
          
          {/* Chart Controls */}
          <div className="flex gap-2">
            {/* Metric Toggle */}
            <div className="flex gap-1">
              <Button
                variant={metric === 'sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetric('sent')}
              >
                Sent
              </Button>
              <Button
                variant={metric === 'replies' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetric('replies')}
              >
                Replies
              </Button>
              <Button
                variant={metric === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetric('both')}
              >
                Both
              </Button>
            </div>
            
            {/* Chart Type Toggle */}
            <div className="flex gap-1">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalSent}</div>
            <div className="text-xs text-gray-500">Total Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalReplies}</div>
            <div className="text-xs text-gray-500">Total Replies</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">{avgSentPerDay}</div>
            <div className="text-xs text-gray-500">Avg Sent/Day</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">{avgRepliesPerDay}</div>
            <div className="text-xs text-gray-500">Avg Replies/Day</div>
          </div>
        </div>
        
        {/* Chart */}
        {chartType === 'line' ? renderLineChart() : renderBarChart()}
      </CardContent>
    </Card>
  )
}