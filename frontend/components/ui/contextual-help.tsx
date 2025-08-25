'use client'

import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle, X, ChevronRight, ExternalLink, Book, Video, MessageCircle } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [actualPosition, setActualPosition] = useState(position)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current
      const trigger = triggerRef.current
      const rect = trigger.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()
      
      // Check if tooltip would go off screen and adjust position
      let newPosition = position
      
      if (position === 'top' && rect.top - tooltipRect.height < 10) {
        newPosition = 'bottom'
      } else if (position === 'bottom' && rect.bottom + tooltipRect.height > window.innerHeight - 10) {
        newPosition = 'top'
      } else if (position === 'left' && rect.left - tooltipRect.width < 10) {
        newPosition = 'right'
      } else if (position === 'right' && rect.right + tooltipRect.width > window.innerWidth - 10) {
        newPosition = 'left'
      }
      
      setActualPosition(newPosition)
    }
  }, [isVisible, position])

  const getPositionClasses = () => {
    switch (actualPosition) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    }
  }

  const getArrowClasses = () => {
    switch (actualPosition) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900'
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900'
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-900'
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-900'
    }
  }

  return (
    <div 
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap animate-fade-in',
            getPositionClasses(),
            className
          )}
        >
          {content}
          <div className={cn('absolute w-0 h-0', getArrowClasses())} />
        </div>
      )}
    </div>
  )
}

interface HelpItem {
  id: string
  title: string
  description: string
  type: 'article' | 'video' | 'faq'
  url?: string
  content?: string
}

interface ContextualHelpProps {
  topic: string
  items: HelpItem[]
  trigger?: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function ContextualHelp({ 
  topic, 
  items, 
  trigger, 
  position = 'bottom',
  className 
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<HelpItem | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedItem(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2'
      case 'bottom':
        return 'top-full mt-2'
      case 'left':
        return 'right-full mr-2'
      case 'right':
        return 'left-full ml-2'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'faq':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Book className="h-4 w-4" />
    }
  }

  return (
    <div className={cn('relative inline-block', className)} ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-gray-500 hover:text-purple-600 transition-colors"
      >
        {trigger || (
          <>
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Help</span>
          </>
        )}
      </button>

      {/* Help panel */}
      {isOpen && (
        <div className={cn(
          'absolute z-50 w-80 animate-fade-in',
          getPositionClasses()
        )}>
          <Card className="shadow-lg border-purple-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4 text-purple-600" />
                  <span>Help: {topic}</span>
                </CardTitle>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {selectedItem ? (
                // Detailed view
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </button>
                    <span className="text-sm font-medium">Back</span>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {selectedItem.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {selectedItem.description}
                    </p>
                    
                    {selectedItem.content && (
                      <div className="text-sm text-gray-700 space-y-2 mb-4">
                        {selectedItem.content.split('\n').map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                    
                    {selectedItem.url && (
                      <a
                        href={selectedItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-sm"
                      >
                        <span>View full article</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                // List view
                <div className="space-y-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.url) {
                          window.open(item.url, '_blank')
                        } else {
                          setSelectedItem(item)
                        }
                      }}
                      className="w-full p-3 text-left bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-purple-600 mt-0.5">
                          {getIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-purple-900">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.description}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                  
                  {/* Contact support */}
                  <div className="pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => {
                        // Open support chat or email
                        window.open('mailto:support@mailsender.com', '_blank')
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Quick help button for specific features
interface QuickHelpProps {
  title: string
  content: string
  className?: string
}

export function QuickHelp({ title, content, className }: QuickHelpProps) {
  return (
    <Tooltip content={content} className={className}>
      <button className="text-gray-400 hover:text-purple-600 transition-colors">
        <HelpCircle className="h-4 w-4" />
        <span className="sr-only">{title} help</span>
      </button>
    </Tooltip>
  )
}

// Help section for complex forms or processes
interface HelpSectionProps {
  title: string
  items: Array<{
    question: string
    answer: string
  }>
  className?: string
}

export function HelpSection({ title, items, className }: HelpSectionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          <HelpCircle className="h-4 w-4 text-purple-600" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleItem(index)}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  {item.question}
                </span>
                <ChevronRight 
                  className={cn(
                    'h-4 w-4 text-gray-400 transition-transform',
                    openItems.has(index) && 'rotate-90'
                  )}
                />
              </button>
              {openItems.has(index) && (
                <div className="px-3 pb-3">
                  <p className="text-sm text-gray-600">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}