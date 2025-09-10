'use client'

import React from 'react'
import { Label } from '@/hooks/useLabels'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface ConversationLabelsProps {
  labels: Label[]
  onRemoveLabel?: (labelId: string) => void
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  showRemoveButton?: boolean
  className?: string
}

export function ConversationLabels({ 
  labels, 
  onRemoveLabel,
  maxVisible = 3,
  size = 'sm',
  showRemoveButton = false,
  className = ''
}: ConversationLabelsProps) {
  if (!labels || labels.length === 0) return null

  const visibleLabels = labels.slice(0, maxVisible)
  const hiddenCount = labels.length - maxVisible

  const getSizeClasses = () => {
    switch (size) {
      case 'lg':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-2.5 py-1 text-sm'
      case 'sm':
      default:
        return 'px-2 py-0.5 text-xs'
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visibleLabels.map(label => (
        <Badge 
          key={label.id}
          style={{ 
            backgroundColor: label.color, 
            color: 'white',
            border: 'none'
          }}
          className={`${getSizeClasses()} font-medium inline-flex items-center gap-1`}
          title={label.description || label.name}
        >
          <span className="truncate max-w-24">
            {label.name}
          </span>
          {showRemoveButton && onRemoveLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemoveLabel(label.id)
              }}
              className="ml-1 hover:bg-black/20 rounded-full p-0.5 transition-colors"
              title={`Remove ${label.name} label`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Badge>
      ))}
      
      {hiddenCount > 0 && (
        <Badge 
          variant="secondary" 
          className={`${getSizeClasses()} bg-gray-200 text-gray-600`}
          title={`${hiddenCount} more label${hiddenCount > 1 ? 's' : ''}`}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  )
}

// Compact version for use in conversation list items
export function ConversationLabelsCompact({ labels, className = '' }: { labels: Label[], className?: string }) {
  if (!labels || labels.length === 0) return null

  return (
    <ConversationLabels
      labels={labels}
      maxVisible={2}
      size="sm"
      className={className}
    />
  )
}

// Full version for use in conversation details
export function ConversationLabelsFull({ 
  labels, 
  onRemoveLabel, 
  className = '' 
}: { 
  labels: Label[]
  onRemoveLabel?: (labelId: string) => void
  className?: string 
}) {
  if (!labels || labels.length === 0) return null

  return (
    <ConversationLabels
      labels={labels}
      maxVisible={10}
      size="md"
      showRemoveButton={!!onRemoveLabel}
      onRemoveLabel={onRemoveLabel}
      className={className}
    />
  )
}