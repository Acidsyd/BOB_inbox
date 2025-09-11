import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

export interface Label {
  id: string
  name: string
  color: string
  description?: string
  created_at: string
  updated_at: string
}

export interface LabelAssignment {
  conversationId: string
  labels: Label[]
}

export function useLabels() {
  const [labels, setLabels] = useState<Label[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const createStandardLabels = useCallback(async () => {
    const standardLabels = [
      { name: 'Interested', color: '#16A34A', description: 'Lead shows interest' },
      { name: 'Not Interested', color: '#DC2626', description: 'Lead is not interested' },
      { name: 'Follow Up', color: '#F59E0B', description: 'Needs follow up' },
      { name: 'Hot Lead', color: '#EF4444', description: 'High priority lead' },
      { name: 'Cold Lead', color: '#6B7280', description: 'Low priority lead' },
      { name: 'Qualified', color: '#8B5CF6', description: 'Lead is qualified' },
      { name: 'Proposal Sent', color: '#0891B2', description: 'Proposal has been sent' }
    ]

    for (const label of standardLabels) {
      try {
        await api.post('/inbox/labels', label)
      } catch (err) {
        // Continue creating other labels even if one fails (e.g., duplicate name)
        console.warn(`Failed to create standard label "${label.name}":`, err)
      }
    }
  }, [])

  const fetchLabels = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/inbox/labels')
      const fetchedLabels = response.data.labels || []
      
      // Auto-install standard labels if none exist
      if (fetchedLabels.length === 0) {
        await createStandardLabels()
        // Fetch again after creating standard labels
        const updatedResponse = await api.get('/inbox/labels')
        setLabels(updatedResponse.data.labels || [])
      } else {
        setLabels(fetchedLabels)
      }
    } catch (err: any) {
      console.error('Failed to fetch labels:', err)
      setError(err.response?.data?.error || 'Failed to fetch labels')
    } finally {
      setIsLoading(false)
    }
  }, [createStandardLabels])

  const createLabel = useCallback(async (data: { name: string; color?: string; description?: string }) => {
    try {
      setError(null)
      const response = await api.post('/inbox/labels', data)
      const newLabel = response.data.label
      setLabels(prev => [...prev, newLabel].sort((a, b) => a.name.localeCompare(b.name)))
      return newLabel
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create label'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const updateLabel = useCallback(async (id: string, data: { name?: string; color?: string; description?: string }) => {
    try {
      setError(null)
      const response = await api.put(`/inbox/labels/${id}`, data)
      const updatedLabel = response.data.label
      setLabels(prev => prev.map(label => 
        label.id === id ? updatedLabel : label
      ).sort((a, b) => a.name.localeCompare(b.name)))
      return updatedLabel
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update label'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const deleteLabel = useCallback(async (id: string) => {
    try {
      setError(null)
      await api.delete(`/inbox/labels/${id}`)
      setLabels(prev => prev.filter(label => label.id !== id))
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to delete label'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const addLabelsToConversation = useCallback(async (conversationId: string, labelIds: string[]) => {
    try {
      setError(null)
      const response = await api.post(`/inbox/conversations/${conversationId}/labels`, { labelIds })
      return response.data.addedLabels
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to add labels to conversation'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const removeLabelFromConversation = useCallback(async (conversationId: string, labelId: string) => {
    try {
      setError(null)
      await api.delete(`/inbox/conversations/${conversationId}/labels/${labelId}`)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to remove label from conversation'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const bulkLabelOperation = useCallback(async (
    conversationIds: string[], 
    labelIds: string[], 
    action: 'add' | 'remove'
  ) => {
    try {
      setError(null)
      const response = await api.put('/inbox/conversations/bulk-label', {
        conversationIds,
        labelIds,
        action
      })
      return response.data
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || `Failed to ${action} labels`
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  const getConversationLabels = useCallback(async (conversationId: string) => {
    try {
      setError(null)
      const response = await api.get(`/inbox/conversations/${conversationId}/labels`)
      return response.data.labels
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch conversation labels'
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }, [])

  useEffect(() => {
    fetchLabels()
  }, [fetchLabels])

  return {
    labels,
    isLoading,
    error,
    refetch: fetchLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    addLabelsToConversation,
    removeLabelFromConversation,
    bulkLabelOperation,
    getConversationLabels
  }
}