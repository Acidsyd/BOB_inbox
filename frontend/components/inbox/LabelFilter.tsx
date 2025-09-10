'use client'

import React, { useState } from 'react'
import { Label, useLabels } from '@/hooks/useLabels'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { 
  Filter,
  Search,
  X,
  Tag
} from 'lucide-react'

interface LabelFilterProps {
  selectedLabelIds: string[]
  onSelectionChange: (labelIds: string[]) => void
  className?: string
}

export function LabelFilter({ 
  selectedLabelIds, 
  onSelectionChange,
  className = ''
}: LabelFilterProps) {
  const { labels, isLoading } = useLabels()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedLabels = labels.filter(label => selectedLabelIds.includes(label.id))

  const handleLabelToggle = (labelId: string, checked: boolean) => {
    let newSelection: string[]
    
    if (checked) {
      newSelection = [...selectedLabelIds, labelId]
    } else {
      newSelection = selectedLabelIds.filter(id => id !== labelId)
    }
    
    onSelectionChange(newSelection)
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const hasActiveFilters = selectedLabelIds.length > 0

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant={hasActiveFilters ? "default" : "outline"} 
            size="sm" 
            className="gap-2 relative"
          >
            <Filter className="w-4 h-4" />
            Labels
            {hasActiveFilters && (
              <Badge 
                variant="secondary" 
                className="ml-1 px-1.5 py-0 text-xs bg-white/20"
              >
                {selectedLabelIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Filter by Labels
              </h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs h-6 px-2"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search labels..."
                className="pl-8 h-8"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading labels...</div>
            ) : filteredLabels.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'No labels found' : 'No labels created yet'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredLabels.map(label => (
                  <div 
                    key={label.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedLabelIds.includes(label.id)}
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
                    {label.description && (
                      <span className="text-xs text-gray-500 italic flex-1 truncate">
                        {label.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div className="p-3 border-t bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">Active filters:</p>
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map(label => (
                  <Badge 
                    key={label.id}
                    style={{ backgroundColor: label.color, color: 'white' }}
                    className="px-2 py-1 text-xs inline-flex items-center gap-1"
                  >
                    {label.name}
                    <button
                      onClick={() => handleLabelToggle(label.id, false)}
                      className="ml-1 hover:bg-black/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}