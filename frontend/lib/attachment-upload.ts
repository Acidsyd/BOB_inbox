export interface Attachment {
  url: string
  name: string
  size: number
  type: string
}

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
]

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return `File size must be less than ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB`
  }

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return 'File type not allowed. Please upload PDF, Word, Excel, PowerPoint, text, image, or ZIP files.'
  }

  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function uploadAttachment(file: File): Promise<Attachment> {
  console.log('📎 uploadAttachment called with:', file.name, file.type, file.size)
  
  const validationError = validateAttachment(file)
  if (validationError) {
    console.log('📎 Validation error:', validationError)
    throw new Error(validationError)
  }

  console.log('📎 File validation passed, starting base64 conversion')

  // Convert file to base64 for embedding in email
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const base64String = reader.result as string
      console.log('📎 Base64 conversion successful, length:', base64String.length)
      
      resolve({
        url: base64String, // Base64 data URL for embedding
        name: file.name,
        size: file.size,
        type: file.type
      })
    }
    
    reader.onerror = () => {
      console.log('📎 FileReader error')
      reject(new Error('Failed to read file'))
    }
    
    console.log('📎 Starting FileReader.readAsDataURL')
    reader.readAsDataURL(file)
  })
}

export function createAttachmentElement(attachment: Attachment): string {
  const fileIcon = getFileIcon(attachment.type)
  const formattedSize = formatFileSize(attachment.size)
  
  return `
    <div class="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm hover:bg-blue-100 transition-colors max-w-xs">
      <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        ${fileIcon}
      </svg>
      <div class="flex-1 min-w-0">
        <div class="truncate font-medium">${attachment.name}</div>
        <div class="text-xs text-blue-600">${formattedSize}</div>
      </div>
    </div>
  `
}

function getFileIcon(fileType: string): string {
  // Default paperclip icon
  const defaultIcon = `<path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd"></path>`
  
  if (fileType.includes('pdf')) {
    return `<path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm9 6a1 1 0 11-2 0 1 1 0 012 0zM6.5 9.5a1 1 0 100-2 1 1 0 000 2zm3-4a1 1 0 11-2 0 1 1 0 012 0z"></path>`
  }
  
  if (fileType.includes('image')) {
    return `<path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path>`
  }
  
  if (fileType.includes('word') || fileType.includes('document')) {
    return `<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clip-rule="evenodd"></path>`
  }
  
  return defaultIcon
}