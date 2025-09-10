'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { useState, useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Code as CodeIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Quote as QuoteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Variable,
  Minus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const MenuBar = ({ editor, variables }) => {
  const [linkUrl, setLinkUrl] = useState('')
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [isVariablePopoverOpen, setIsVariablePopoverOpen] = useState(false)

  if (!editor) return null

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
    }
    setIsLinkPopoverOpen(false)
  }

  const insertVariable = (variable) => {
    editor.chain().focus().insertContent(`{${variable.key}}`).run()
    setIsVariablePopoverOpen(false)
  }

  return (
    <div className="border-b bg-gray-50 p-3 flex items-center gap-1 flex-wrap">
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('bold') && "bg-gray-200 shadow-inner"
        )}
        title="Bold (Ctrl+B)"
      >
        <BoldIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('italic') && "bg-gray-200 shadow-inner"
        )}
        title="Italic (Ctrl+I)"
      >
        <ItalicIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('underline') && "bg-gray-200 shadow-inner"
        )}
        title="Underline"
      >
        <UnderlineIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('strike') && "bg-gray-200 shadow-inner"
        )}
        title="Strikethrough"
      >
        <StrikethroughIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('code') && "bg-gray-200 shadow-inner"
        )}
        title="Inline Code"
      >
        <CodeIcon className="h-5 w-5" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('heading', { level: 1 }) && "bg-gray-200 shadow-inner"
        )}
        title="Heading 1"
      >
        <Heading1 className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('heading', { level: 2 }) && "bg-gray-200 shadow-inner"
        )}
        title="Heading 2"
      >
        <Heading2 className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('heading', { level: 3 }) && "bg-gray-200 shadow-inner"
        )}
        title="Heading 3"
      >
        <Heading3 className="h-5 w-5" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Text Alignment */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive({ textAlign: 'left' }) && "bg-gray-200 shadow-inner"
        )}
        title="Align Left"
      >
        <AlignLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive({ textAlign: 'center' }) && "bg-gray-200 shadow-inner"
        )}
        title="Align Center"
      >
        <AlignCenter className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive({ textAlign: 'right' }) && "bg-gray-200 shadow-inner"
        )}
        title="Align Right"
      >
        <AlignRight className="h-5 w-5" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('bulletList') && "bg-gray-200 shadow-inner"
        )}
        title="Bullet List"
      >
        <ListIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('orderedList') && "bg-gray-200 shadow-inner"
        )}
        title="Numbered List"
      >
        <ListOrderedIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          "h-10 w-10 p-0",
          editor.isActive('blockquote') && "bg-gray-200 shadow-inner"
        )}
        title="Quote Block"
      >
        <QuoteIcon className="h-5 w-5" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Link */}
      <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-10 w-10 p-0",
              editor.isActive('link') && "bg-gray-200 shadow-inner"
            )}
            title="Add Link"
          >
            <LinkIcon className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="top">
          <div className="space-y-2">
            <Label htmlFor="link-url">Link URL</Label>
            <Input
              id="link-url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLinkSubmit()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleLinkSubmit}>Add Link</Button>
              {editor.isActive('link') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run()
                    setIsLinkPopoverOpen(false)
                  }}
                >
                  Remove Link
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Horizontal Rule */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="h-10 w-10 p-0"
        title="Horizontal Rule"
      >
        <Minus className="h-5 w-5" />
      </Button>

      {/* Variables */}
      {variables && variables.length > 0 && (
        <Popover open={isVariablePopoverOpen} onOpenChange={setIsVariablePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0"
              title="Insert Variable"
            >
              <Variable className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" side="top">
            <div className="space-y-2">
              <Label>Insert Variable</Label>
              <div className="max-h-48 overflow-y-auto">
                {variables.map((variable) => (
                  <Button
                    key={variable.key}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => insertVariable(variable)}
                  >
                    <span className="font-mono text-purple-600">{`{${variable.key}}`}</span>
                    <span className="ml-2 text-gray-600">{variable.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <div className="w-px h-6 bg-gray-300 mx-2" />

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="h-10 w-10 p-0 disabled:opacity-50"
        title="Undo (Ctrl+Z)"
      >
        <UndoIcon className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="h-10 w-10 p-0 disabled:opacity-50"
        title="Redo (Ctrl+Y)"
      >
        <RedoIcon className="h-5 w-5" />
      </Button>
    </div>
  )
}

export function SimpleRichTextEditor({
  content,
  onChange,
  placeholder = 'Type your message...',
  className,
  minHeight = '200px',
  disabled = false,
  variables
}: SimpleRichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions we want to configure separately
        link: false,
        underline: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        listItem: {},
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer'
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: content || '<p></p>',
    editable: !disabled,
    immediatelyRender: false,
    enableInputRules: true,
    enablePasteRules: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      onChange?.(html, text)
    },
    onCreate: ({ editor }) => {
      // Editor initialized
    },
    onFocus: ({ editor }) => {
      // Editor focused
    },
    onBlur: ({ editor }) => {
      // Editor blurred
    }
  }, [disabled, placeholder])

  useEffect(() => {
    if (editor && content !== undefined && !editor.isFocused) {
      const currentContent = editor.getHTML()
      const normalizedContent = content || '<p></p>'
      
      // Only update if content is actually different (avoiding whitespace differences)
      if (currentContent.replace(/\s+/g, ' ').trim() !== normalizedContent.replace(/\s+/g, ' ').trim()) {
        editor.commands.setContent(normalizedContent, false)
      }
    }
  }, [content, editor])

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable !== !disabled) {
      const isEditable = !disabled
      editor.setEditable(isEditable)
    }
  }, [disabled, editor])

  if (!isMounted) {
    return (
      <div className={cn("border border-gray-300 rounded-md bg-gray-50 animate-pulse", className)}>
        <div className="h-10 bg-gray-100 border-b" />
        <div className="flex items-center justify-center" style={{ minHeight }}>
          <div className="text-gray-500 text-sm">Loading editor...</div>
        </div>
      </div>
    )
  }

  if (!editor) {
    return (
      <div className={cn("border border-gray-300 rounded-md bg-gray-50", className)}>
        <div className="h-10 bg-gray-100 border-b" />
        <div className="flex items-center justify-center" style={{ minHeight }}>
          <div className="text-gray-500 text-sm">Initializing editor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("border border-gray-300 rounded-md bg-white", className)}>
      <MenuBar editor={editor} variables={variables} />
      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-sm max-w-none focus:outline-none bg-white",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ 
          minHeight,
          padding: '12px'
        }}
        onMouseDown={(e) => {
          // Only focus if it's a simple click, not a selection drag
          if (e.detail === 1 && !e.shiftKey && editor && !disabled && !editor.isDestroyed) {
            // Small delay to allow for potential text selection
            setTimeout(() => {
              const selection = window.getSelection()
              if (!selection || selection.toString() === '') {
                editor.commands.focus('end')
              }
            }, 0)
          }
        }}
      />
      <style jsx global>{`
        .ProseMirror {
          outline: none !important;
          border: none !important;
          min-height: ${minHeight} !important;
          padding: 12px !important;
          background-color: white !important;
          cursor: text !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        .ProseMirror:focus {
          outline: none !important;
        }
        
        .ProseMirror[contenteditable="true"] {
          cursor: text !important;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af !important;
          content: attr(data-placeholder) !important;
          float: left !important;
          height: 0 !important;
          pointer-events: none !important;
        }
        
        .ProseMirror p {
          margin: 0.5rem 0 !important;
        }
        
        .ProseMirror p:first-child {
          margin-top: 0 !important;
        }
        
        .ProseMirror p:last-child {
          margin-bottom: 0 !important;
        }
        
        .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.25rem !important;
          margin: 1rem 0 !important;
        }
        
        .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.25rem !important;
          margin: 1rem 0 !important;
        }
        
        .ProseMirror li {
          margin: 0.125rem 0 !important;
        }
        
        .ProseMirror strong {
          font-weight: bold !important;
        }
        
        .ProseMirror em {
          font-style: italic !important;
        }
      `}</style>
    </div>
  )
}