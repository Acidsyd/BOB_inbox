'use client'

import { useEffect, useCallback, useRef } from 'react'

interface KeyboardShortcut {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  disabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcuts({ 
  shortcuts, 
  enabled = true, 
  preventDefault = true 
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.disabled) return false
      
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const metaMatches = !!event.metaKey === !!shortcut.metaKey
      const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey
      const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey
      const altMatches = !!event.altKey === !!shortcut.altKey
      
      return keyMatches && metaMatches && ctrlMatches && shiftMatches && altMatches
    })

    if (matchingShortcut) {
      if (preventDefault) {
        event.preventDefault()
      }
      matchingShortcut.action()
    }
  }, [enabled, preventDefault])

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return {
    shortcuts: shortcutsRef.current
  }
}

// Global keyboard shortcuts for the app
export function useGlobalKeyboardShortcuts() {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: '/',
      action: () => {
        // Focus search input if it exists
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      description: 'Focus search'
    },
    {
      key: 'k',
      metaKey: true,
      action: () => {
        // Open command palette or search
        const event = new CustomEvent('open-command-palette')
        window.dispatchEvent(event)
      },
      description: 'Open command palette'
    },
    {
      key: 'n',
      metaKey: true,
      action: () => {
        // Navigate to new campaign
        window.location.href = '/campaigns/new'
      },
      description: 'Create new campaign'
    },
    {
      key: 'd',
      metaKey: true,
      action: () => {
        // Navigate to dashboard
        window.location.href = '/dashboard'
      },
      description: 'Go to dashboard'
    },
    {
      key: 'c',
      metaKey: true,
      shiftKey: true,
      action: () => {
        // Navigate to campaigns
        window.location.href = '/campaigns'
      },
      description: 'Go to campaigns'
    },
    {
      key: 'e',
      metaKey: true,
      shiftKey: true,
      action: () => {
        // Navigate to email accounts
        window.location.href = '/settings/email-accounts'
      },
      description: 'Go to email accounts'
    },
    {
      key: 'i',
      metaKey: true,
      shiftKey: true,
      action: () => {
        // Navigate to inbox
        window.location.href = '/inbox'
      },
      description: 'Go to inbox'
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals, dropdowns, etc.
        const event = new CustomEvent('escape-key-pressed')
        window.dispatchEvent(event)
      },
      description: 'Close modals and dropdowns'
    }
  ]

  useKeyboardShortcuts({ shortcuts })

  return { shortcuts }
}

// Hook for form navigation shortcuts
export function useFormKeyboardShortcuts(options: {
  onSave?: () => void
  onCancel?: () => void
  onNext?: () => void
  onPrev?: () => void
  enabled?: boolean
}) {
  const { onSave, onCancel, onNext, onPrev, enabled = true } = options

  const shortcuts: KeyboardShortcut[] = [
    ...(onSave ? [{
      key: 's',
      metaKey: true,
      action: onSave,
      description: 'Save form'
    }] : []),
    ...(onCancel ? [{
      key: 'Escape',
      action: onCancel,
      description: 'Cancel form'
    }] : []),
    ...(onNext ? [{
      key: 'Enter',
      metaKey: true,
      action: onNext,
      description: 'Next step'
    }] : []),
    ...(onPrev ? [{
      key: 'Enter',
      metaKey: true,
      shiftKey: true,
      action: onPrev,
      description: 'Previous step'
    }] : [])
  ]

  useKeyboardShortcuts({ shortcuts, enabled })

  return { shortcuts }
}

// Hook for table/list navigation
export function useTableKeyboardShortcuts(options: {
  onSelectNext?: () => void
  onSelectPrev?: () => void
  onSelectFirst?: () => void
  onSelectLast?: () => void
  onToggleSelect?: () => void
  onSelectAll?: () => void
  onDelete?: () => void
  enabled?: boolean
}) {
  const {
    onSelectNext,
    onSelectPrev,
    onSelectFirst,
    onSelectLast,
    onToggleSelect,
    onSelectAll,
    onDelete,
    enabled = true
  } = options

  const shortcuts: KeyboardShortcut[] = [
    ...(onSelectNext ? [{
      key: 'ArrowDown',
      action: onSelectNext,
      description: 'Select next item'
    }, {
      key: 'j',
      action: onSelectNext,
      description: 'Select next item'
    }] : []),
    ...(onSelectPrev ? [{
      key: 'ArrowUp',
      action: onSelectPrev,
      description: 'Select previous item'
    }, {
      key: 'k',
      action: onSelectPrev,
      description: 'Select previous item'
    }] : []),
    ...(onSelectFirst ? [{
      key: 'Home',
      action: onSelectFirst,
      description: 'Select first item'
    }] : []),
    ...(onSelectLast ? [{
      key: 'End',
      action: onSelectLast,
      description: 'Select last item'
    }] : []),
    ...(onToggleSelect ? [{
      key: ' ',
      action: onToggleSelect,
      description: 'Toggle selection'
    }] : []),
    ...(onSelectAll ? [{
      key: 'a',
      metaKey: true,
      action: onSelectAll,
      description: 'Select all items'
    }] : []),
    ...(onDelete ? [{
      key: 'Delete',
      action: onDelete,
      description: 'Delete selected items'
    }, {
      key: 'Backspace',
      action: onDelete,
      description: 'Delete selected items'
    }] : [])
  ]

  useKeyboardShortcuts({ shortcuts, enabled })

  return { shortcuts }
}

// Keyboard shortcuts help component
import React, { useState } from 'react'
import { Keyboard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
  onClose?: () => void
}

export function KeyboardShortcutsHelp({ shortcuts, onClose }: KeyboardShortcutsHelpProps) {
  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = []
    if (shortcut.metaKey) keys.push('⌘')
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.altKey) keys.push('Alt')
    if (shortcut.shiftKey) keys.push('⇧')
    keys.push(shortcut.key.toUpperCase())
    return keys.join(' + ')
  }

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.description.includes('form') ? 'Forms' :
                    shortcut.description.includes('Go to') || shortcut.description.includes('Navigate') ? 'Navigation' :
                    shortcut.description.includes('Select') || shortcut.description.includes('Delete') ? 'Selection' :
                    'General'
    
    if (!acc[category]) acc[category] = []
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden animate-bounce-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5" />
            <span>Keyboard Shortcuts</span>
          </CardTitle>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </CardHeader>
        
        <CardContent className="overflow-y-auto">
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">{shortcut.description}</span>
                      <div className="flex items-center space-x-1">
                        {formatShortcut(shortcut).split(' + ').map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                              {key}
                            </kbd>
                            {keyIndex < formatShortcut(shortcut).split(' + ').length - 1 && (
                              <span className="text-gray-400">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook to show keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.target) {
        setIsVisible(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const show = useCallback(() => setIsVisible(true), [])
  const hide = useCallback(() => setIsVisible(false), [])

  return {
    isVisible,
    show,
    hide
  }
}