'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value?: string
    label?: string
  }
  onClick?: () => void
  className?: string
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
  className = ''
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      // Format large numbers with commas
      if (val >= 1000) {
        return val.toLocaleString()
      }
      return val.toString()
    }
    return val
  }

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-gray-500">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {formatValue(value)}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          {subtitle && (
            <p className="text-xs text-gray-600">
              {subtitle}
            </p>
          )}
          
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(trend.direction)}`}>
              {getTrendIcon(trend.direction)}
              {trend.value && <span>{trend.value}</span>}
              {trend.label && <span className="text-gray-500 ml-1">{trend.label}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}