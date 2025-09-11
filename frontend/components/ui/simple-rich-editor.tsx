'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface SimpleRichEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SimpleRichEditor({
  content,
  onChange,
  placeholder = 'Type your message...',
  className,
  disabled = false
}: SimpleRichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit
    ],
    content: content || '',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      onChange(html, text)
    }
  })

  if (!editor) return null

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Simple Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('bold') && "bg-gray-200"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('italic') && "bg-gray-200"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-sm max-w-none p-3 focus:outline-none min-h-[120px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
  )
}