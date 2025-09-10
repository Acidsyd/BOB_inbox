/**
 * Email formatting utilities for rich text editor
 */

/**
 * Convert HTML from the rich text editor to email-safe HTML
 * Ensures compatibility with email clients
 */
export function formatHtmlForEmail(html: string): string {
  if (!html) return ''

  let processedHtml = html
  
  // Convert attachment blocks to email-friendly format
  processedHtml = processedHtml.replace(
    /<div class="attachment-block"[^>]*data-attachment='([^']+)'[^>]*>.*?<\/div>/gs, 
    (match, attachmentData) => {
      try {
        const attachment = JSON.parse(attachmentData.replace(/&#39;/g, "'"))
        const fileIcon = getFileTypeIcon(attachment.type)
        const formattedSize = formatFileSize(attachment.size)
        
        return `
          <div style="display: inline-block; margin: 8px 4px; vertical-align: middle;">
            <div style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 14px; max-width: 300px; text-decoration: none; font-family: Arial, sans-serif;">
              <span style="font-size: 16px;">${fileIcon}</span>
              <div>
                <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${attachment.name}</div>
                <div style="font-size: 12px; color: #3b82f6;">${formattedSize}</div>
              </div>
            </div>
          </div>
        `
      } catch (e) {
        return match // Return original if parsing fails
      }
    }
  )

  // Wrap content in a container with email-safe styles
  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">
      ${processedHtml}
    </div>
  `.trim()

  // Convert certain HTML elements to email-safe equivalents
  return emailHtml
    // Convert text alignment to inline styles
    .replace(/<p style="text-align: (\w+)">/g, '<p style="text-align: $1; margin: 0 0 10px 0;">')
    .replace(/<p>/g, '<p style="margin: 0 0 10px 0;">')
    
    // Convert headings to email-safe styles
    .replace(/<h1>/g, '<h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0;">')
    .replace(/<h2>/g, '<h2 style="font-size: 20px; font-weight: bold; margin: 0 0 10px 0;">')
    .replace(/<h3>/g, '<h3 style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">')
    
    // Convert lists to have proper spacing
    .replace(/<ul>/g, '<ul style="margin: 0 0 10px 0; padding-left: 20px;">')
    .replace(/<ol>/g, '<ol style="margin: 0 0 10px 0; padding-left: 20px;">')
    .replace(/<li>/g, '<li style="margin: 0 0 5px 0;">')
    
    // Convert blockquotes
    .replace(/<blockquote>/g, '<blockquote style="border-left: 3px solid #ccc; margin: 10px 0; padding-left: 10px; color: #666;">')
    
    // Convert code blocks
    .replace(/<pre>/g, '<pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">')
    .replace(/<code>/g, '<code style="background-color: #f5f5f5; padding: 2px 4px; border-radius: 2px; font-family: monospace;">')
    
    // Ensure links open in new window
    .replace(/<a href/g, '<a style="color: #0066cc; text-decoration: underline;" target="_blank" rel="noopener noreferrer" href')
    
    // Convert tables to email-safe format
    .replace(/<table>/g, '<table style="border-collapse: collapse; width: 100%; margin: 10px 0;" cellpadding="8" cellspacing="0" border="1">')
    .replace(/<th>/g, '<th style="background-color: #f5f5f5; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #ddd;">')
    .replace(/<td>/g, '<td style="padding: 8px; border: 1px solid #ddd;">')
    
    // Ensure images are responsive
    .replace(/<img /g, '<img style="max-width: 100%; height: auto;" ')
    
    // Convert horizontal rules
    .replace(/<hr>/g, '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">')
}

function getFileTypeIcon(type: string): string {
  if (type.includes('pdf')) return '📄'
  if (type.includes('image')) return '🖼️'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
  if (type.includes('powerpoint') || type.includes('presentation')) return '📈'
  return '📎'
}

/**
 * Replace template variables with actual values
 * @param content - HTML or text content with variables like {first_name}
 * @param variables - Object with variable values
 */
export function replaceVariables(
  content: string, 
  variables: Record<string, string | undefined>
): string {
  let processedContent = content

  // Replace each variable, handling undefined values
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'gi')
    processedContent = processedContent.replace(regex, value || '')
  })

  // Add current date variables if not provided
  const now = new Date()
  const dateVariables = {
    current_date: now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    current_month: now.toLocaleDateString('en-US', { month: 'long' }),
    current_year: now.getFullYear().toString(),
    current_day: now.toLocaleDateString('en-US', { weekday: 'long' })
  }

  Object.entries(dateVariables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'gi')
    processedContent = processedContent.replace(regex, value)
  })

  return processedContent
}

/**
 * Extract plain text from HTML content
 */
export function extractPlainText(html: string): string {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Replace certain elements with text equivalents
  temp.querySelectorAll('br').forEach(el => el.replaceWith('\n'))
  temp.querySelectorAll('p').forEach(el => el.replaceWith(el.textContent + '\n\n'))
  temp.querySelectorAll('li').forEach(el => el.replaceWith('• ' + el.textContent + '\n'))
  temp.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => 
    el.replaceWith('\n' + el.textContent + '\n\n')
  )

  // Get text content and clean up
  return temp.textContent?.trim()
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim() || ''
}

/**
 * Sanitize HTML content for safe display
 * Removes potentially dangerous elements and attributes
 */
export function sanitizeHtml(html: string): string {
  // List of allowed tags
  const allowedTags = [
    'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'div', 'span'
  ]

  // List of allowed attributes per tag
  const allowedAttributes = {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['style', 'class']
  }

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove on* event attributes
  sanitized = sanitized.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  sanitized = sanitized.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  return sanitized
}

/**
 * Validate email template variables
 * Returns array of missing required variables
 */
export function validateTemplateVariables(
  content: string,
  availableVariables: string[]
): string[] {
  const variablePattern = /{(\w+)}/g
  const usedVariables: string[] = []
  let match

  while ((match = variablePattern.exec(content)) !== null) {
    if (!usedVariables.includes(match[1])) {
      usedVariables.push(match[1])
    }
  }

  // Check which variables are missing
  return usedVariables.filter(v => !availableVariables.includes(v))
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Check if content has any formatting (not just plain text)
 */
export function hasFormatting(html: string): boolean {
  // Check for any HTML tags beyond basic paragraph tags
  const formattingTags = [
    '<strong>', '<em>', '<u>', '<s>', '<h1>', '<h2>', '<h3>',
    '<ul>', '<ol>', '<blockquote>', '<code>', '<table>',
    'style=', '<img', '<a '
  ]

  return formattingTags.some(tag => html.toLowerCase().includes(tag))
}

/**
 * Get a preview of the email content (first N characters of plain text)
 */
export function getEmailPreview(html: string, maxLength: number = 150): string {
  const plainText = extractPlainText(html)
  
  if (plainText.length <= maxLength) {
    return plainText
  }

  // Cut at the last complete word
  const truncated = plainText.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  return (lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated) + '...'
}