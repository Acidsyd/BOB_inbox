import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { 
  Filter, 
  X, 
  Calendar,
  SortAsc,
  SortDesc 
} from 'lucide-react'

interface AdvancedFiltersProps {
  filters: {
    status?: 'all' | 'active' | 'archived'
    search?: string
    type?: string
    isRead?: boolean
    sender?: string
    dateFrom?: string
    dateTo?: string
    campaignId?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
  onFiltersChange: (filters: any) => void
  campaigns?: Array<{ id: string; name: string }>
}

export function AdvancedFilters({ filters, onFiltersChange, campaigns = [] }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState(filters)

  const applyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const clearFilters = () => {
    const clearedFilters = {
      status: 'active',
      sortBy: 'last_activity_at',
      sortOrder: 'desc' as const
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    setIsOpen(false)
  }

  const updateFilter = (key: string, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const hasActiveFilters = () => {
    return !!(filters.search || filters.type || filters.isRead !== undefined || 
             filters.sender || filters.dateFrom || filters.dateTo || filters.campaignId ||
             filters.sortBy !== 'last_activity_at' || filters.sortOrder !== 'desc')
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters() && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Advanced Filters</h4>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Read Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="readStatus">Read Status</Label>
            <Select 
              value={localFilters.isRead === undefined ? 'all' : localFilters.isRead ? 'read' : 'unread'} 
              onValueChange={(value) => updateFilter('isRead', value === 'all' ? undefined : value === 'read')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="read">Read only</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conversation Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="type">Conversation Type</Label>
            <Select value={localFilters.type || 'all'} onValueChange={(value) => updateFilter('type', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="organic">Organic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sender Filter */}
          <div className="space-y-2">
            <Label htmlFor="sender">Sender Email</Label>
            <Input
              id="sender"
              placeholder="Filter by sender..."
              value={localFilters.sender || ''}
              onChange={(e) => updateFilter('sender', e.target.value || undefined)}
            />
          </div>

          {/* Campaign Filter */}
          {campaigns.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign</Label>
              <Select value={localFilters.campaignId || 'all'} onValueChange={(value) => updateFilter('campaignId', value === 'all' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All campaigns</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <div className="relative">
                <Input
                  id="dateFrom"
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <div className="relative">
                <Input
                  id="dateTo"
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="space-y-2">
            <Label>Sort Options</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={localFilters.sortBy || 'last_activity_at'} onValueChange={(value) => updateFilter('sortBy', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_activity_at">Last Activity</SelectItem>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="message_count">Message Count</SelectItem>
                </SelectContent>
              </Select>
              <Select value={localFilters.sortOrder || 'desc'} onValueChange={(value) => updateFilter('sortOrder', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">
                    <div className="flex items-center">
                      <SortDesc className="h-4 w-4 mr-2" />
                      Newest First
                    </div>
                  </SelectItem>
                  <SelectItem value="asc">
                    <div className="flex items-center">
                      <SortAsc className="h-4 w-4 mr-2" />
                      Oldest First
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={clearFilters}>
              Clear All
            </Button>
            <div className="space-x-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}