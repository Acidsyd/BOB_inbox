'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LabelData {
  name: string
  count: number
  color: string
}

interface LabelChartProps {
  labels: Record<string, { count: number; color: string }>
  onLabelClick?: (labelName: string) => void
  title?: string
  showType?: 'pie' | 'bar'
}

const COLORS = [
  '#8884d8',
  '#82ca9d', 
  '#ffc658',
  '#ff7c7c',
  '#8dd1e1',
  '#d084d0',
  '#ffb347',
  '#87ceeb'
]

export default function LabelChart({ 
  labels, 
  onLabelClick, 
  title = 'Conversation Labels',
  showType = 'pie'
}: LabelChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>(showType)
  const router = useRouter()

  // Transform labels object to array for Recharts
  const chartData: LabelData[] = Object.entries(labels).map(([name, data], index) => ({
    name,
    count: data.count,
    color: data.color || COLORS[index % COLORS.length]
  })).sort((a, b) => b.count - a.count) // Sort by count descending

  const totalConversations = chartData.reduce((sum, item) => sum + item.count, 0)

  const handleLabelClick = (labelName: string) => {
    if (onLabelClick) {
      onLabelClick(labelName)
    } else {
      // Navigate to inbox with label filter
      router.push(`/inbox?label=${encodeURIComponent(labelName)}`)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = totalConversations > 0 ? ((data.count / totalConversations) * 100).toFixed(1) : '0'
      
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.count} conversations ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          labelLine={false}
          label={false}
          outerRadius={85}
          fill="#8884d8"
          dataKey="count"
          onClick={(data) => handleLabelClick(data.name)}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color}
              className="hover:opacity-80 transition-opacity"
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          onClick={(data) => handleLabelClick(data.value as string)}
          wrapperStyle={{ cursor: 'pointer' }}
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          formatter={(value, entry) => (
            <span style={{ color: entry.color, fontSize: '12px' }}>
              {value} ({entry.payload?.count || 0})
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={60}
          fontSize={12}
        />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="count" 
          onClick={(data) => handleLabelClick(data.name)}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color}
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Distribution of conversation labels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">No labeled conversations yet</p>
            <p className="text-sm mt-2">Start labeling your conversations to see insights here</p>
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
              {totalConversations} total conversations • Click to filter
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('pie')}
            >
              Pie
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
      </CardHeader>
      <CardContent>
        {chartType === 'pie' ? renderPieChart() : renderBarChart()}
        
        {/* Label Summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {chartData.slice(0, 4).map((label) => {
            const percentage = totalConversations > 0 ? ((label.count / totalConversations) * 100).toFixed(1) : '0'
            return (
              <div
                key={label.name}
                onClick={() => handleLabelClick(label.name)}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: label.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{label.name}</p>
                  <p className="text-xs text-gray-500">{label.count} conversations ({percentage}%)</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}