'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  height?: string
  showSnippets?: boolean
  snippets?: Array<{
    id: string
    name: string
    content: string
    category?: string
  }>
}

// Toolbar buttons configuration
const toolbarButtons = [
  { name: 'bold', icon: Bold, command: 'toggleBold' },
  { name: 'italic', icon: Italic, command: 'toggleItalic' },
  { name: 'underline', icon: UnderlineIcon, command: 'toggleUnderline' },
  { name: 'bulletList', icon: List, command: 'toggleBulletList' },
  { name: 'orderedList', icon: ListOrdered, command: 'toggleOrderedList' },
]

// Common email snippets
const defaultSnippets = [
  {
    id: 'first_name',
    name: 'First Name',
    content: '{first_name}',
    category: 'Personal'
  },
  {
    id: 'last_name',
    name: 'Last Name', 
    content: '{last_name}',
    category: 'Personal'
  },
  {
    id: 'full_name',
    name: 'Full Name',
    content: '{first_name} {last_name}',
    category: 'Personal'
  },
  {
    id: 'company',
    name: 'Company',
    content: '{company}',
    category: 'Business'
  },
  {
    id: 'job_title',
    name: 'Job Title',
    content: '{job_title}',
    category: 'Business'
  },
  {
    id: 'website',
    name: 'Website',
    content: '{website}',
    category: 'Business'
  },
  {
    id: 'greeting',
    name: 'Hi Greeting',
    content: 'Hi {first_name},',
    category: 'Templates'
  },
  {
    id: 'formal_greeting',
    name: 'Formal Greeting',
    content: 'Dear {first_name} {last_name},',
    category: 'Templates'
  },
  {
    id: 'casual_greeting',
    name: 'Casual Greeting',
    content: 'Hey {first_name}!',
    category: 'Templates'
  },
  {
    id: 'introduction',
    name: 'Introduction',
    content: 'I hope this email finds you well. My name is [Your Name] and I work at [Your Company].',
    category: 'Templates'
  },
  {
    id: 'value_prop',
    name: 'Value Proposition',
    content: 'We help companies like {company} to [specific benefit] by [how you do it].',
    category: 'Templates'
  },
  {
    id: 'call_to_action',
    name: 'Call to Action',
    content: 'Would you be open to a brief 15-minute call this week to discuss how we can help {company}?',
    category: 'Templates'
  },
  {
    id: 'signature',
    name: 'Professional Signature',
    content: 'Best regards,<br/>[Your Name]<br/>[Your Title]<br/>[Your Company]<br/>[Your Phone]',
    category: 'Templates'
  }
]

// Spintax examples
const spintaxSnippets = [
  {
    id: 'spintax_greeting',
    name: 'Spintax Greeting',
    content: '{Hi|Hello|Hey} {first_name}{,|!}',
    category: 'Spintax'
  },
  {
    id: 'spintax_intro',
    name: 'Spintax Introduction',
    content: 'I {noticed|saw|came across} your {profile|company|work} on {LinkedIn|your website|Google}.',
    category: 'Spintax'
  },
  {
    id: 'spintax_value',
    name: 'Spintax Value Prop',
    content: 'We {help|assist|work with} companies {like yours|such as {company}|in your industry} to {increase|boost|improve} their {revenue|growth|performance}.',
    category: 'Spintax'
  },
  {
    id: 'spintax_cta',
    name: 'Spintax CTA',
    content: 'Would you be {interested in|open to|available for} a {quick|brief|short} {call|chat|conversation} this week?',
    category: 'Spintax'
  }
]

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing your email...',
  className = '',
  height = '300px',
  showSnippets = true,
  snippets = []
}: RichTextEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Personal')
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full p-4',
        style: `min-height: ${height}; max-width: 100%;`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
    immediatelyRender: false,
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false)
    }
  }, [editor, value])
  
  // Combine default snippets with custom ones
  const allSnippets = [...defaultSnippets, ...spintaxSnippets, ...snippets]
  
  // Get unique categories
  const categories = [...new Set(allSnippets.map(s => s.category || 'Other'))]
  
  // Filter snippets by category
  const filteredSnippets = allSnippets.filter(s => 
    (s.category || 'Other') === selectedCategory
  )

  // Insert snippet into editor
  const insertSnippet = (snippet: typeof allSnippets[0]) => {
    if (editor) {
      editor.chain().focus().insertContent(snippet.content).run()
    }
  }

  // Toolbar button click handler
  const handleToolbarClick = (command: string) => {
    if (editor) {
      const chain = editor.chain().focus()
      
      switch (command) {
        case 'toggleBold':
          chain.toggleBold().run()
          break
        case 'toggleItalic':
          chain.toggleItalic().run()
          break
        case 'toggleUnderline':
          chain.toggleUnderline().run()
          break
        case 'toggleBulletList':
          chain.toggleBulletList().run()
          break
        case 'toggleOrderedList':
          chain.toggleOrderedList().run()
          break
      }
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <div className="border border-gray-300 rounded-md overflow-hidden">
        {/* Snippets Panel */}
        {showSnippets && (
          <div className="bg-gray-50 border-b border-gray-200 p-3">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">Snippets:</span>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {filteredSnippets.map(snippet => (
                <button
                  key={snippet.id}
                  onClick={() => insertSnippet(snippet)}
                  className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-purple-50 hover:border-purple-300 transition-colors"
                  title={snippet.content}
                >
                  {snippet.name}
                </button>
              ))}
            </div>
            
            {selectedCategory === 'Spintax' && (
              <div className="mt-2 text-xs text-gray-600">
                <strong>Spintax tip:</strong> Use {'{option1|option2|option3}'} to create variations. The system will randomly select one option per email.
              </div>
            )}
          </div>
        )}
        
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-2 bg-gray-50">
          <div className="flex flex-wrap gap-1">
            {toolbarButtons.map((button) => {
              const Icon = button.icon
              const isActive = editor.isActive(button.name)
              
              return (
                <button
                  key={button.name}
                  onClick={() => handleToolbarClick(button.command)}
                  className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                    isActive ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
                  }`}
                  title={button.name}
                >
                  <Icon size={16} />
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Editor */}
        <div className="relative" style={{ minHeight: height }}>
          <EditorContent 
            editor={editor}
            className="min-h-full"
            placeholder={placeholder}
          />
        </div>
      </div>
      
      <style jsx global>{`
        .rich-text-editor .ProseMirror {
          font-size: 14px;
          font-family: system-ui, -apple-system, sans-serif;
          line-height: 1.6;
          padding: 16px;
          border: none;
          outline: none;
          min-height: ${height};
        }
        
        .rich-text-editor .ProseMirror:focus {
          outline: none;
        }
        
        .rich-text-editor .ProseMirror p {
          margin: 0 0 1em 0;
        }
        
        .rich-text-editor .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        
        .rich-text-editor .ProseMirror ul,
        .rich-text-editor .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        
        .rich-text-editor .ProseMirror li {
          margin: 0.25em 0;
        }
        
        .rich-text-editor .ProseMirror strong {
          font-weight: 600;
        }
        
        .rich-text-editor .ProseMirror em {
          font-style: italic;
        }
        
        .rich-text-editor .ProseMirror u {
          text-decoration: underline;
        }
        
        .rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  )
}