'use client'

import { useState, useRef } from 'react'
import { 
  Variable,
  Type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface SimpleRichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
  variables?: { key: string; label: string; value?: string }[]
}

const SimpleMenuBar = ({ onInsertVariable, variables }) => {
  const [isVariablePopoverOpen, setIsVariablePopoverOpen] = useState(false)

  return (
    <div className="border-b bg-green-50 p-3 flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Type className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700 font-medium">✅ Simple Text Editor - WORKING!</span>
      </div>
      
      {/* Variables */}
      {variables && variables.length > 0 && (
        <>
          <div className="w-px h-6 bg-gray-300" />
          <Popover open={isVariablePopoverOpen} onOpenChange={setIsVariablePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-sm"
                title="Insert Variable"
              >
                <Variable className="h-4 w-4 mr-1" />
                Variables
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Insert Variable</div>
                <div className="grid gap-1 max-h-48 overflow-y-auto">
                  {variables.map((variable) => (
                    <Button
                      key={variable.key}
                      variant="ghost"
                      size="sm"
                      className="justify-start h-auto py-2 px-3 text-left"
                      onClick={() => {
                        onInsertVariable(variable)
                        setIsVariablePopoverOpen(false)
                      }}
                    >
                      <div>
                        <div className="font-medium">{variable.label}</div>
                        <div className="text-xs text-gray-500">{`{${variable.key}}`}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  )
}

export function SimpleRichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className,
  minHeight = '200px',
  disabled = false,
  variables = []
}: SimpleRichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInsertVariable = (variable: { key: string; label: string }) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const startPos = textarea.selectionStart
    const endPos = textarea.selectionEnd
    const variableText = `{${variable.key}}`
    
    const newContent = content.substring(0, startPos) + variableText + content.substring(endPos)
    onChange(newContent, newContent)
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(startPos + variableText.length, startPos + variableText.length)
    }, 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    onChange(newContent, newContent)
  }

  return (
    <div className={cn("border border-gray-300 rounded-md bg-white", className)}>
      <SimpleMenuBar onInsertVariable={handleInsertVariable} variables={variables} />
      <textarea
        ref={textareaRef}
        value={content || ''}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-3 border-0 resize-none focus:outline-none bg-white rounded-b-md"
        style={{ minHeight }}
        rows={8}
      />
    </div>
  )
}

export default SimpleRichTextEditor