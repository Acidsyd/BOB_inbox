/**
 * Universal Timezone Service
 * Handles timezone detection, validation, and conversion for worldwide users
 */

class TimezoneService {
  /**
   * List of common IANA timezone identifiers
   * Used for validation and fallback suggestions
   */
  static COMMON_TIMEZONES = [
    // Americas
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Argentina/Buenos_Aires',

    // Europe
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Stockholm',
    'Europe/Moscow',
    'Europe/Istanbul',

    // Asia
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Mumbai',
    'Asia/Dubai',
    'Asia/Tehran',
    'Asia/Seoul',
    'Asia/Bangkok',

    // Oceania
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',
    'Pacific/Auckland',
    'Pacific/Fiji',

    // Africa
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',

    // UTC
    'UTC'
  ];

  /**
   * Business hours defaults by region
   * Used for intelligent campaign scheduling
   */
  static BUSINESS_HOURS = {
    // Americas (9 AM - 5 PM)
    'America/New_York': { start: 9, end: 17 },
    'America/Chicago': { start: 9, end: 17 },
    'America/Denver': { start: 9, end: 17 },
    'America/Los_Angeles': { start: 9, end: 17 },

    // Europe (9 AM - 5 PM)
    'Europe/London': { start: 9, end: 17 },
    'Europe/Paris': { start: 9, end: 17 },
    'Europe/Berlin': { start: 9, end: 17 },
    'Europe/Rome': { start: 9, end: 17 },

    // Asia (9 AM - 6 PM, longer hours)
    'Asia/Tokyo': { start: 9, end: 18 },
    'Asia/Shanghai': { start: 9, end: 18 },
    'Asia/Mumbai': { start: 10, end: 18 },
    'Asia/Dubai': { start: 9, end: 17 },

    // Oceania (9 AM - 5 PM)
    'Australia/Sydney': { start: 9, end: 17 },
    'Australia/Melbourne': { start: 9, end: 17 },
    'Pacific/Auckland': { start: 9, end: 17 },

    // Default fallback
    'default': { start: 9, end: 17 }
  };

  /**
   * Validates if a timezone string is a valid IANA timezone identifier
   * @param {string} timezone - IANA timezone identifier (e.g., 'America/New_York')
   * @returns {boolean} - True if valid timezone
   */
  static isValidTimezone(timezone) {
    if (!timezone || typeof timezone !== 'string') {
      return false;
    }

    try {
      // Test if timezone works with Intl.DateTimeFormat
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      console.warn(`Invalid timezone detected: ${timezone}`, error);
      return false;
    }
  }

  /**
   * Converts UTC date to user timezone with safe formatting
   * @param {Date|string} utcDate - UTC date to convert
   * @param {string} userTimezone - User's IANA timezone
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted date string in user timezone
   */
  static convertToUserTimezone(utcDate, userTimezone, options = {}) {
    // Validate inputs
    if (!utcDate) {
      console.warn('No date provided to convertToUserTimezone');
      return 'Invalid date';
    }

    // Convert string dates to Date objects with proper UTC handling
    let dateObj;
    if (utcDate instanceof Date) {
      dateObj = utcDate;
    } else {
      const dateStr = utcDate.toString();
      // If timestamp lacks timezone info and matches ISO format, treat as UTC
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(dateStr)) {
        // Add 'Z' to treat as UTC since database times should be UTC
        dateObj = new Date(dateStr + 'Z');
      } else {
        dateObj = new Date(utcDate);
      }
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided:', utcDate);
      return 'Invalid date';
    }

    // Validate timezone, fallback to UTC
    const timezone = this.isValidTimezone(userTimezone) ? userTimezone : 'UTC';

    // Default formatting options
    const formatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric', // Safe: avoids "24" hour issue
      minute: '2-digit',
      hour12: true,
      ...options
    };

    try {
      return dateObj.toLocaleString('en-US', formatOptions);
    } catch (error) {
      console.error('Error converting timezone:', error, { utcDate, userTimezone });
      return dateObj.toISOString(); // Fallback to ISO string
    }
  }

  /**
   * Gets timezone offset in minutes from UTC
   * @param {string} timezone - IANA timezone identifier
   * @param {Date} date - Date to calculate offset for (defaults to now)
   * @returns {number} - Offset in minutes (negative for behind UTC, positive for ahead)
   */
  static getTimezoneOffset(timezone, date = new Date()) {
    if (!this.isValidTimezone(timezone)) {
      return 0; // UTC offset
    }

    try {
      // Get UTC time in milliseconds
      const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);

      // Get local time in target timezone
      const targetTime = new Date(utcTime + (this.getOffsetInMs(timezone, date)));

      // Calculate offset in minutes
      return (targetTime.getTime() - utcTime) / (1000 * 60);
    } catch (error) {
      console.error('Error calculating timezone offset:', error);
      return 0;
    }
  }

  /**
   * Helper to get timezone offset in milliseconds
   * @private
   */
  static getOffsetInMs(timezone, date) {
    try {
      const utcDate = new Date(date.toLocaleString('en-CA', {timeZone: 'UTC'}));
      const tzDate = new Date(date.toLocaleString('en-CA', {timeZone: timezone}));
      return tzDate.getTime() - utcDate.getTime();
    } catch {
      return 0;
    }
  }

  /**
   * Checks if current time is within business hours for timezone
   * @param {string} timezone - User's IANA timezone
   * @param {Date} date - Date to check (defaults to now)
   * @returns {boolean} - True if within business hours
   */
  static isWithinBusinessHours(timezone, date = new Date()) {
    const businessHours = this.BUSINESS_HOURS[timezone] || this.BUSINESS_HOURS.default;

    try {
      const hour = parseInt(date.toLocaleString('en-US', {
        timeZone: this.isValidTimezone(timezone) ? timezone : 'UTC',
        hour: 'numeric',
        hour12: false
      }));

      return hour >= businessHours.start && hour <= businessHours.end;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return true; // Default to allowing if check fails
    }
  }

  /**
   * Gets business hours for a timezone
   * @param {string} timezone - IANA timezone identifier
   * @returns {Object} - Business hours {start, end}
   */
  static getBusinessHours(timezone) {
    return this.BUSINESS_HOURS[timezone] || this.BUSINESS_HOURS.default;
  }

  /**
   * Suggests common timezone based on partial match
   * @param {string} partialTimezone - Partial timezone string
   * @returns {string[]} - Array of suggested timezones
   */
  static suggestTimezones(partialTimezone) {
    if (!partialTimezone) return this.COMMON_TIMEZONES.slice(0, 10);

    const searchTerm = partialTimezone.toLowerCase();
    return this.COMMON_TIMEZONES
      .filter(tz => tz.toLowerCase().includes(searchTerm))
      .slice(0, 10);
  }

  /**
   * Gets timezone abbreviation (e.g., EST, PST, CEST)
   * @param {string} timezone - IANA timezone identifier
   * @param {Date} date - Date for abbreviation (handles DST)
   * @returns {string} - Timezone abbreviation
   */
  static getTimezoneAbbreviation(timezone, date = new Date()) {
    if (!this.isValidTimezone(timezone)) {
      return 'UTC';
    }

    try {
      return date.toLocaleDateString('en', {
        timeZone: timezone,
        timeZoneName: 'short'
      }).split(', ')[1] || 'UTC';
    } catch (error) {
      console.error('Error getting timezone abbreviation:', error);
      return 'UTC';
    }
  }

  /**
   * Formats date for conversation lists (relative time)
   * @param {Date|string} date - Date to format
   * @param {string} timezone - User timezone
   * @returns {string} - Formatted relative date
   */
  static formatConversationDate(date, timezone) {
    if (!date) return '';

    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const validTimezone = this.isValidTimezone(timezone) ? timezone : 'UTC';

    try {
      // Today: show time only
      const todayStr = this.formatDateOnly(now, validTimezone);
      const dateStr = this.formatDateOnly(dateObj, validTimezone);

      if (dateStr === todayStr) {
        return dateObj.toLocaleString('en-US', {
          timeZone: validTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      // Yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = this.formatDateOnly(yesterday, validTimezone);
      if (dateStr === yesterdayStr) {
        return 'Yesterday';
      }

      // This year: show month and day
      const currentYear = now.getFullYear();
      const dateYear = dateObj.getFullYear();
      if (dateYear === currentYear) {
        return dateObj.toLocaleString('en-US', {
          timeZone: validTimezone,
          month: 'short',
          day: 'numeric'
        });
      }

      // Different year: show full date
      return dateObj.toLocaleString('en-US', {
        timeZone: validTimezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting conversation date:', error);
      return 'Invalid date';
    }
  }

  /**
   * Helper to format date only (YYYY-MM-DD) in timezone
   * @private
   */
  static formatDateOnly(date, timezone) {
    try {
      return date.toLocaleDateString('en-CA', { timeZone: timezone });
    } catch {
      return date.toLocaleDateString('en-CA');
    }
  }

  /**
   * Gets comprehensive timezone information
   * @param {string} timezone - IANA timezone identifier
   * @param {Date} date - Date for calculations
   * @returns {Object} - Complete timezone info
   */
  static getTimezoneInfo(timezone, date = new Date()) {
    if (!this.isValidTimezone(timezone)) {
      timezone = 'UTC';
    }

    return {
      timezone,
      abbreviation: this.getTimezoneAbbreviation(timezone, date),
      offset: this.getTimezoneOffset(timezone, date),
      businessHours: this.getBusinessHours(timezone),
      isWithinBusinessHours: this.isWithinBusinessHours(timezone, date),
      currentTime: this.convertToUserTimezone(date, timezone),
      isValid: this.isValidTimezone(timezone)
    };
  }
}

module.exports = TimezoneService;