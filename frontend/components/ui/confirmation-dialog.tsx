'use client'

import React, { useState, useCallback, createContext, useContext } from 'react'
import { AlertTriangle, Trash2, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface ConfirmationOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  icon?: React.ReactNode
  requiresTyping?: boolean
  typingConfirmation?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => void
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined)

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmationOptions | null>(null)

  const confirm = useCallback((options: ConfirmationOptions) => {
    setDialog(options)
  }, [])

  const handleClose = () => {
    if (dialog?.onCancel) {
      dialog.onCancel()
    }
    setDialog(null)
  }

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      
      {dialog && (
        <ConfirmationDialog
          {...dialog}
          onClose={handleClose}
        />
      )}
    </ConfirmationContext.Provider>
  )
}

function ConfirmationDialog({ 
  title, 
  description, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  icon,
  requiresTyping = false,
  typingConfirmation = 'DELETE',
  onConfirm,
  onClose 
}: ConfirmationOptions & { onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [typedText, setTypedText] = useState('')

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          defaultIcon: <Trash2 className="h-6 w-6" />
        }
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          defaultIcon: <AlertTriangle className="h-6 w-6" />
        }
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          defaultIcon: <Info className="h-6 w-6" />
        }
      case 'success':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white',
          defaultIcon: <CheckCircle className="h-6 w-6" />
        }
    }
  }

  const styles = getTypeStyles()
  const canConfirm = !requiresTyping || typedText === typingConfirmation

  const handleConfirm = async () => {
    if (!canConfirm) return

    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirmation action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canConfirm && !isLoading) {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <Card className="w-full max-w-md animate-bounce-in" onKeyDown={handleKeyDown} tabIndex={-1}>
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 h-12 w-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <div className={styles.iconColor}>
              {icon || styles.defaultIcon}
            </div>
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Typing confirmation */}
          {requiresTyping && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Type <span className="font-mono bg-gray-100 px-1 rounded">{typingConfirmation}</span> to confirm:
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={typingConfirmation}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              {typedText && typedText !== typingConfirmation && (
                <p className="text-xs text-red-600">
                  Please type "{typingConfirmation}" exactly as shown
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className={`flex-1 ${styles.confirmButton}`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Loading...
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for using confirmation dialogs
export function useConfirmation() {
  const context = useContext(ConfirmationContext)
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider')
  }
  
  const { confirm } = context

  // Convenience methods
  const confirmDelete = useCallback((
    itemName: string,
    onConfirm: () => void | Promise<void>,
    options?: Partial<ConfirmationOptions>
  ) => {
    confirm({
      title: `Delete ${itemName}`,
      description: `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      requiresTyping: true,
      typingConfirmation: 'DELETE',
      onConfirm,
      ...options
    })
  }, [confirm])

  const confirmDangerousAction = useCallback((
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    options?: Partial<ConfirmationOptions>
  ) => {
    confirm({
      title,
      description,
      confirmText: 'Continue',
      type: 'danger',
      onConfirm,
      ...options
    })
  }, [confirm])

  const confirmWarning = useCallback((
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    options?: Partial<ConfirmationOptions>
  ) => {
    confirm({
      title,
      description,
      confirmText: 'Proceed',
      type: 'warning',
      onConfirm,
      ...options
    })
  }, [confirm])

  const confirmInfo = useCallback((
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    options?: Partial<ConfirmationOptions>
  ) => {
    confirm({
      title,
      description,
      confirmText: 'OK',
      type: 'info',
      onConfirm,
      ...options
    })
  }, [confirm])

  return {
    confirm,
    confirmDelete,
    confirmDangerousAction,
    confirmWarning,
    confirmInfo
  }
}