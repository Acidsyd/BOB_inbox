/**
 * Strip tracking pixels and tracking links from email HTML content
 * This prevents our own tracking from firing when viewing emails in the app's inbox
 */
export function stripTrackingElements(html: string): string {
  if (!html) return html
  
  // Remove tracking pixels (1x1 images that point to our tracking endpoint)
  // Pattern 1: Images pointing to /api/track/open/
  let cleaned = html.replace(
    /<img[^>]*src=["'][^"']*\/api\/track\/open\/[^"']*["'][^>]*>/gi,
    ''
  )
  
  // Pattern 2: Any 1x1 pixel images (common tracking pixel size)
  cleaned = cleaned.replace(
    /<img[^>]*(?:width=["']1["']|height=["']1["'])[^>]*(?:width=["']1["']|height=["']1["'])[^>]*>/gi,
    ''
  )
  
  // Pattern 3: Images with display:none or visibility:hidden (often tracking pixels)
  cleaned = cleaned.replace(
    /<img[^>]*style=["'][^"']*(?:display:\s*none|visibility:\s*hidden)[^"']*["'][^>]*>/gi,
    ''
  )
  
  // Replace tracking links with original URLs
  // Pattern: /api/track/click/{token}/{index}/{encodedUrl}
  cleaned = cleaned.replace(
    /href=["']([^"']*\/api\/track\/click\/[^\/]+\/[^\/]+\/([^"']+))["']/gi,
    (match, fullUrl, encodedUrl) => {
      try {
        // Decode the base64url encoded original URL (browser-compatible)
        const originalUrl = atob(encodedUrl.replace(/-/g, '+').replace(/_/g, '/'))
        return `href="${originalUrl}"`
      } catch (e) {
        // If decoding fails, remove the tracking but keep some link
        return `href="#"`
      }
    }
  )
  
  // Remove any remaining tracking pixel containers (divs that only contain tracking pixels)
  // This catches cases where tracking pixels are wrapped in divs
  cleaned = cleaned.replace(
    /<div[^>]*>\s*<\/div>/gi,
    ''
  )
  
  return cleaned
}

/**
 * Check if HTML content contains tracking elements
 */
export function hasTrackingElements(html: string): boolean {
  if (!html) return false
  
  // Check for tracking pixels
  const hasTrackingPixel = 
    /\/api\/track\/open\//i.test(html) ||
    /<img[^>]*(?:width=["']1["']|height=["']1["'])/i.test(html) ||
    /<img[^>]*style=["'][^"']*(?:display:\s*none|visibility:\s*hidden)/i.test(html)
  
  // Check for tracking links
  const hasTrackingLinks = /\/api\/track\/click\//i.test(html)
  
  return hasTrackingPixel || hasTrackingLinks
}