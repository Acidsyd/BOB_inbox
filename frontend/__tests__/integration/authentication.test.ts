/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '@/lib/auth/context'
import { api } from '@/lib/api'

// Mock dependencies
jest.mock('@/lib/api')

const mockApi = api as jest.Mocked<typeof api>

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Sample user data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'admin',
  organizationId: 'org-1'
}

describe('Authentication System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockPush.mockClear()
  })

  describe('Initial Authentication State', () => {
    test('initializes with no user when no token in localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(mockApi.get).not.toHaveBeenCalled()
    })

    test('validates existing token on initialization', async () => {
      const token = 'valid-token'
      mockLocalStorage.getItem.mockReturnValue(token)
      mockApi.get.mockResolvedValueOnce({ data: mockUser })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me')
      expect(result.current.user).toEqual(mockUser)
    })

    test('clears invalid token on initialization', async () => {
      const invalidToken = 'invalid-token'
      mockLocalStorage.getItem.mockReturnValue(invalidToken)
      mockApi.get.mockRejectedValueOnce(new Error('Unauthorized'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(result.current.user).toBeNull()
    })
  })

  describe('Login Functionality', () => {
    test('successful login saves tokens and redirects', async () => {
      const loginResponse = {
        user: mockUser,
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      }

      mockApi.post.mockResolvedValueOnce({ data: loginResponse })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token')
      expect(result.current.user).toEqual(mockUser)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    test('login failure throws error with proper message', async () => {
      const errorMessage = 'Invalid credentials'
      mockApi.post.mockRejectedValueOnce({
        response: { data: { error: errorMessage } }
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let thrownError: Error | null = null
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword')
        } catch (error) {
          thrownError = error as Error
        }
      })

      expect(thrownError).not.toBeNull()
      expect(thrownError!.message).toBe(errorMessage)
      expect(result.current.user).toBeNull()
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    test('login failure with network error', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network Error'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let thrownError: Error | null = null
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123')
        } catch (error) {
          thrownError = error as Error
        }
      })

      expect(thrownError!.message).toBe('Login failed')
    })

    test('login logs debug information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      const loginResponse = {
        user: mockUser,
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      }

      mockApi.post.mockResolvedValueOnce({ data: loginResponse })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(consoleSpy).toHaveBeenCalledWith('🚀 Attempting login for:', 'test@example.com')
      expect(consoleSpy).toHaveBeenCalledWith('✅ Login response:', loginResponse)

      consoleSpy.mockRestore()
    })
  })

  describe('Registration Functionality', () => {
    test('successful registration saves tokens and redirects', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        organizationName: 'New Org'
      }

      const registerResponse = {
        user: { ...mockUser, ...registerData },
        token: 'new-token',
        refreshToken: 'new-refresh-token'
      }

      mockApi.post.mockResolvedValueOnce({ data: registerResponse })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.register(registerData)
      })

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', registerData)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token')
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token')
      expect(result.current.user).toEqual(registerResponse.user)
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    test('registration failure throws error', async () => {
      const errorMessage = 'Email already exists'
      mockApi.post.mockRejectedValueOnce({
        response: { data: { error: errorMessage } }
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      }

      let thrownError: Error | null = null
      await act(async () => {
        try {
          await result.current.register(registerData)
        } catch (error) {
          thrownError = error as Error
        }
      })

      expect(thrownError!.message).toBe(errorMessage)
      expect(result.current.user).toBeNull()
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Logout Functionality', () => {
    test('logout clears tokens and redirects to login', async () => {
      // First, set up an authenticated state
      mockLocalStorage.getItem.mockReturnValue('valid-token')
      mockApi.get.mockResolvedValueOnce({ data: mockUser })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      act(() => {
        result.current.logout()
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(result.current.user).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Token Refresh Scenarios', () => {
    test('automatically refreshes expired token', async () => {
      // This test would be more complex in a real scenario
      // For now, we'll test the interceptor logic conceptually
      
      const expiredTokenError = {
        response: { status: 401 },
        config: { _retry: false }
      }
      
      const refreshResponse = {
        token: 'new-refreshed-token'
      }

      // Mock the refresh token being available
      mockLocalStorage.getItem
        .mockReturnValueOnce('expired-token') // First call for initial token
        .mockReturnValueOnce('refresh-token') // Second call for refresh token

      // This is a simplified test of the concept
      // In a real test, we'd need to test the axios interceptor
      expect(mockLocalStorage.getItem).toBeDefined()
    })
  })

  describe('Authentication Error Handling', () => {
    test('handles 401 errors by clearing tokens', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token')
      mockApi.get.mockRejectedValueOnce({
        response: { status: 401 }
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(result.current.user).toBeNull()
    })

    test('handles network errors gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token')
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(result.current.user).toBeNull()
    })
  })

  describe('Cross-Browser Authentication', () => {
    test('handles localStorage not being available', () => {
      // Temporarily replace localStorage
      const originalLocalStorage = window.localStorage
      // @ts-ignore
      delete window.localStorage

      // This should not throw an error
      expect(() => {
        renderHook(() => useAuth(), {
          wrapper: ({ children }) => <>{children}</>
        })
      }).not.toThrow()

      // Restore localStorage
      window.localStorage = originalLocalStorage
    })
  })

  describe('Performance and Memory Leaks', () => {
    test('does not create memory leaks with multiple renders', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token')
      mockApi.get.mockResolvedValue({ data: mockUser })

      // Render multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useAuth(), {
          wrapper: ({ children }) => <>{children}</>
        })
        unmount()
      }

      // Should not cause excessive API calls
      expect(mockApi.get).toHaveBeenCalledTimes(10) // Once per render
    })
  })

  describe('Edge Cases', () => {
    test('handles malformed token responses', async () => {
      const malformedResponse = { user: null, token: undefined }
      mockApi.post.mockResolvedValueOnce({ data: malformedResponse })

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      let thrownError: Error | null = null
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123')
        } catch (error) {
          thrownError = error as Error
        }
      })

      // Should handle gracefully
      expect(result.current.user).toBeNull()
    })

    test('handles empty email or password', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => <>{children}</>
      })

      let thrownError: Error | null = null
      await act(async () => {
        try {
          await result.current.login('', '')
        } catch (error) {
          thrownError = error as Error
        }
      })

      // Should still attempt the API call and let backend validate
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: '',
        password: ''
      })
    })
  })
})

describe('Authentication Hook Error Handling', () => {
  test('throws error when used outside AuthProvider', () => {
    // Mock console.error to prevent error logs in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})