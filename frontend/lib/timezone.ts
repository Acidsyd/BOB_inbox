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

    if (stored && stored !== 'null' && stored !== 'undefined' && stored !== null && stored !== undefined) {
      console.log('🔍 getUserTimezone: Found stored timezone:', stored);
      return stored;
    }

    // Clean up invalid localStorage values
    if (stored === 'null' || stored === 'undefined') {
      console.log('🔍 getUserTimezone: Clearing invalid stored timezone value:', stored);
      try {
        localStorage.removeItem('userTimezone');
      } catch (cleanupError) {
        console.warn('🔍 getUserTimezone: Could not clear invalid timezone:', cleanupError);
      }
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
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else {
      const dateStr = date.toString();
      // Handle legacy timestamps without timezone info - treat as UTC
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(dateStr)) {
        // Legacy timestamps without 'Z' should be treated as UTC
        dateObj = new Date(dateStr + 'Z');
      } else {
        dateObj = new Date(dateStr);
      }
    }

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
 * Validate if a timezone is a valid IANA timezone identifier
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} True if valid timezone
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get timezone abbreviation (e.g., EST, PST, CEST)
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Date for abbreviation (handles DST)
 * @returns {string} Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone?: string, date: Date = new Date()): string {
  const tz = timezone || getUserTimezone();

  if (!isValidTimezone(tz)) {
    return 'UTC';
  }

  try {
    return date.toLocaleDateString('en', {
      timeZone: tz,
      timeZoneName: 'short'
    }).split(', ')[1] || 'UTC';
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return 'UTC';
  }
}

/**
 * Enhanced timezone detection with change monitoring
 * @returns {TimezoneInfo} Comprehensive timezone information
 */
export interface TimezoneInfo {
  timezone: string;
  browserTimezone: string;
  abbreviation: string;
  offset: number;
  isDST: boolean;
  confidence: 'high' | 'medium' | 'low';
  detectedAt: string;
  isValid: boolean;
}

export function detectUserTimezone(): TimezoneInfo {
  const browserTimezone = getBrowserTimezone();
  const now = new Date();

  // Check if we're in daylight saving time
  const isDST = isDaylightSavingTime(now);

  return {
    timezone: browserTimezone,
    browserTimezone,
    abbreviation: getTimezoneAbbreviation(browserTimezone, now),
    offset: now.getTimezoneOffset(),
    isDST,
    confidence: isValidTimezone(browserTimezone) ? 'high' : 'low',
    detectedAt: now.toISOString(),
    isValid: isValidTimezone(browserTimezone)
  };
}

/**
 * Check if date is during daylight saving time
 * @param {Date} date - Date to check
 * @returns {boolean} True if in DST
 */
export function isDaylightSavingTime(date: Date): boolean {
  try {
    const january = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    const july = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(january, july) !== date.getTimezoneOffset();
  } catch {
    return false;
  }
}

/**
 * Watch for timezone changes during session
 * Useful for detecting when users travel or change system timezone
 */
export function watchTimezoneChanges(onTimezoneChange?: (newTimezone: string) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }

  const initialTimezone = getUserTimezone();
  let currentTimezone = initialTimezone;

  const checkTimezone = () => {
    const detectedTimezone = getBrowserTimezone();

    if (detectedTimezone !== currentTimezone) {
      console.log('🌐 Timezone change detected:', {
        old: currentTimezone,
        new: detectedTimezone
      });

      currentTimezone = detectedTimezone;
      setUserTimezone(detectedTimezone);

      if (onTimezoneChange) {
        onTimezoneChange(detectedTimezone);
      }
    }
  };

  // Check every 30 seconds for timezone changes
  const interval = setInterval(checkTimezone, 30000);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Get business hours for a timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {Object} Business hours {start, end}
 */
export interface BusinessHours {
  start: number;
  end: number;
}

export function getBusinessHours(timezone?: string): BusinessHours {
  const tz = timezone || getUserTimezone();

  // Business hours defaults by region
  const businessHoursMap: Record<string, BusinessHours> = {
    // Americas (9 AM - 5 PM)
    'America/New_York': { start: 9, end: 17 },
    'America/Chicago': { start: 9, end: 17 },
    'America/Denver': { start: 9, end: 17 },
    'America/Los_Angeles': { start: 9, end: 17 },
    'America/Toronto': { start: 9, end: 17 },

    // Europe (9 AM - 5 PM)
    'Europe/London': { start: 9, end: 17 },
    'Europe/Paris': { start: 9, end: 17 },
    'Europe/Berlin': { start: 9, end: 17 },
    'Europe/Rome': { start: 9, end: 17 },
    'Europe/Madrid': { start: 9, end: 17 },

    // Asia (9 AM - 6 PM, longer hours)
    'Asia/Tokyo': { start: 9, end: 18 },
    'Asia/Shanghai': { start: 9, end: 18 },
    'Asia/Mumbai': { start: 10, end: 18 },
    'Asia/Dubai': { start: 9, end: 17 },
    'Asia/Singapore': { start: 9, end: 18 },

    // Oceania (9 AM - 5 PM)
    'Australia/Sydney': { start: 9, end: 17 },
    'Australia/Melbourne': { start: 9, end: 17 },
    'Pacific/Auckland': { start: 9, end: 17 },

    // Default fallback
    'default': { start: 9, end: 17 }
  };

  return businessHoursMap[tz] || businessHoursMap.default;
}

/**
 * Get timezone info for debugging
 * @returns {object} Timezone information
 */
export function getTimezoneInfo() {
  const timezone = getUserTimezone();
  const now = new Date();
  const detection = detectUserTimezone();

  return {
    timezone,
    browserTimezone: getBrowserTimezone(),
    abbreviation: getTimezoneAbbreviation(timezone, now),
    currentTime: formatDateInTimezone(now, 'yyyy-MM-dd HH:mm:ss zzz'),
    utcTime: now.toISOString(),
    timezoneOffset: now.getTimezoneOffset(),
    storedTimezone: typeof window !== 'undefined' ? localStorage.getItem('userTimezone') : null,
    businessHours: getBusinessHours(timezone),
    isDST: detection.isDST,
    isValid: isValidTimezone(timezone),
    detection
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