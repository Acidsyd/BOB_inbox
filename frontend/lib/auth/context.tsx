'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api'
import { useNavigation } from '../navigation/context'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
  planType?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const navigation = useNavigation()

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      console.log('🔐 === AUTH CONTEXT DEBUG ===')
      console.log('  - Token exists:', !!token)
      console.log('  - Token preview:', token ? token.substring(0, 50) + '...' : 'null')
      
      if (token) {
        try {
          console.log('  - Calling /auth/me...')
          const response = await api.get('/auth/me')
          console.log('  - /auth/me response:', response.data)
          const userData = response.data.user
          console.log('  - User data extracted:', userData)
          setUser(userData)
          setIsAuthenticated(true)
          console.log('🔐 ✅ Auth initialized with user:', userData?.email, 'org:', userData?.organizationId)
        } catch (error) {
          console.error('🔑 ❌ Auth/me failed:', error)
          console.warn('🔑 Token invalid, clearing auth state')
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('🚀 Attempting login for:', email)
      const response = await api.post('/auth/login', { email, password })
      console.log('✅ Login response:', response.data)
      const { user, token, refreshToken } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)
      
      setUser(user)
      setIsAuthenticated(true)
      
      // Use navigation context to determine redirect destination
      if (navigation.shouldRedirectAfterAuth) {
        const redirectPath = navigation.getDefaultRedirect()
        console.log('🔐 Auth: Redirecting after login to:', redirectPath)
        router.push(redirectPath)
        navigation.clearNavigationState()
      } else {
        console.log('🔐 Auth: Skipping redirect after login (workflow preserved)')
      }
    } catch (error: any) {
      console.error('❌ Login error:', error)
      console.error('❌ Error response:', error.response?.data)
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data)
      const { user, token, refreshToken } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)
      
      setUser(user)
      setIsAuthenticated(true)
      
      // Use navigation context to determine redirect destination
      if (navigation.shouldRedirectAfterAuth) {
        const redirectPath = navigation.getDefaultRedirect()
        console.log('🔐 Auth: Redirecting after registration to:', redirectPath)
        router.push(redirectPath)
        navigation.clearNavigationState()
      } else {
        console.log('🔐 Auth: Skipping redirect after registration (workflow preserved)')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
    setIsAuthenticated(false)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}