import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Timezone utility functions for consistent date/time handling
 * Automatically detects user's browser timezone and provides formatting functions
 */

/**
 * Get user's browser timezone
 * @returns {string} IANA timezone identifier (e.g., 'America/New_York', 'Europe/Rome')
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect browser timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

/**
 * Get timezone from localStorage with browser detection fallback
 * @returns {string} IANA timezone identifier
 */
export function getUserTimezone(): string {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    console.log('🔍 getUserTimezone: Running in SSR, returning UTC');
    return 'UTC';
  }

  try {
    // First try to get from localStorage (with safety check)
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('userTimezone');
    } catch (storageError) {
      console.warn('🔍 getUserTimezone: localStorage not accessible:', storageError);
    }

    if (stored && stored !== 'null' && stored !== 'undefined') {
      console.log('🔍 getUserTimezone: Found stored timezone:', stored);
      return stored;
    }

    // Fall back to browser detection
    const browserTimezone = getBrowserTimezone();
    console.log('🔍 getUserTimezone: Detected browser timezone:', browserTimezone);

    // Store for future use (with safety check)
    try {
      if (browserTimezone && browserTimezone !== 'UTC') {
        localStorage.setItem('userTimezone', browserTimezone);
      }
    } catch (storageError) {
      console.warn('🔍 getUserTimezone: Could not store timezone:', storageError);
    }

    return browserTimezone;
  } catch (error) {
    console.warn('Error getting user timezone:', error);
    // Last resort: direct browser detection
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (intlError) {
      console.warn('Failed to get timezone from Intl API:', intlError);
      return 'UTC';
    }
  }
}

/**
 * Set user timezone preference
 * @param {string} timezone - IANA timezone identifier
 */
export function setUserTimezone(timezone: string): void {
  try {
    localStorage.setItem('userTimezone', timezone);
  } catch (error) {
    console.warn('Could not save timezone preference:', error);
  }
}

/**
 * Format date in user's timezone
 * @param {string | Date} date - Date to format
 * @param {string} formatString - date-fns format string
 * @param {string} timezone - Optional timezone (defaults to user timezone)
 * @returns {string} Formatted date string
 */
export function formatDateInTimezone(
  date: string | Date | undefined | null, 
  formatString: string = 'MMM d, yyyy h:mm a',
  timezone?: string
): string {
  if (!date) return 'Unknown';
  
  try {
    const userTimezone = timezone || getUserTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Handle invalid dates
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided:', date);
      return 'Invalid date';
    }
    
    return formatInTimeZone(dateObj, userTimezone, formatString);
  } catch (error) {
    console.error('Error formatting date in timezone:', error, { date, formatString, timezone });
    return 'Error formatting date';
  }
}

/**
 * Format date for inbox message view (detailed format)
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatInboxMessageDate(date: string | Date | undefined | null): string {
  return formatDateInTimezone(date, 'MMM d, yyyy h:mm a');
}

/**
 * Format date for conversation list (compact format with relative dates)
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatConversationDate(date: string | Date | undefined | null): string {
  if (!date) return '';
  
  try {
    const userTimezone = getUserTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const now = new Date();
    
    // Get timezone-aware formatted dates for comparison
    const todayStr = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd');
    const dateStr = formatInTimeZone(dateObj, userTimezone, 'yyyy-MM-dd');
    
    // Check if it's today
    if (dateStr === todayStr) {
      return formatInTimeZone(dateObj, userTimezone, 'h:mm a');
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatInTimeZone(yesterday, userTimezone, 'yyyy-MM-dd');
    if (dateStr === yesterdayStr) {
      return 'Yesterday';
    }
    
    // Check if it's this year
    const currentYear = formatInTimeZone(now, userTimezone, 'yyyy');
    const dateYear = formatInTimeZone(dateObj, userTimezone, 'yyyy');
    if (dateYear === currentYear) {
      return formatInTimeZone(dateObj, userTimezone, 'MMM d');
    }
    
    // Different year
    return formatInTimeZone(dateObj, userTimezone, 'MMM d, yyyy');
    
  } catch (error) {
    console.error('Error formatting conversation date:', error);
    return '';
  }
}

/**
 * Get timezone info for debugging
 * @returns {object} Timezone information
 */
export function getTimezoneInfo() {
  const timezone = getUserTimezone();
  const now = new Date();
  
  return {
    timezone,
    browserTimezone: getBrowserTimezone(),
    currentTime: formatDateInTimezone(now, 'yyyy-MM-dd HH:mm:ss zzz'),
    utcTime: now.toISOString(),
    timezoneOffset: now.getTimezoneOffset(),
    storedTimezone: localStorage.getItem('userTimezone')
  };
}

/**
 * Debug function to log timezone information
 */
export function logTimezoneDebug() {
  const info = getTimezoneInfo();
  console.log('🌐 Timezone Debug Info:', info);
  return info;
}