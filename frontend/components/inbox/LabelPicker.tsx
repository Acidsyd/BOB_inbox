'use client'

import React, { useState, useEffect } from 'react'
import { Label, useLabels } from '../../hooks/useLabels'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import { 
  Tag, 
  Search, 
  Plus,
  X,
  Check
} from 'lucide-react'

interface LabelPickerProps {
  conversationId: string
  currentLabels?: Label[]
  trigger?: React.ReactNode
  onLabelsChange?: (labels: Label[]) => void
  className?: string
}

export function LabelPicker({ 
  conversationId, 
  currentLabels = [], 
  trigger, 
  onLabelsChange,
  className = ''
}: LabelPickerProps) {
  const { 
    labels, 
    isLoading, 
    addLabelsToConversation, 
    removeLabelFromConversation 
  } = useLabels()
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)

  // Initialize selected labels when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLabelIds(new Set(currentLabels.map(label => label.id)))
      setSearchQuery('')
    }
  }, [isOpen, currentLabels])

  // Filter labels based on search query
  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (label.description && label.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleLabelToggle = (labelId: string, checked: boolean) => {
    setSelectedLabelIds(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(labelId)
      } else {
        newSet.delete(labelId)
      }
      return newSet
    })
  }

  const handleApplyChanges = async () => {
    try {
      setIsUpdating(true)

      const currentLabelIds = new Set(currentLabels.map(label => label.id))
      const labelsToAdd = Array.from(selectedLabelIds).filter(id => !currentLabelIds.has(id))
      const labelsToRemove = Array.from(currentLabelIds).filter(id => !selectedLabelIds.has(id))

      // Add new labels
      if (labelsToAdd.length > 0) {
        await addLabelsToConversation(conversationId, labelsToAdd)
      }

      // Remove unchecked labels
      for (const labelId of labelsToRemove) {
        await removeLabelFromConversation(conversationId, labelId)
      }

      // Update parent component with new labels
      if (onLabelsChange) {
        const newLabels = labels.filter(label => selectedLabelIds.has(label.id))
        onLabelsChange(newLabels)
      }

      setIsOpen(false)
    } catch (error) {
      console.error('Failed to update conversation labels:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className={`gap-2 ${className}`}>
      <Tag className="w-4 h-4" />
      Labels
      {currentLabels.length > 0 && (
        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
          {currentLabels.length}
        </Badge>
      )}
    </Button>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Tag className="w-5 h-5" />
            <h3 className="font-medium">Manage Labels</h3>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search labels..."
              className="pl-10"
            />
          </div>

          {/* Labels list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Loading labels...</div>
            ) : filteredLabels.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {searchQuery ? 'No labels found' : 'No labels created yet'}
              </div>
            ) : (
              filteredLabels.map(label => (
                <div 
                  key={label.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedLabelIds.has(label.id)}
                      onCheckedChange={(checked) => 
                        handleLabelToggle(label.id, checked as boolean)
                      }
                    />
                    <Badge 
                      style={{ backgroundColor: label.color, color: 'white' }}
                      className="px-2 py-1"
                    >
                      {label.name}
                    </Badge>
                  </div>
                  {label.description && (
                    <span className="text-xs text-gray-500 italic ml-2">
                      {label.description}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Current labels preview */}
          {selectedLabelIds.size > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Selected labels:</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedLabelIds).map(labelId => {
                  const label = labels.find(l => l.id === labelId)
                  if (!label) return null
                  return (
                    <Badge 
                      key={label.id}
                      style={{ backgroundColor: label.color, color: 'white' }}
                      className="px-2 py-1 text-xs"
                    >
                      {label.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUpdating}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleApplyChanges}
              disabled={isUpdating}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              {isUpdating ? 'Applying...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}