'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api'

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
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await api.get('/auth/me')
          setUser(response.data)
        } catch (error) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        }
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
      router.push('/dashboard')
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
      router.push('/dashboard')
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
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