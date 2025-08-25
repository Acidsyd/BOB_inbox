'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from './button'

interface Toast {
  id: string
  title: string
  description?: string
  type?: 'success' | 'error' | 'info' | 'warning' | 'loading'
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  persistent?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<Toast>) => void
  clearAllToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function EnhancedToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeouts = useRef<{ [key: string]: NodeJS.Timeout }>({})

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
    
    // Set auto-removal timeout if not persistent and not loading
    if (!toast.persistent && toast.type !== 'loading') {
      const duration = toast.duration || (toast.type === 'error' ? 8000 : 5000)
      timeouts.current[id] = setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id])
      delete timeouts.current[id]
    }
  }, [])

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ))
    
    // Handle timeout changes
    if (updates.persistent !== undefined || updates.duration !== undefined) {
      if (timeouts.current[id]) {
        clearTimeout(timeouts.current[id])
        delete timeouts.current[id]
      }
      
      const toast = toasts.find(t => t.id === id)
      if (toast && !updates.persistent && updates.type !== 'loading') {
        const duration = updates.duration || (updates.type === 'error' ? 8000 : 5000)
        timeouts.current[id] = setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    }
  }, [toasts, removeToast])

  const clearAllToasts = useCallback(() => {
    Object.values(timeouts.current).forEach(clearTimeout)
    timeouts.current = {}
    setToasts([])
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeouts.current).forEach(clearTimeout)
    }
  }, [])

  // Group toasts by position
  const toastsByPosition = toasts.reduce((acc, toast) => {
    const position = toast.position || 'top-right'
    if (!acc[position]) acc[position] = []
    acc[position].push(toast)
    return acc
  }, {} as { [key: string]: Toast[] })

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast, clearAllToasts }}>
      {children}
      
      {/* Render toast containers for each position */}
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <ToastContainer key={position} position={position} toasts={positionToasts} onRemove={removeToast} />
      ))}
    </ToastContext.Provider>
  )
}

function ToastContainer({ 
  position, 
  toasts, 
  onRemove 
}: { 
  position: string
  toasts: Toast[]
  onRemove: (id: string) => void 
}) {
  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'top-left': return 'top-4 left-4'
      case 'top-right': return 'top-4 right-4'
      case 'top-center': return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-left': return 'bottom-4 left-4'
      case 'bottom-right': return 'bottom-4 right-4'
      case 'bottom-center': return 'bottom-4 left-1/2 transform -translate-x-1/2'
      default: return 'top-4 right-4'
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className={`fixed z-50 space-y-2 max-w-sm w-full ${getPositionClasses(position)}`}>
      {toasts.map((toast, index) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemove}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        />
      ))}
    </div>
  )
}

function ToastItem({ 
  toast, 
  onRemove, 
  style 
}: { 
  toast: Toast
  onRemove: (id: string) => void
  style?: React.CSSProperties
}) {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 150) // Animation duration
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'loading':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-900'
      case 'error':
        return 'text-red-900'
      case 'warning':
        return 'text-yellow-900'
      case 'loading':
        return 'text-blue-900'
      default:
        return 'text-gray-900'
    }
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm
        ${getBackgroundColor()}
        ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
        transition-all duration-300 ease-out
      `}
      style={style}
    >
      {/* Progress bar for non-persistent toasts */}
      {!toast.persistent && toast.type !== 'loading' && (
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 animate-progress-bar" />
      )}
      
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${getTextColor()}`}>
              {toast.title}
            </div>
            {toast.description && (
              <div className={`text-sm mt-1 ${getTextColor()} opacity-80`}>
                {toast.description}
              </div>
            )}
            
            {toast.action && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toast.action.onClick}
                  className="text-xs"
                >
                  {toast.action.label}
                </Button>
              </div>
            )}
          </div>
          
          {/* Close button for non-loading toasts */}
          {toast.type !== 'loading' && (
            <button
              onClick={handleRemove}
              className={`flex-shrink-0 rounded-full p-1 hover:bg-black hover:bg-opacity-10 transition-colors ${getTextColor()} opacity-60 hover:opacity-100`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for using enhanced toasts
export function useEnhancedToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useEnhancedToast must be used within an EnhancedToastProvider')
  }
  
  const { addToast, updateToast, removeToast, clearAllToasts } = context

  // Convenience methods
  const success = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return addToast({ title, type: 'success', ...options })
  }, [addToast])

  const error = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return addToast({ title, type: 'error', ...options })
  }, [addToast])

  const warning = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return addToast({ title, type: 'warning', ...options })
  }, [addToast])

  const info = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return addToast({ title, type: 'info', ...options })
  }, [addToast])

  const loading = useCallback((title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return addToast({ title, type: 'loading', persistent: true, ...options })
  }, [addToast])

  // Promise-based toast for async operations
  const promise = useCallback(async <T,>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    const toastId = loading(options.loading)
    
    try {
      const result = await promise
      const successMessage = typeof options.success === 'function' 
        ? options.success(result) 
        : options.success
      
      updateToast(toastId, {
        title: successMessage,
        type: 'success',
        persistent: false,
        duration: 5000
      })
      
      return result
    } catch (error) {
      const errorMessage = typeof options.error === 'function' 
        ? options.error(error) 
        : options.error
      
      updateToast(toastId, {
        title: errorMessage,
        type: 'error',
        persistent: false,
        duration: 8000
      })
      
      throw error
    }
  }, [addToast, updateToast, loading])

  return {
    toast: addToast,
    success,
    error,
    warning,
    info,
    loading,
    promise,
    updateToast,
    removeToast,
    clearAll: clearAllToasts
  }
}