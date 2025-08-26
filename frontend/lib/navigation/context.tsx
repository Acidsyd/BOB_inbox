'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface NavigationContextType {
  returnPath: string | null
  setReturnPath: (path: string | null) => void
  shouldRedirectAfterAuth: boolean
  setShouldRedirectAfterAuth: (should: boolean) => void
  clearNavigationState: () => void
  getDefaultRedirect: () => string
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

// Default redirect paths based on common workflows
const DEFAULT_REDIRECTS = {
  DASHBOARD: '/dashboard',
  CAMPAIGNS: '/campaigns',
  EMAIL_ACCOUNTS: '/settings/email-accounts'
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [returnPath, setReturnPathState] = useState<string | null>(null)
  const [shouldRedirectAfterAuth, setShouldRedirectAfterAuth] = useState(true)

  const setReturnPath = useCallback((path: string | null) => {
    console.log('🧭 Navigation: Setting return path to:', path)
    setReturnPathState(path)
  }, [])

  const clearNavigationState = useCallback(() => {
    console.log('🧭 Navigation: Clearing navigation state')
    setReturnPathState(null)
    setShouldRedirectAfterAuth(true)
  }, [])

  const getDefaultRedirect = useCallback(() => {
    // If we have a stored return path, use it
    if (returnPath) {
      console.log('🧭 Navigation: Using stored return path:', returnPath)
      return returnPath
    }
    
    // Default to dashboard for standard auth flows
    console.log('🧭 Navigation: Using default dashboard redirect')
    return DEFAULT_REDIRECTS.DASHBOARD
  }, [returnPath])

  return (
    <NavigationContext.Provider value={{
      returnPath,
      setReturnPath,
      shouldRedirectAfterAuth,
      setShouldRedirectAfterAuth,
      clearNavigationState,
      getDefaultRedirect
    }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

// Convenience hooks for common navigation patterns
export function useWorkflowNavigation() {
  const navigation = useNavigation()
  
  const preserveCurrentPath = useCallback(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      navigation.setReturnPath(currentPath)
      navigation.setShouldRedirectAfterAuth(false)
      console.log('🧭 Workflow: Preserving current path for later return:', currentPath)
    }
  }, [navigation])

  const preserveWorkflow = useCallback((workflowPath: string) => {
    navigation.setReturnPath(workflowPath)
    navigation.setShouldRedirectAfterAuth(false)
    console.log('🧭 Workflow: Preserving workflow path:', workflowPath)
  }, [navigation])

  const enableDefaultAuth = useCallback(() => {
    navigation.setShouldRedirectAfterAuth(true)
    navigation.setReturnPath(null)
    console.log('🧭 Workflow: Enabled default auth redirect behavior')
  }, [navigation])

  return {
    preserveCurrentPath,
    preserveWorkflow,
    enableDefaultAuth,
    ...navigation
  }
}