'use client'

import React from 'react'
import { CheckCircle, Circle, AlertCircle, Clock, ArrowRight } from 'lucide-react'
import { cn } from '../lib/utils'

interface Step {
  id: string
  title: string
  description?: string
  status: 'pending' | 'current' | 'completed' | 'error'
  optional?: boolean
}

interface ProgressIndicatorProps {
  steps: Step[]
  orientation?: 'horizontal' | 'vertical'
  showConnectors?: boolean
  className?: string
}

export function ProgressIndicator({ 
  steps, 
  orientation = 'horizontal', 
  showConnectors = true,
  className 
}: ProgressIndicatorProps) {
  const currentStepIndex = steps.findIndex(step => step.status === 'current')
  const completedSteps = steps.filter(step => step.status === 'completed').length

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar (only for horizontal) */}
      {orientation === 'horizontal' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress
            </span>
            <span className="text-sm text-gray-500">
              {completedSteps} of {steps.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${(completedSteps / steps.length) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className={cn(
        orientation === 'horizontal' 
          ? 'flex items-center justify-between' 
          : 'space-y-4'
      )}>
        {steps.map((step, index) => (
          <div key={step.id} className={cn(
            'flex items-center',
            orientation === 'horizontal' 
              ? 'flex-col text-center min-w-0 flex-1' 
              : 'space-x-4'
          )}>
            {/* Step Icon */}
            <div className={cn(
              'flex items-center justify-center rounded-full border-2 transition-all duration-200',
              orientation === 'horizontal' ? 'w-10 h-10 mb-2' : 'w-8 h-8 flex-shrink-0',
              step.status === 'completed' && 'bg-green-100 border-green-500',
              step.status === 'current' && 'bg-purple-100 border-purple-500',
              step.status === 'error' && 'bg-red-100 border-red-500',
              step.status === 'pending' && 'bg-gray-100 border-gray-300'
            )}>
              {step.status === 'completed' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {step.status === 'current' && (
                <Clock className="w-4 h-4 text-purple-500" />
              )}
              {step.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              {step.status === 'pending' && (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </div>

            {/* Step Content */}
            <div className={cn(
              'min-w-0',
              orientation === 'horizontal' ? 'text-center' : 'flex-1'
            )}>
              <div className={cn(
                'text-sm font-medium transition-colors duration-200',
                step.status === 'completed' && 'text-green-700',
                step.status === 'current' && 'text-purple-700',
                step.status === 'error' && 'text-red-700',
                step.status === 'pending' && 'text-gray-500'
              )}>
                {step.title}
                {step.optional && (
                  <span className="text-xs text-gray-400 ml-1">(optional)</span>
                )}
              </div>
              {step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>

            {/* Connector (horizontal only) */}
            {orientation === 'horizontal' && showConnectors && index < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Circular progress indicator
interface CircularProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  color?: 'purple' | 'blue' | 'green' | 'red' | 'yellow'
  className?: string
}

export function CircularProgress({ 
  value, 
  max = 100, 
  size = 'md',
  showValue = false,
  color = 'purple',
  className 
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  const colorClasses = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', sizeClasses[size], className)}>
      <svg
        className="transform -rotate-90"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(colorClasses[color], 'transition-all duration-500 ease-out')}
        />
      </svg>
      {showValue && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center font-semibold',
          colorClasses[color],
          textSizes[size]
        )}>
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  )
}

// Linear progress with labels
interface LinearProgressProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  color?: 'purple' | 'blue' | 'green' | 'red' | 'yellow'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LinearProgress({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'purple',
  size = 'md',
  className
}: LinearProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const colorClasses = {
    purple: 'bg-purple-600',
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600'
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showValue && (
            <span className="text-sm text-gray-500">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Multi-step progress with branching
interface BranchingStep extends Step {
  substeps?: Step[]
}

interface BranchingProgressProps {
  steps: BranchingStep[]
  className?: string
}

export function BranchingProgress({ steps, className }: BranchingProgressProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="relative">
          {/* Main step */}
          <div className="flex items-center space-x-4">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200',
              step.status === 'completed' && 'bg-green-100 border-green-500',
              step.status === 'current' && 'bg-purple-100 border-purple-500',
              step.status === 'error' && 'bg-red-100 border-red-500',
              step.status === 'pending' && 'bg-gray-100 border-gray-300'
            )}>
              {step.status === 'completed' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {step.status === 'current' && (
                <Clock className="w-4 h-4 text-purple-500" />
              )}
              {step.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              {step.status === 'pending' && (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </div>
            
            <div className="flex-1">
              <div className={cn(
                'text-sm font-medium transition-colors duration-200',
                step.status === 'completed' && 'text-green-700',
                step.status === 'current' && 'text-purple-700',
                step.status === 'error' && 'text-red-700',
                step.status === 'pending' && 'text-gray-500'
              )}>
                {step.title}
              </div>
              {step.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              )}
            </div>
          </div>

          {/* Substeps */}
          {step.substeps && step.substeps.length > 0 && (
            <div className="ml-4 mt-3 pl-4 border-l-2 border-gray-200">
              <div className="space-y-3">
                {step.substeps.map((substep) => (
                  <div key={substep.id} className="flex items-center space-x-3">
                    <div className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200',
                      substep.status === 'completed' && 'bg-green-50 border-green-300',
                      substep.status === 'current' && 'bg-purple-50 border-purple-300',
                      substep.status === 'error' && 'bg-red-50 border-red-300',
                      substep.status === 'pending' && 'bg-gray-50 border-gray-200'
                    )}>
                      {substep.status === 'completed' && (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                      {substep.status === 'current' && (
                        <Clock className="w-3 h-3 text-purple-500" />
                      )}
                      {substep.status === 'error' && (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                      {substep.status === 'pending' && (
                        <Circle className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className={cn(
                        'text-xs font-medium transition-colors duration-200',
                        substep.status === 'completed' && 'text-green-600',
                        substep.status === 'current' && 'text-purple-600',
                        substep.status === 'error' && 'text-red-600',
                        substep.status === 'pending' && 'text-gray-400'
                      )}>
                        {substep.title}
                      </div>
                      {substep.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {substep.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className="absolute left-4 top-8 w-px h-6 bg-gray-200" />
          )}
        </div>
      ))}
    </div>
  )
}