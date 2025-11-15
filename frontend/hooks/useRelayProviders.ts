import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface RelayProvider {
  id: string
  organization_id: string
  provider_type: 'sendgrid' | 'mailgun'
  provider_name: string
  config: {
    domain?: string
    region?: 'us' | 'eu'
  }
  daily_limit: number
  is_active: boolean
  health_score: number
  created_at: string
  updated_at: string
  linked_accounts_count?: number
}

export interface CreateRelayProviderData {
  provider_type: 'sendgrid' | 'mailgun'
  provider_name: string
  api_key: string
  config?: {
    domain?: string
    region?: 'us' | 'eu'
  }
  daily_limit?: number
}

export interface UpdateRelayProviderData {
  provider_name?: string
  api_key?: string
  config?: {
    domain?: string
    region?: 'us' | 'eu'
  }
  daily_limit?: number
  is_active?: boolean
}

export interface UseRelayProvidersReturn {
  providers: RelayProvider[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createProvider: (data: CreateRelayProviderData) => Promise<any>
  updateProvider: (id: string, data: UpdateRelayProviderData) => Promise<any>
  deleteProvider: (id: string) => Promise<void>
  testConnection: (id: string) => Promise<any>
  getLinkedAccounts: (id: string) => Promise<any>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  isTesting: boolean
}

export function useRelayProviders(): UseRelayProvidersReturn {
  const [providers, setProviders] = useState<RelayProvider[]>([])
  const queryClient = useQueryClient()

  // Fetch all relay providers
  const { data, isLoading, error, refetch } = useQuery<RelayProvider[]>({
    queryKey: ['relay-providers'],
    queryFn: async () => {
      const response = await api.get('/relay-providers')
      return response.data.providers || []
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

  // Update local state when query data changes
  useState(() => {
    if (data) {
      setProviders(data)
    }
  })

  // Create relay provider mutation
  const createProviderMutation = useMutation({
    mutationFn: async (data: CreateRelayProviderData) => {
      const response = await api.post('/relay-providers', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay-providers'] })
      refetch()
    }
  })

  // Update relay provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRelayProviderData }) => {
      const response = await api.put(`/relay-providers/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay-providers'] })
      refetch()
    }
  })

  // Delete relay provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/relay-providers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay-providers'] })
      refetch()
    }
  })

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/relay-providers/${id}/test`)
      return response.data
    }
  })

  // Get linked accounts
  const getLinkedAccounts = async (id: string) => {
    const response = await api.get(`/relay-providers/${id}/linked-accounts`)
    return response.data
  }

  return {
    providers: data || providers,
    isLoading,
    error: error as Error | null,
    refetch,
    createProvider: async (data: CreateRelayProviderData) => {
      return createProviderMutation.mutateAsync(data)
    },
    updateProvider: async (id: string, data: UpdateRelayProviderData) => {
      return updateProviderMutation.mutateAsync({ id, data })
    },
    deleteProvider: async (id: string) => {
      return deleteProviderMutation.mutateAsync(id)
    },
    testConnection: async (id: string) => {
      return testConnectionMutation.mutateAsync(id)
    },
    getLinkedAccounts,
    isCreating: createProviderMutation.isPending,
    isUpdating: updateProviderMutation.isPending,
    isDeleting: deleteProviderMutation.isPending,
    isTesting: testConnectionMutation.isPending
  }
}
