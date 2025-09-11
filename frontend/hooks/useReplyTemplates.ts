import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

interface ReplyTemplate {
  id: string
  organization_id: string
  name: string
  subject?: string
  content_html: string
  content_plain?: string
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CreateTemplateData {
  name: string
  subject?: string
  content_html: string
  content_plain?: string
  category?: string
  sort_order?: number
}

interface UpdateTemplateData extends Partial<CreateTemplateData> {
  is_active?: boolean
}

export function useReplyTemplates(category?: string) {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (category) params.append('category', category)
      params.append('active_only', 'true')

      const response = await api.get(`/reply-templates?${params.toString()}`)
      
      if (response.data && response.data.templates) {
        setTemplates(response.data.templates)
      } else {
        setTemplates([])
      }
    } catch (err: any) {
      console.error('Error fetching reply templates:', err)
      setError(err.message || 'Failed to fetch reply templates')
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }, [category])

  const createTemplate = useCallback(async (templateData: CreateTemplateData) => {
    try {
      const response = await api.post('/reply-templates', templateData)
      
      if (response.data && response.data.template) {
        setTemplates(prev => [...prev, response.data.template].sort((a, b) => a.sort_order - b.sort_order))
        return response.data.template
      }
    } catch (err: any) {
      console.error('Error creating reply template:', err)
      throw err
    }
  }, [])

  const updateTemplate = useCallback(async (id: string, templateData: UpdateTemplateData) => {
    try {
      const response = await api.put(`/reply-templates/${id}`, templateData)
      
      if (response.data && response.data.template) {
        setTemplates(prev => prev.map(template => 
          template.id === id ? response.data.template : template
        ).sort((a, b) => a.sort_order - b.sort_order))
        return response.data.template
      }
    } catch (err: any) {
      console.error('Error updating reply template:', err)
      throw err
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await api.delete(`/reply-templates/${id}`)
      setTemplates(prev => prev.filter(template => template.id !== id))
    } catch (err: any) {
      console.error('Error deleting reply template:', err)
      throw err
    }
  }, [])

  const previewTemplate = useCallback(async (
    id: string, 
    variables: Record<string, string> = {}
  ): Promise<ReplyTemplate & { 
    preview_subject: string
    preview_content_html: string 
    preview_content_plain: string
    variables_used: Record<string, string>
  }> => {
    try {
      const params = new URLSearchParams()
      Object.entries(variables).forEach(([key, value]) => {
        params.append(key, value)
      })

      const response = await api.get(`/reply-templates/${id}/preview?${params.toString()}`)
      return response.data.template
    } catch (err: any) {
      console.error('Error previewing template:', err)
      throw err
    }
  }, [])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    return updateTemplate(id, { is_active: isActive })
  }, [updateTemplate])

  // Fetch on mount and when category changes
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate,
    toggleActive
  }
}