'use client'

import React, { useState } from 'react'
import { Label, useLabels } from '@/hooks/useLabels'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Tag
} from 'lucide-react'

interface LabelFormData {
  name: string
  color: string
  description: string
}

const DEFAULT_COLORS = [
  '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D',
  '#16A34A', '#059669', '#0891B2', '#0284C7', '#2563EB',
  '#7C3AED', '#9333EA', '#C026D3', '#DB2777', '#E11D48'
]

export function LabelManager() {
  const { labels, isLoading, error, createLabel, updateLabel, deleteLabel } = useLabels()
  const [isOpen, setIsOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [formData, setFormData] = useState<LabelFormData>({
    name: '',
    color: '#3B82F6',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3B82F6',
      description: ''
    })
    setEditingLabel(null)
  }

  const handleCreate = () => {
    resetForm()
    setIsOpen(true)
  }

  const handleEdit = (label: Label) => {
    setFormData({
      name: label.name,
      color: label.color,
      description: label.description || ''
    })
    setEditingLabel(label)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) return

    try {
      setIsSubmitting(true)
      
      if (editingLabel) {
        await updateLabel(editingLabel.id, {
          name: formData.name.trim(),
          color: formData.color,
          description: formData.description.trim() || undefined
        })
      } else {
        await createLabel({
          name: formData.name.trim(),
          color: formData.color,
          description: formData.description.trim() || undefined
        })
      }
      
      setIsOpen(false)
      resetForm()
    } catch (err) {
      console.error('Failed to save label:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (label: Label) => {
    if (!confirm(`Are you sure you want to delete the label "${label.name}"? This will remove it from all conversations.`)) {
      return
    }

    try {
      await deleteLabel(label.id)
    } catch (err) {
      console.error('Failed to delete label:', err)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    resetForm()
  }

  const handleCreateStandardLabels = async () => {
    const standardLabels = [
      { name: 'Interested', color: '#16A34A', description: 'Lead shows interest' },
      { name: 'Not Interested', color: '#DC2626', description: 'Lead is not interested' },
      { name: 'Follow Up', color: '#F59E0B', description: 'Needs follow up' },
      { name: 'Hot Lead', color: '#EF4444', description: 'High priority lead' },
      { name: 'Cold Lead', color: '#6B7280', description: 'Low priority lead' },
      { name: 'Qualified', color: '#8B5CF6', description: 'Lead is qualified' },
      { name: 'Proposal Sent', color: '#0891B2', description: 'Proposal has been sent' }
    ]

    if (!confirm(`This will create ${standardLabels.length} standard labels. Continue?`)) {
      return
    }

    setIsSubmitting(true)
    try {
      let createdCount = 0
      for (const label of standardLabels) {
        try {
          await createLabel(label)
          createdCount++
        } catch (err) {
          // Continue creating other labels even if one fails (e.g., duplicate name)
          console.warn(`Failed to create label "${label.name}":`, err)
        }
      }
      
      if (createdCount > 0) {
        alert(`Successfully created ${createdCount} standard labels!`)
      } else {
        alert('No new labels were created. They may already exist.')
      }
    } catch (err) {
      console.error('Failed to create standard labels:', err)
      alert('Failed to create standard labels. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Manage Labels
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Manage Labels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new label buttons */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Create and manage labels to organize your conversations
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateStandardLabels} 
                variant="outline" 
                size="sm" 
                className="gap-2"
                disabled={isSubmitting}
              >
                <Tag className="w-4 h-4" />
                {isSubmitting ? 'Creating...' : 'Add Standard Labels'}
              </Button>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                New Label
              </Button>
            </div>
          </div>

          {/* Labels list */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading labels...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">Error: {error}</div>
            ) : labels.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No labels created yet. Click "New Label" to get started.
              </div>
            ) : (
              labels.map(label => (
                <div 
                  key={label.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Badge 
                      style={{ backgroundColor: label.color, color: 'white' }}
                      className="px-3 py-1"
                    >
                      {label.name}
                    </Badge>
                    {label.description && (
                      <span className="text-sm text-gray-600 italic">
                        {label.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(label)}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(label)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Label form dialog */}
        <Dialog 
          open={isOpen && (editingLabel !== null || formData.name !== '')} 
          onOpenChange={(open) => !open && handleClose()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLabel ? 'Edit Label' : 'Create New Label'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Label Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter label name..."
                  maxLength={50}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.name.length}/50 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Color
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 border rounded cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3B82F6"
                    className="font-mono text-sm flex-1"
                  />
                  <Badge 
                    style={{ backgroundColor: formData.color, color: 'white' }}
                    className="px-3 py-1"
                  >
                    Preview
                  </Badge>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        formData.color === color ? 'border-gray-400 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this label..."
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/200 characters
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!formData.name.trim() || isSubmitting}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : (editingLabel ? 'Update' : 'Create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}