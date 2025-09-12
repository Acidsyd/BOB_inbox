'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Variable, Search, Plus, User, Building, Mail, Phone, Calendar, MapPin, Hash, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface VariableOption {
  key: string
  label: string
  description?: string
  category?: 'contact' | 'company' | 'campaign' | 'custom'
  icon?: React.ReactNode
  value?: string
}

interface VariablePickerProps {
  onSelect: (variable: string) => void
  variables?: VariableOption[]
  className?: string
  buttonText?: string
  showPreview?: boolean
}

const defaultVariables: VariableOption[] = [
  {
    key: 'first_name',
    label: 'First Name',
    description: 'Recipient\'s first name',
    category: 'contact',
    icon: <User className="h-3 w-3" />
  },
  {
    key: 'last_name',
    label: 'Last Name',
    description: 'Recipient\'s last name',
    category: 'contact',
    icon: <User className="h-3 w-3" />
  },
  {
    key: 'full_name',
    label: 'Full Name',
    description: 'Recipient\'s full name',
    category: 'contact',
    icon: <User className="h-3 w-3" />
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Recipient\'s email address',
    category: 'contact',
    icon: <Mail className="h-3 w-3" />
  },
  {
    key: 'phone',
    label: 'Phone',
    description: 'Recipient\'s phone number',
    category: 'contact',
    icon: <Phone className="h-3 w-3" />
  },
  {
    key: 'company_name',
    label: 'Company Name',
    description: 'Company name',
    category: 'company',
    icon: <Building className="h-3 w-3" />
  },
  {
    key: 'company_domain',
    label: 'Company Domain',
    description: 'Company website domain',
    category: 'company',
    icon: <Building className="h-3 w-3" />
  },
  {
    key: 'company_size',
    label: 'Company Size',
    description: 'Number of employees',
    category: 'company',
    icon: <Hash className="h-3 w-3" />
  },
  {
    key: 'company_industry',
    label: 'Industry',
    description: 'Company industry',
    category: 'company',
    icon: <Building className="h-3 w-3" />
  },
  {
    key: 'company_location',
    label: 'Company Location',
    description: 'Company headquarters location',
    category: 'company',
    icon: <MapPin className="h-3 w-3" />
  },
  {
    key: 'campaign_name',
    label: 'Campaign Name',
    description: 'Current campaign name',
    category: 'campaign',
    icon: <FileText className="h-3 w-3" />
  },
  {
    key: 'sender_name',
    label: 'Your Name',
    description: 'Sender\'s name',
    category: 'campaign',
    icon: <User className="h-3 w-3" />
  },
  {
    key: 'sender_email',
    label: 'Your Email',
    description: 'Sender\'s email',
    category: 'campaign',
    icon: <Mail className="h-3 w-3" />
  },
  {
    key: 'current_date',
    label: 'Current Date',
    description: 'Today\'s date',
    category: 'campaign',
    icon: <Calendar className="h-3 w-3" />
  },
  {
    key: 'current_month',
    label: 'Current Month',
    description: 'Current month name',
    category: 'campaign',
    icon: <Calendar className="h-3 w-3" />
  },
  {
    key: 'current_year',
    label: 'Current Year',
    description: 'Current year',
    category: 'campaign',
    icon: <Calendar className="h-3 w-3" />
  }
]

const categoryColors = {
  contact: 'bg-blue-100 text-blue-700 border-blue-200',
  company: 'bg-green-100 text-green-700 border-green-200',
  campaign: 'bg-purple-100 text-purple-700 border-purple-200',
  custom: 'bg-gray-100 text-gray-700 border-gray-200'
}

const categoryLabels = {
  contact: 'Contact',
  company: 'Company',
  campaign: 'Campaign',
  custom: 'Custom'
}

export function VariablePicker({
  onSelect,
  variables = defaultVariables,
  className,
  buttonText = 'Variables',
  showPreview = true
}: VariablePickerProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [customVariable, setCustomVariable] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredVariables = variables.filter((variable) => {
    const matchesSearch = 
      variable.label.toLowerCase().includes(search.toLowerCase()) ||
      variable.key.toLowerCase().includes(search.toLowerCase()) ||
      variable.description?.toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = !selectedCategory || variable.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(variables.map(v => v.category).filter(Boolean)))

  const handleSelect = (variableKey: string) => {
    onSelect(variableKey)
    setIsOpen(false)
    setSearch('')
    setCustomVariable('')
  }

  const handleCustomVariable = () => {
    if (customVariable.trim()) {
      const cleanVariable = customVariable.replace(/[{}]/g, '').trim()
      handleSelect(cleanVariable)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1", className)}
        >
          <Variable className="h-4 w-4" />
          {buttonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Insert Variable</Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Select a variable to insert into your message
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelectedCategory(category)}
                >
                  {categoryLabels[category] || category}
                </Button>
              ))}
            </div>
          )}

          {/* Variables List */}
          <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-1">
            {filteredVariables.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                No variables found
              </div>
            ) : (
              filteredVariables.map((variable) => (
                <button
                  key={variable.key}
                  className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors group"
                  onClick={() => handleSelect(variable.key)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {variable.icon || <Variable className="h-3 w-3 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{variable.label}</span>
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                          {`{${variable.key}}`}
                        </code>
                      </div>
                      {variable.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{variable.description}</p>
                      )}
                      {showPreview && variable.value && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-gray-400">Preview:</span>
                          <span className="text-xs font-medium text-gray-600">{variable.value}</span>
                        </div>
                      )}
                    </div>
                    {variable.category && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs px-1.5 py-0",
                          categoryColors[variable.category]
                        )}
                      >
                        {categoryLabels[variable.category] || variable.category}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Custom Variable */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-medium">Custom Variable</Label>
            <div className="flex gap-2">
              <Input
                placeholder="custom_field"
                value={customVariable}
                onChange={(e) => setCustomVariable(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomVariable()}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={handleCustomVariable}
                disabled={!customVariable.trim()}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Enter a custom variable name without curly braces
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}