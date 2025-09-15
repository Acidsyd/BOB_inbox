/**
 * Date utilities for consistent timestamp handling across the system
 * 
 * This module provides consistent local timestamp formatting to solve
 * the timezone mismatch issue between Gmail API local times and
 * campaign system UTC times.
 */

/**
 * Create local timestamp without timezone conversion
 * This matches the format used by GmailSyncProvider and ensures
 * consistent display times for users.
 * 
 * @param {Date} date - Date to format (defaults to current time)
 * @returns {string} Local timestamp in YYYY-MM-DD HH:MM:SS format
 */
function createLocalTimestamp(date = new Date()) {
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0') + 'T' + 
    String(date.getHours()).padStart(2, '0') + ':' + 
    String(date.getMinutes()).padStart(2, '0') + ':' + 
    String(date.getSeconds()).padStart(2, '0');
}

/**
 * Create local timestamp with milliseconds
 * For high-precision timing requirements
 * 
 * @param {Date} date - Date to format (defaults to current time)  
 * @returns {string} Local timestamp with milliseconds
 */
function createLocalTimestampWithMs(date = new Date()) {
  const baseTimestamp = createLocalTimestamp(date);
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${baseTimestamp}.${milliseconds}`;
}

/**
 * Convert a Date to local timestamp for database storage
 * This is the main function to replace .toISOString() calls
 * 
 * @param {Date|string|number} input - Date input to convert
 * @returns {string} Local timestamp suitable for database storage
 */
function toLocalTimestamp(input) {
  try {
    // Handle undefined/null inputs explicitly - if no input provided, use current time
    if (input === undefined || input === null) {
      return createLocalTimestamp(); // Return current time as fallback (intentional for empty calls)
    }
    
    const date = input instanceof Date ? input : new Date(input);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided to toLocalTimestamp:', input);
      return createLocalTimestamp(); // Return current time as fallback
    }
    
    return createLocalTimestamp(date);
  } catch (error) {
    console.warn('Error converting to local timestamp:', error, input);
    return createLocalTimestamp(); // Return current time as fallback
  }
}

/**
 * Parse various timestamp formats consistently
 * Handles both UTC and local timestamp formats from the database
 * 
 * @param {string} timestampStr - Timestamp string to parse
 * @returns {Date} Parsed Date object
 */
function parseTimestamp(timestampStr) {
  if (!timestampStr) return new Date();
  
  try {
    // Handle timezone indicators
    const hasTimezone = /[+-]\d{2}:?\d{2}|Z$/i.test(timestampStr);
    let adjustedTimestampStr = timestampStr;
    
    // If no timezone info, treat as local time (post-fix format)
    if (!hasTimezone && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(timestampStr)) {
      adjustedTimestampStr = timestampStr.replace(' ', 'T');
    }
    
    return new Date(adjustedTimestampStr);
  } catch (error) {
    console.warn('Error parsing timestamp:', error, timestampStr);
    return new Date(); // Return current time as fallback
  }
}

/**
 * Format timestamp for display in user's timezone
 * This handles the frontend display logic consistently
 * 
 * @param {string} timestampStr - Database timestamp string
 * @param {object} options - Formatting options
 * @returns {string} Formatted display string
 */
function formatDisplayTime(timestampStr, options = {}) {
  if (!timestampStr) return 'Unknown';
  
  try {
    const date = parseTimestamp(timestampStr);
    
    if (options.relative) {
      // Return relative time (e.g., "2 hours ago")
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      
      // Fall through to standard formatting for older dates
    }
    
    // Standard locale-aware formatting
    return date.toLocaleString(options.locale, {
      year: 'numeric',
      month: options.short ? 'short' : 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: options.includeSeconds ? '2-digit' : undefined,
      ...options.formatOptions
    });
  } catch (error) {
    console.warn('Error formatting display time:', error, timestampStr);
    return 'Invalid date';
  }
}

/**
 * Get current timestamp for logging/debugging
 * @returns {string} Current local timestamp
 */
function now() {
  return createLocalTimestamp();
}

module.exports = {
  createLocalTimestamp,
  createLocalTimestampWithMs,
  toLocalTimestamp,
  parseTimestamp,
  formatDisplayTime,
  now
};