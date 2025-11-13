'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import ImageResize from 'tiptap-extension-resize-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Dropcursor from '@tiptap/extension-dropcursor'
import { LineHeight } from './extensions/line-height'
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
  Upload,
  Highlighter,
  IndentIncrease,
  IndentDecrease,
  LineChart
} from 'lucide-react'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { cn } from '../../lib/utils'
import { useCallback, useState, useEffect, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'

interface RichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
  onImageUpload?: (file: File) => Promise<string>
  onAttachmentUpload?: (file: File) => Promise<{ url: string; name: string; size: number; type: string }>
  variables?: { key: string; label: string; value?: string }[]
  templates?: { id: string; name: string; content: string }[]
}

interface MenuBarProps {
  editor: any
  onImageUpload?: (file: File) => Promise<string>
  onAttachmentUpload?: (file: File) => Promise<{ url: string; name: string; size: number; type: string }>
  variables?: { key: string; label: string; value?: string }[]
  templates?: { id: string; name: string; content: string }[]
}

const MenuBar = memo(({ editor, onImageUpload, onAttachmentUpload, variables, templates }: MenuBarProps) => {
  const [linkUrl, setLinkUrl] = useState('')
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const addLink = useCallback(() => {
    if (!editor) return
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setIsLinkPopoverOpen(false)
    }
  }, [linkUrl, editor])

  const addImage = useCallback(async () => {
    if (!editor) return
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl('')
      setIsImagePopoverOpen(false)
    }
  }, [imageUrl, editor])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return
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
  }, [editor, onImageUpload])

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    if (!editor) return
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/') && onImageUpload) {
      onImageUpload(file).then((url) => {
        editor.chain().focus().setImage({ src: url }).run()
      }).catch((error) => {
        console.error('Failed to upload dropped image:', error)
      })
    }
  }, [editor, onImageUpload])

  const handleImagePaste = useCallback((e: ClipboardEvent) => {
    if (!editor) return
    if (!onImageUpload) return

    const items = e.clipboardData?.items
    if (!items) return

    // Check if there's HTML content in clipboard (like email signatures)
    const htmlData = e.clipboardData?.getData('text/html')

    // Only intercept if it's a pure image paste (no HTML content)
    // This allows HTML signatures to be pasted normally
    if (htmlData && htmlData.trim().length > 0) {
      // Let Tiptap handle HTML paste naturally
      return
    }

    // Handle standalone image paste
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          onImageUpload(file).then((url) => {
            editor.chain().focus().setImage({ src: url }).run()
          }).catch((error) => {
            console.error('Failed to upload pasted image:', error)
          })
        }
        break
      }
    }
  }, [editor, onImageUpload])

  const insertVariable = useCallback((variable: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(`{{${variable}}}`).run()
  }, [editor])

  const insertTemplate = useCallback((template: string) => {
    if (!editor) return
    editor.chain().focus().setContent(template).run()
  }, [editor])

  const handleIndent = useCallback(() => {
    if (!editor) return

    // Check if we're in a list item
    if (editor.isActive('listItem')) {
      editor.chain().focus().sinkListItem('listItem').run()
    } else {
      // For non-list content, wrap in blockquote for visual indent
      editor.chain().focus().toggleBlockquote().run()
    }
  }, [editor])

  const handleOutdent = useCallback(() => {
    if (!editor) return

    // Check if we're in a list item
    if (editor.isActive('listItem')) {
      editor.chain().focus().liftListItem('listItem').run()
    } else if (editor.isActive('blockquote')) {
      // Remove blockquote to outdent
      editor.chain().focus().toggleBlockquote().run()
    }
  }, [editor])

  // Register paste handler
  useEffect(() => {
    if (editor) {
      const element = editor.view.dom
      element.addEventListener('paste', handleImagePaste as any)
      return () => {
        element.removeEventListener('paste', handleImagePaste as any)
      }
    }
  }, [editor, handleImagePaste])

  const colors = [
    '#000000', '#424242', '#636363', '#9C9C94', '#CEC6CE', '#EFEFEF',
    '#F7F7F7', '#FFFFFF', '#FF0000', '#FF9900', '#FFFF00', '#00FF00',
    '#00FFFF', '#0000FF', '#9900FF', '#FF00FF', '#F4CCCC', '#FCE5CD',
    '#FFF2CC', '#D9EAD3', '#D0E0E3', '#CFE2F3', '#D9D2E9', '#EAD1DC'
  ]

  const highlightColors = [
    { value: '#fff59d', label: 'Yellow' },
    { value: '#a7ffeb', label: 'Teal' },
    { value: '#b39ddb', label: 'Purple' },
    { value: '#f48fb1', label: 'Pink' },
    { value: '#80cbc4', label: 'Cyan' },
    { value: '#ffccbc', label: 'Orange' },
    { value: '#c5e1a5', label: 'Green' },
    { value: '#e0e0e0', label: 'Gray' }
  ]

  const lineHeights = [
    { value: '1.0', label: '1.0' },
    { value: '1.5', label: '1.5' },
    { value: '2.0', label: '2.0' },
    { value: '2.5', label: '2.5' }
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

  if (!editor) return null

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

      {/* Indent/Outdent */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOutdent}
          className="h-10 w-10 p-0"
          title="Outdent (lists) / Remove quote (text)"
        >
          <IndentDecrease className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleIndent}
          className="h-10 w-10 p-0"
          title="Indent (lists) / Add quote (text)"
        >
          <IndentIncrease className="h-5 w-5" />
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

      {/* Line Height */}
      <Select
        value={editor.getAttributes('paragraph').lineHeight || '1.5'}
        onValueChange={(value) => editor.chain().focus().setLineHeight(value).run()}
      >
        <SelectTrigger className="h-10 w-24">
          <LineChart className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {lineHeights.map((lineHeight) => (
            <SelectItem key={lineHeight.value} value={lineHeight.value}>
              {lineHeight.label}
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

      {/* Highlight Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-10 w-10 p-0",
              editor.isActive('highlight') && "bg-gray-200 shadow-inner"
            )}
            title="Highlight Color"
          >
            <Highlighter className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Highlight Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {highlightColors.map((highlight) => (
                <button
                  key={highlight.value}
                  className="h-8 rounded border border-gray-300 hover:scale-105 transition-transform flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: highlight.value }}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color: highlight.value }).run()
                  }}
                  title={highlight.label}
                >
                  {highlight.label}
                </button>
              ))}
            </div>
            {editor.isActive('highlight') && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
              >
                Remove Highlight
              </Button>
            )}
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
                      {`{{${variable.key}}}`}
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
})

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
  // Debounced onChange callback
  const debouncedOnChange = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (html: string, text: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        onChange(html, text)
      }, 200)
    }
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: false, // Disable StarterKit's dropcursor, use our custom one
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
      ImageResize.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table'
        }
      }),
      TableRow.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              }
            }
          }
        }
      }),
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              }
            }
          }
        }
      }),
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              }
            }
          }
        }
      }),
      Color,
      TextStyle,
      FontFamily,
      Placeholder.configure({
        placeholder
      }),
      Highlight.configure({
        multicolor: true
      }),
      Dropcursor.configure({
        color: '#3b82f6',
        width: 3
      }),
      LineHeight
    ],
    content: content || '',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      debouncedOnChange(html, text)
    },
    editorProps: {
      handleDrop: (view, event, slice, moved) => {
        if (!event.dataTransfer || moved) {
          return false
        }

        const files = Array.from(event.dataTransfer.files)
        const imageFile = files.find(file => file.type.startsWith('image/'))

        if (imageFile && onImageUpload) {
          event.preventDefault()
          onImageUpload(imageFile).then((url) => {
            const { schema } = view.state
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
            if (coordinates) {
              const node = schema.nodes.image.create({ src: url })
              const transaction = view.state.tr.insert(coordinates.pos, node)
              view.dispatch(transaction)
            }
          }).catch((error) => {
            console.error('Failed to upload dropped image:', error)
          })
          return true
        }

        return false
      }
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
          }

          .ProseMirror li p {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
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
