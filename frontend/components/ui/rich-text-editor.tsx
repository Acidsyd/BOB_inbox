'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Type,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Variable,
  FileText,
  Minus,
  Paperclip,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useCallback, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

interface RichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
  onImageUpload?: (file: File) => Promise<string>
  onAttachmentUpload?: (file: File) => Promise<{ url: string; name: string; size: number }>
  variables?: { key: string; label: string; value?: string }[]
  templates?: { id: string; name: string; content: string }[]
}

const MenuBar = ({ editor, onImageUpload, onAttachmentUpload, variables, templates }) => {
  const [linkUrl, setLinkUrl] = useState('')
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  if (!editor) return null

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setIsLinkPopoverOpen(false)
    }
  }

  const addImage = async () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl('')
      setIsImagePopoverOpen(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImageUpload) {
      try {
        const url = await onImageUpload(file)
        editor.chain().focus().setImage({ src: url }).run()
        setIsImagePopoverOpen(false)
      } catch (error) {
        console.error('Failed to upload image:', error)
      }
    }
  }

  const insertVariable = (variable: string) => {
    editor.chain().focus().insertContent(`{${variable}}`).run()
  }

  const insertTemplate = (template: string) => {
    editor.chain().focus().setContent(template).run()
  }

  const colors = [
    '#000000', '#424242', '#636363', '#9C9C94', '#CEC6CE', '#EFEFEF',
    '#F7F7F7', '#FFFFFF', '#FF0000', '#FF9900', '#FFFF00', '#00FF00',
    '#00FFFF', '#0000FF', '#9900FF', '#FF00FF', '#F4CCCC', '#FCE5CD',
    '#FFF2CC', '#D9EAD3', '#D0E0E3', '#CFE2F3', '#D9D2E9', '#EAD1DC'
  ]

  const fonts = [
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'monospace', label: 'Monospace' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Helvetica', label: 'Helvetica' }
  ]

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('📎 Attachment upload triggered:', file)
    
    if (file && onAttachmentUpload) {
      console.log('📎 Processing attachment:', file.name, file.size, file.type)
      try {
        const attachment = await onAttachmentUpload(file)
        console.log('📎 Attachment processed:', attachment)
        
        // Format file size
        const formatFileSize = (bytes: number) => {
          if (bytes === 0) return '0 Bytes'
          const k = 1024
          const sizes = ['Bytes', 'KB', 'MB', 'GB']
          const i = Math.floor(Math.log(bytes) / Math.log(k))
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
        }
        
        // Get file type icon
        const getFileTypeIcon = (type: string) => {
          if (type.includes('pdf')) {
            return `<svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12V6l-4-4H4v16zM9 3h2v4h4l-6-4z"/><path d="M7 11h1v4H7v-4zm2-1h1v5H9v-5zm2 2h1v3h-1v-3z"/></svg>`
          } else if (type.includes('image')) {
            return `<svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg>`
          } else if (type.includes('word') || type.includes('document')) {
            return `<svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12V6l-4-4H4v16zM9 3h2v4h4l-6-4z"/><path d="M6 10h8v1H6v-1zm0 2h8v1H6v-1zm0 2h6v1H6v-1z"/></svg>`
          } else {
            return `<svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd"></path></svg>`
          }
        }

        // Create a styled attachment element that shows as an attachment badge
        const attachmentHtml = `
          <div class="attachment-block" data-attachment='${JSON.stringify(attachment).replace(/'/g, "&#39;")}' style="display: inline-block; margin: 8px 4px; vertical-align: middle;">
            <div class="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm hover:bg-blue-100 transition-colors max-w-xs" style="cursor: pointer; text-decoration: none;">
              ${getFileTypeIcon(attachment.type)}
              <div class="flex-1 min-w-0">
                <div class="truncate font-medium" style="font-weight: 500;">${attachment.name}</div>
                <div class="text-xs text-blue-600">${formatFileSize(attachment.size)}</div>
              </div>
            </div>
          </div>
        `
        
        // Don't insert into editor content - let parent handle display
        // editor.chain().focus().insertContent(attachmentHtml).run()
        
        // Clear the file input
        e.target.value = ''
      } catch (error) {
        console.error('Failed to upload attachment:', error)
        alert(`Failed to upload attachment: ${error.message || 'Please try again.'}`)
        
        // Clear the file input on error too
        e.target.value = ''
      }
    }
  }

  return (
    <div className="border-b bg-gray-50 p-3 flex flex-wrap items-center gap-1">
      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-10 w-10 p-0",
            editor.isActive('bold') && "bg-gray-200 shadow-inner"
          )}
          title="Bold"
        >
          <Bold className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-10 w-10 p-0",
            editor.isActive('italic') && "bg-gray-200 shadow-inner"
          )}
          title="Italic"
        >
          <Italic className="h-5 w-5" />
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
          <Strikethrough className="h-5 w-5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <div className="flex items-center gap-1">
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
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor.isActive('bulletList')) {
              editor.chain().focus().liftListItem('listItem').run()
            } else {
              editor.chain().focus().toggleBulletList().run()
            }
          }}
          className={cn(
            "h-10 w-10 p-0",
            editor.isActive('bulletList') && "bg-gray-200 shadow-inner"
          )}
          title="Bullet List"
        >
          <List className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor.isActive('orderedList')) {
              editor.chain().focus().liftListItem('listItem').run()
            } else {
              editor.chain().focus().toggleOrderedList().run()
            }
          }}
          className={cn(
            "h-10 w-10 p-0",
            editor.isActive('orderedList') && "bg-gray-200 shadow-inner"
          )}
          title="Numbered List"
        >
          <ListOrdered className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "h-10 w-10 p-0",
            editor.isActive('blockquote') && "bg-gray-200 shadow-inner"
          )}
          title="Quote"
        >
          <Quote className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            "h-10 w-10 p-0",
            editor.isActive('codeBlock') && "bg-gray-200 shadow-inner"
          )}
          title="Code Block"
        >
          <Code className="h-5 w-5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-1">
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={cn(
            "h-10 w-10 p-0",
            editor.isActive({ textAlign: 'justify' }) && "bg-gray-200 shadow-inner"
          )}
          title="Justify"
        >
          <AlignJustify className="h-5 w-5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Font Family */}
      <Select
        value={editor.getAttributes('textStyle').fontFamily || 'sans-serif'}
        onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
      >
        <SelectTrigger className="h-10 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fonts.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            title="Text Color"
          >
            <Palette className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="grid grid-cols-8 gap-1">
            {colors.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  editor.chain().focus().setColor(color).run()
                  setSelectedColor(color)
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6" />

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
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addLink}>Add Link</Button>
              {editor.isActive('link') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => editor.chain().focus().unsetLink().run()}
                >
                  Remove Link
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Image */}
      <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            title="Insert Image"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <div>
              <Label>Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
              <Button size="sm" onClick={addImage} className="mt-2">
                Add Image
              </Button>
            </div>
            {onImageUpload && (
              <>
                <div className="text-center text-sm text-gray-500">or</div>
                <div>
                  <Label>Upload Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Attachment */}
      {onAttachmentUpload && (
        <>
          <input
            type="file"
            id="attachment-upload-input"
            className="hidden"
            onChange={handleAttachmentUpload}
            multiple={false}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('📎 Attachment button clicked')
              const input = document.getElementById('attachment-upload-input') as HTMLInputElement
              console.log('📎 Found input element:', !!input)
              if (input) {
                console.log('📎 Triggering file picker')
                input.click()
              }
            }}
            className="h-10 w-10 p-0"
            title="Add Attachment"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Table */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className="h-10 w-10 p-0"
        title="Insert Table"
      >
        <TableIcon className="h-5 w-5" />
      </Button>

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

      <Separator orientation="vertical" className="h-6" />

      {/* Variables */}
      {variables && variables.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-3 gap-2"
              title="Insert Variable"
            >
              <Variable className="h-5 w-5" />
              <span className="text-sm font-medium">Variables</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Insert Variable</Label>
              <div className="space-y-1 mt-2">
                {variables.map((variable) => (
                  <Button
                    key={variable.key}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => insertVariable(variable.key)}
                  >
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded mr-2">
                      {`{${variable.key}}`}
                    </code>
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Templates */}
      {templates && templates.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-3 gap-2"
              title="Insert Template"
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">Templates</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Insert Template</Label>
              <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => insertTemplate(template.content)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-10 w-10 p-0 disabled:opacity-50"
          title="Undo"
        >
          <Undo className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-10 w-10 p-0 disabled:opacity-50"
          title="Redo"
        >
          <Redo className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Type your message...',
  className,
  minHeight = '200px',
  disabled = false,
  onImageUpload,
  onAttachmentUpload,
  variables,
  templates
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {},
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {},
        },
        listItem: {
          HTMLAttributes: {},
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Color,
      TextStyle,
      FontFamily,
      Placeholder.configure({
        placeholder
      })
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

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  return (
    <div className={cn("border border-gray-300 rounded-lg overflow-hidden bg-white", className)}>
      <MenuBar 
        editor={editor} 
        onImageUpload={onImageUpload}
        onAttachmentUpload={onAttachmentUpload}
        variables={variables}
        templates={templates}
      />
      <div className="bg-white">
        <EditorContent 
          editor={editor} 
          className={cn(
            "prose prose-sm max-w-none p-4 focus:outline-none bg-white",
            "[&_.ProseMirror]:outline-none [&_.ProseMirror]:border-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:focus:ring-0 [&_.ProseMirror]:focus:outline-none",
            "[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:bg-white",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ 
            minHeight, 
            backgroundColor: 'white',
          }}
        />
        <style jsx global>{`
          .ProseMirror {
            min-height: 200px !important;
            background-color: white !important;
            outline: none !important;
            border: none !important;
            padding: 1rem !important;
            cursor: text !important;
          }
          
          .ProseMirror:focus {
            outline: none !important;
            ring: 0 !important;
          }
          
          .ProseMirror p.is-editor-empty:first-child::before {
            color: #adb5bd !important;
            content: attr(data-placeholder) !important;
            float: left !important;
            height: 0 !important;
            pointer-events: none !important;
          }
          
          .ProseMirror ul {
            list-style-type: disc !important;
            margin-left: 0 !important;
            padding-left: 1.25rem !important;
            margin: 1rem 0 !important;
          }
          
          .ProseMirror ol {
            list-style-type: decimal !important;
            margin-left: 0 !important;
            padding-left: 1.25rem !important;
            margin: 1rem 0 !important;
          }
          
          .ProseMirror li {
            display: list-item !important;
            list-style-position: outside !important;
            margin: 0.125rem 0 !important;
            padding: 0 !important;
            line-height: 1.6 !important;
          }
          
          .ProseMirror li p {
            margin: 0 !important;
            padding: 0 !important;
            display: inline-block !important;
            width: 100% !important;
          }
          
          .ProseMirror ul ul {
            list-style-type: circle !important;
            margin: 0.5rem 0 !important;
            padding-left: 1.25rem !important;
          }
          
          .ProseMirror ol ol {
            list-style-type: lower-alpha !important;
            margin: 0.5rem 0 !important;
            padding-left: 1.25rem !important;
          }
          
          .ProseMirror ul ul ul {
            list-style-type: square !important;
          }
          
          /* Override prose styles that might interfere */
          .prose .ProseMirror ul {
            list-style-type: disc !important;
          }
          
          .prose .ProseMirror ol {
            list-style-type: decimal !important;
          }
          
          .prose .ProseMirror li {
            margin-top: 0.125rem !important;
            margin-bottom: 0.125rem !important;
          }
          
          /* Attachment styling */
          .ProseMirror .attachment-block {
            display: inline-block !important;
            margin: 4px 2px !important;
            vertical-align: middle !important;
            user-select: none !important;
          }
          
          .ProseMirror .attachment-block > div {
            pointer-events: none !important;
            background-color: #eff6ff !important;
            color: #1d4ed8 !important;
            border: 1px solid #bfdbfe !important;
            border-radius: 0.5rem !important;
            padding: 8px 12px !important;
            font-size: 0.875rem !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            max-width: 300px !important;
          }
          
          .ProseMirror .attachment-block svg {
            flex-shrink: 0 !important;
            width: 20px !important;
            height: 20px !important;
          }
          
          .ProseMirror .attachment-block .truncate {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            font-weight: 500 !important;
          }
        `}</style>
      </div>
    </div>
  )
}