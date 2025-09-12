'use client'

import { useState, useRef } from 'react'
import { 
  Variable,
  Type,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { cn } from '../../lib/utils'

interface SimpleRichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
  variables?: { key: string; label: string; value?: string }[]
}

const SimpleMenuBar = ({ onInsertVariable, variables, textareaRef }) => {
  const [isVariablePopoverOpen, setIsVariablePopoverOpen] = useState(false)
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const applyFormat = (formatType) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    
    if (selectedText) {
      let formattedText = ''
      switch (formatType) {
        case 'bold':
          formattedText = `**${selectedText}**`
          break
        case 'italic':
          formattedText = `*${selectedText}*`
          break
        case 'underline':
          formattedText = `_${selectedText}_`
          break
        case 'unorderedList':
          formattedText = selectedText.split('\n').map(line => line.trim() ? `• ${line}` : line).join('\n')
          break
        case 'orderedList':
          formattedText = selectedText.split('\n').map((line, index) => line.trim() ? `${index + 1}. ${line}` : line).join('\n')
          break
        default:
          return
      }
      
      const newContent = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end)
      
      // Trigger onChange to update parent component
      const event = { target: { value: newContent } }
      textarea.value = newContent
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      
      // Set cursor position after formatted text
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
      }, 0)
    }
  }

  const handleLinkInsert = () => {
    if (!textareaRef.current || !linkUrl) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    
    const linkText = selectedText || linkUrl
    const formattedText = `[${linkText}](${linkUrl})`
    
    const newContent = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end)
    
    // Trigger onChange to update parent component
    textarea.value = newContent
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    
    // Set cursor position after link
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
    }, 0)
    
    // Reset state
    setLinkUrl('')
    setIsLinkPopoverOpen(false)
  }

  return (
    <div className="border-b bg-white p-3 flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Type className="h-4 w-4 text-gray-600" />
        <span className="text-sm text-gray-700 font-medium">Rich Text Editor</span>
      </div>
      
      {/* Formatting Buttons */}
      <div className="w-px h-6 bg-gray-300" />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Bold"
          onClick={() => applyFormat('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Italic"
          onClick={() => applyFormat('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Underline"
          onClick={() => applyFormat('underline')}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Bullet List"
          onClick={() => applyFormat('unorderedList')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Numbered List"
          onClick={() => applyFormat('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Insert Link</h4>
                <p className="text-sm text-muted-foreground">
                  Add a clickable link to your text
                </p>
              </div>
              <div className="grid gap-2">
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleLinkInsert()
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLinkUrl('')
                      setIsLinkPopoverOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLinkInsert}
                    disabled={!linkUrl}
                  >
                    Insert Link
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
      <SimpleMenuBar onInsertVariable={handleInsertVariable} variables={variables} textareaRef={textareaRef} />
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