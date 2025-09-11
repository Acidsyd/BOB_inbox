import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export interface EmailAccount {
  id: string
  email: string
  provider: 'gmail' | 'outlook' | 'smtp'
  display_name?: string
  health_score: number
  warmup_status: string
  daily_limit: number
  is_active: boolean
  created_at: string
}

export interface UseEmailAccountsResult {
  accounts: EmailAccount[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useEmailAccountsSelection(): UseEmailAccountsResult {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get('/email-accounts')
      setAccounts(response.data?.accounts || [])
    } catch (err: any) {
      console.error('Error fetching email accounts:', err)
      setError(err.response?.data?.error || err.message || 'Failed to load email accounts')
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    await fetchAccounts()
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  return {
    accounts,
    loading,
    error,
    refresh
  }
}

export default useEmailAccountsSelection