'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '../lib/auth/context'
import { NavigationProvider } from '../lib/navigation/context'
import { ToastProvider } from '../components/ui/toast'
// Removed enhanced toast provider for simplification
import { ConfirmationProvider } from '../components/ui/confirmation-dialog'
import { ErrorBoundary } from '../components/ui/error-boundary'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
      },
    },
  }))

  return (
    <ErrorBoundary section="Application Root">
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>
          <AuthProvider>
            <ConfirmationProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ConfirmationProvider>
          </AuthProvider>
        </NavigationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}