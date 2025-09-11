import { useState } from 'react'
import { Button } from './ui/button'
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
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { 
  FileText, 
  Eye,
  Plus,
  Settings,
  Clock,
  MessageSquare,
  UserCheck
} from 'lucide-react'
import { useReplyTemplates } from '../hooks/useReplyTemplates'

interface ReplyTemplateSelectorProps {
  onSelectTemplate: (subject: string, content_html: string, content_plain?: string) => void
  recipientName?: string
  senderName?: string
  conversationTopic?: string
}

export function ReplyTemplateSelector({ 
  onSelectTemplate, 
  recipientName = 'the recipient',
  senderName = 'Your Name',
  conversationTopic = 'our conversation'
}: ReplyTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [customVariables, setCustomVariables] = useState({
    recipient_name: recipientName,
    sender_name: senderName,
    topic: conversationTopic,
    availability: 'next week'
  })

  const { templates, isLoading, previewTemplate } = useReplyTemplates(
    selectedCategory === 'all' ? undefined : selectedCategory
  )

  const categories = [
    { value: 'all', label: 'All Templates', icon: MessageSquare },
    { value: 'general', label: 'General', icon: FileText },
    { value: 'follow_up', label: 'Follow Up', icon: Clock },
    { value: 'meeting', label: 'Meeting', icon: UserCheck },
  ]

  const handleSelectTemplate = async (template: any) => {
    try {
      const preview = await previewTemplate(template.id, customVariables)
      onSelectTemplate(
        preview.preview_subject || template.subject || '',
        preview.preview_content_html,
        preview.preview_content_plain
      )
    } catch (error) {
      console.error('Failed to load template:', error)
      // Fallback to template without variable substitution
      onSelectTemplate(
        template.subject || '',
        template.content_html,
        template.content_plain
      )
    }
  }

  const handlePreviewTemplate = async (template: any) => {
    try {
      const preview = await previewTemplate(template.id, customVariables)
      setPreviewData(preview)
      setIsPreviewOpen(true)
    } catch (error) {
      console.error('Failed to preview template:', error)
    }
  }

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.value === category)
    const IconComponent = categoryData?.icon || FileText
    return <IconComponent className="h-3 w-3" />
  }

  return (
    <div className="space-y-3">
      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Label htmlFor="category" className="text-sm font-medium">Templates:</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                <div className="flex items-center gap-2">
                  <category.icon className="h-4 w-4" />
                  {category.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-sm text-gray-500 py-4">
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-4">
            No templates found
          </div>
        ) : (
          templates.map((template) => (
            <div 
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{template.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {getCategoryIcon(template.category)}
                    <span className="ml-1">{template.category}</span>
                  </Badge>
                </div>
                {template.subject && (
                  <p className="text-xs text-gray-600 mb-1">
                    Subject: {template.subject}
                  </p>
                )}
                <p className="text-xs text-gray-500 line-clamp-2">
                  {template.content_plain?.substring(0, 100)}...
                </p>
              </div>
              
              <div className="flex items-center gap-1 ml-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreviewTemplate(template)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSelectTemplate(template)}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Use
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Template Variables */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Customize Variables
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <h4 className="font-medium">Template Variables</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="recipient_name" className="text-sm">Recipient Name</Label>
                <Input
                  id="recipient_name"
                  value={customVariables.recipient_name}
                  onChange={(e) => setCustomVariables(prev => ({
                    ...prev,
                    recipient_name: e.target.value
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sender_name" className="text-sm">Your Name</Label>
                <Input
                  id="sender_name"
                  value={customVariables.sender_name}
                  onChange={(e) => setCustomVariables(prev => ({
                    ...prev,
                    sender_name: e.target.value
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="topic" className="text-sm">Topic</Label>
                <Input
                  id="topic"
                  value={customVariables.topic}
                  onChange={(e) => setCustomVariables(prev => ({
                    ...prev,
                    topic: e.target.value
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="availability" className="text-sm">Availability</Label>
                <Input
                  id="availability"
                  value={customVariables.availability}
                  onChange={(e) => setCustomVariables(prev => ({
                    ...prev,
                    availability: e.target.value
                  }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Preview Modal */}
      {previewData && (
        <Popover open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <PopoverContent className="w-96">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Template Preview</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  ×
                </Button>
              </div>
              
              {previewData.preview_subject && (
                <div>
                  <Label className="text-sm font-medium">Subject:</Label>
                  <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">
                    {previewData.preview_subject}
                  </p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Content:</Label>
                <div 
                  className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: previewData.preview_content_html }}
                />
              </div>
              
              <Button
                onClick={() => {
                  onSelectTemplate(
                    previewData.preview_subject || previewData.subject || '',
                    previewData.preview_content_html,
                    previewData.preview_content_plain
                  )
                  setIsPreviewOpen(false)
                }}
                className="w-full"
              >
                Use This Template
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}