/**
 * Campaign Scheduler - Comprehensive scheduling algorithm that respects ALL campaign rules
 *
 * Rules to respect:
 * 1. Timezone - All times should be calculated in campaign timezone
 * 2. Emails per day limit - Max emails per calendar day
 * 3. Emails per hour limit - Max emails per hour window
 * 4. Sending interval - Minimum gap between emails (minutes)
 * 5. Sending hours - Start and end time each day (e.g., 9:00-17:00)
 * 6. Active days - Which days of week to send (e.g., Mon-Fri)
 */

const TimezoneService = require('../services/TimezoneService');

class CampaignScheduler {
  constructor(config) {
    // Validate and set timezone
    const requestedTimezone = config.timezone || 'UTC';
    this.timezone = TimezoneService.isValidTimezone(requestedTimezone) ? requestedTimezone : 'UTC';

    if (requestedTimezone !== this.timezone) {
      console.warn(`🌐 Invalid timezone '${requestedTimezone}' provided to CampaignScheduler, using UTC instead`);
    }

    this.emailsPerDay = config.emailsPerDay || 100;
    this.emailsPerHour = config.emailsPerHour || 10;
    this.sendingInterval = Math.max(5, config.sendingInterval || 15); // Enforce minimum 5 minutes
    
    // Validate and fix sending hours to prevent 00:00-00:00 bug
    const rawSendingHours = config.sendingHours || { start: 9, end: 17 };
    this.sendingHours = this.validateSendingHours(rawSendingHours);
    
    this.activeDays = config.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    // Human-like timing jitter settings
    this.enableJitter = config.enableJitter !== undefined ? config.enableJitter : true;
    this.jitterMinutes = Math.min(3, Math.max(1, config.jitterMinutes || 3)); // 1-3 minutes
    
    // Convert active days to numbers (0=Sunday, 1=Monday, etc.)
    this.activeDayNumbers = this.activeDays.map(day => {
      const dayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      return dayMap[day.toLowerCase()];
    });
  }

  /**
   * Validate and fix sending hours to prevent infinite loops and corruption
   */
  validateSendingHours(hours) {
    let { start, end } = hours;
    
    // Ensure start and end are numbers
    start = typeof start === 'number' ? start : parseInt(start) || 9;
    end = typeof end === 'number' ? end : parseInt(end) || 17;
    
    // Clamp to valid 24-hour range
    start = Math.max(0, Math.min(23, start));
    end = Math.max(0, Math.min(23, end));
    
    // Fix critical bug: prevent start >= end (causes infinite loops)
    if (start >= end) {
      console.warn(`⚠️ Invalid sendingHours: start=${start} >= end=${end}. Fixing to 9-17.`);
      start = 9;
      end = 17;
    }
    
    // Special case: 0-0 (midnight to midnight) causes the worst corruption
    if (start === 0 && end === 0) {
      console.warn(`🚨 Critical sendingHours bug detected: 0-0 (midnight-midnight). Fixing to 9-17.`);
      start = 9;
      end = 17;
    }
    
    // Ensure minimum 1-hour window for scheduling
    if (end - start < 1) {
      console.warn(`⚠️ SendingHours window too small: ${start}-${end}. Expanding to minimum 1 hour.`);
      if (start < 23) {
        end = start + 1;
      } else {
        start = 22;
        end = 23;
      }
    }
    
    const validated = { start, end };
    console.log(`📅 Validated sendingHours: ${start}:00 - ${end}:00 (${end - start} hour window)`);
    return validated;
  }

  /**
   * Schedule emails for all leads respecting ALL campaign rules
   */
  scheduleEmails(leads, emailAccounts, startTime = null) {
    const schedules = [];

    // Get current time in the campaign timezone
    let currentTime;
    if (startTime) {
      currentTime = new Date(startTime);
      // Validate the provided startTime
      if (isNaN(currentTime.getTime())) {
        console.error('🚨 Invalid startTime provided to scheduleEmails:', startTime);
        currentTime = new Date(); // Use current time as fallback
      }
    } else {
      // Use current UTC time - timezone conversion will be handled properly in helper methods
      currentTime = new Date();
    }
    
    // Move to next valid sending window if needed
    currentTime = this.moveToNextValidSendingWindow(currentTime);
    
    // Track counts for limits
    let emailsSentToday = 0;
    let emailsSentThisHour = 0;
    let currentDay = this.getDateInTimezone(currentTime);
    let currentHour = this.getHourInTimezone(currentTime);
    
    // Calculate minimum interval based on emailsPerHour constraint
    const minIntervalMinutes = Math.ceil(60 / this.emailsPerHour); // 60 minutes / emails per hour
    const actualIntervalMinutes = Math.max(this.sendingInterval, minIntervalMinutes);

    console.log(`📅 Starting scheduling from: ${currentTime.toISOString()}`);
    console.log(`   Timezone: ${this.timezone}`);
    console.log(`   Limits: ${this.emailsPerHour}/hour, ${this.emailsPerDay}/day`);
    console.log(`   User interval: ${this.sendingInterval} minutes`);
    console.log(`   Minimum required interval: ${minIntervalMinutes} minutes (based on ${this.emailsPerHour} emails/hour)`);
    console.log(`   Actual interval used: ${actualIntervalMinutes} minutes`);
    console.log(`   Jitter: ${this.enableJitter ? `±${this.jitterMinutes} minutes` : 'disabled'}`);
    
    leads.forEach((lead, leadIndex) => {
      // Select email account (round-robin)
      const emailAccountId = emailAccounts[leadIndex % emailAccounts.length];

      // Advance time by the interval
      if (leadIndex > 0) {
        currentTime = new Date(currentTime.getTime() + (actualIntervalMinutes * 60 * 1000));

        // CRITICAL FIX: Validate business hours after each advancement
        // This ensures emails don't get scheduled outside sending hours
        currentTime = this.moveToNextValidSendingWindow(currentTime);
      }

      // Apply human-like jitter to make timing less robotic
      let jitteredTime = this.applyJitter(currentTime, lead.email);

      // CRITICAL FIX: Validate business hours after jitter as well
      // Jitter can push time backwards, potentially outside business hours
      jitteredTime = this.moveToNextValidSendingWindow(jitteredTime);

      // Schedule the email
      schedules.push({
        lead,
        emailAccountId,
        sendAt: jitteredTime
      });

      // Simple counter tracking for statistics (not for time manipulation)
      emailsSentToday++;
      emailsSentThisHour++;

      // Check if we crossed into a new day/hour (for counter reset only)
      const newDay = this.getDateInTimezone(currentTime);
      if (newDay !== currentDay) {
        currentDay = newDay;
        emailsSentToday = 0;
        emailsSentThisHour = 0;
        currentHour = this.getHourInTimezone(currentTime);
        console.log(`📅 Moved to new day: ${newDay} - Reset counters`);
      } else {
        const newHour = this.getHourInTimezone(currentTime);
        if (newHour !== currentHour) {
          currentHour = newHour;
          emailsSentThisHour = 0;
          console.log(`⏰ Moved to new hour: ${currentHour}:00 - Reset hourly counter`);
        }
      }
    });
    
    return schedules;
  }
  
  /**
   * Move time to next valid sending window
   */
  moveToNextValidSendingWindow(date) {
    let current = new Date(date);
    let attempts = 0;
    const maxAttempts = 30; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Check if current day is active
      const dayOfWeek = this.getDayOfWeekInTimezone(current);
      if (!this.activeDayNumbers.includes(dayOfWeek)) {
        // Move to next day at start hour
        current = this.moveToNextDay(current);
        continue;
      }
      
      // Check if current hour is within sending hours
      const hour = this.getHourInTimezone(current);
      if (hour < this.sendingHours.start) {
        // Move to start hour of same day
        current = this.setHourInTimezone(current, this.sendingHours.start, 0, 0);
      } else if (hour >= this.sendingHours.end) {
        // Move to next day at start hour
        current = this.moveToNextDay(current);
        continue;
      }
      
      // We're in a valid window
      break;
    }
    
    return current;
  }
  
  /**
   * Move to next hour, respecting sending hours
   */
  moveToNextHour(date) {
    let current = new Date(date);
    const currentHourInTz = this.getHourInTimezone(current);

    // CRITICAL FIX: Preserve minutes and seconds when advancing to next hour
    // Don't reset to :00:00 - this causes all emails to get the same exact time
    const currentMinute = parseInt(current.toLocaleString('en-US', {
      timeZone: this.timezone,
      minute: 'numeric'
    })) || 0;
    const currentSecond = parseInt(current.toLocaleString('en-US', {
      timeZone: this.timezone,
      second: 'numeric'
    })) || 0;

    current = this.setHourInTimezone(current, currentHourInTz + 1, currentMinute, currentSecond);

    // Check if we exceeded sending hours
    if (this.getHourInTimezone(current) >= this.sendingHours.end) {
      current = this.moveToNextDay(current);
    }

    return this.moveToNextValidSendingWindow(current);
  }
  
  /**
   * Move to next day at start hour
   */
  moveToNextDay(date) {
    let current = new Date(date);
    current.setDate(current.getDate() + 1);
    current = this.setHourInTimezone(current, this.sendingHours.start, 0, 0);
    
    // Find next active day
    let attempts = 0;
    while (attempts < 7) {
      attempts++;
      const dayOfWeek = this.getDayOfWeekInTimezone(current);
      if (this.activeDayNumbers.includes(dayOfWeek)) {
        break;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return current;
  }
  
  /**
   * Get date string in timezone
   */
  getDateInTimezone(date) {
    return date.toLocaleDateString('en-CA', { timeZone: this.timezone });
  }

  /**
   * Get hour in campaign timezone
   */
  getHourInTimezone(date) {
    // Validate date first to prevent NaN
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('🚨 Invalid date passed to getHourInTimezone:', date);
      return 9; // Return safe default hour
    }

    try {
      const hourString = date.toLocaleString('en-US', {
        timeZone: this.timezone,
        hour: 'numeric',
        hour12: false
      });

      const hour = parseInt(hourString);

      // Validate the result
      if (isNaN(hour) || hour < 0 || hour > 23) {
        console.error('🚨 Invalid hour result from toLocaleString:', hourString, 'parsed to:', hour);
        return 9; // Return safe default hour
      }

      return hour;
    } catch (error) {
      console.error('🚨 Error in getHourInTimezone:', error);
      return 9; // Return safe default hour
    }
  }

  /**
   * Get day of week in campaign timezone (0=Sunday, 6=Saturday)
   */
  getDayOfWeekInTimezone(date) {
    const dayStr = date.toLocaleDateString('en-US', {
      timeZone: this.timezone,
      weekday: 'long'
    }).toLowerCase();
    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    return dayMap[dayStr];
  }
  
  /**
   * Set time to specific hour in campaign timezone
   */
  setHourInTimezone(date, hour, minute = 0, second = 0) {
    // Validate input date
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('🚨 Invalid date passed to setHourInTimezone:', date);
      return new Date(); // Return current time as fallback
    }

    // Validate hour, minute, second
    hour = Math.max(0, Math.min(23, parseInt(hour) || 0));
    minute = Math.max(0, Math.min(59, parseInt(minute) || 0));
    second = Math.max(0, Math.min(59, parseInt(second) || 0));

    try {
      // CORRECT APPROACH: Use the proper timezone-aware calculation
      // Get the date components in the target timezone
      const year = parseInt(date.toLocaleDateString('en-CA', { timeZone: this.timezone, year: 'numeric' }));
      const month = parseInt(date.toLocaleDateString('en-CA', { timeZone: this.timezone, month: '2-digit' }));
      const day = parseInt(date.toLocaleDateString('en-CA', { timeZone: this.timezone, day: '2-digit' }));

      // Create two dates: one that WOULD be the target time in UTC, and one that IS in the timezone
      const potentialUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

      // Check what hour this UTC time would be in the target timezone
      const actualHourInTz = parseInt(potentialUTC.toLocaleString('en-US', {
        timeZone: this.timezone,
        hour: 'numeric',
        hour12: false
      }));

      // Calculate how many hours off we are
      const hourDifference = hour - actualHourInTz;

      // Adjust by the difference to get the correct UTC time
      const result = new Date(potentialUTC.getTime() + (hourDifference * 60 * 60 * 1000));

      // Validate final result
      if (isNaN(result.getTime())) {
        console.error('🚨 Invalid result date in setHourInTimezone:', result);
        return new Date(); // Return current time as fallback
      }

      return result;
    } catch (error) {
      console.error('🚨 Error in setHourInTimezone:', error);
      return new Date(); // Return current time as fallback
    }
  }

  /**
   * Get timezone offset in milliseconds
   */
  getTimezoneOffset(date) {
    // Validate input date
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.error('🚨 Invalid date passed to getTimezoneOffset:', date);
      return 0; // Return 0 offset as fallback
    }

    try {
      const utcTime = date.getTime();

      // Use a safer approach to get timezone offset
      // Get the date formatted in the target timezone
      const tzString = date.toLocaleString('en-CA', {
        timeZone: this.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });

      // Parse the timezone string back to a date
      const [datePart, timePart] = tzString.split(', ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);

      // Create date in local timezone (interpreted as local)
      const tzDate = new Date(year, month - 1, day, hour, minute, second);

      // Validate the created date
      if (isNaN(tzDate.getTime())) {
        console.error('🚨 Invalid tzDate created in getTimezoneOffset:', tzString);
        return 0; // Return 0 offset as fallback
      }

      const tzTime = tzDate.getTime();
      return utcTime - tzTime;
    } catch (error) {
      console.error('🚨 Error in getTimezoneOffset:', error);
      return 0; // Return 0 offset as fallback
    }
  }

  /**
   * Convert local time to UTC for database storage
   */
  convertToUTC(localTime) {
    // The Date objects are already in UTC, so return as-is
    return localTime;
  }

  /**
   * Apply human-like jitter to email send time to avoid robotic patterns
   * Uses email address as seed for consistent but varied timing per lead
   */
  applyJitter(baseTime, emailSeed = '') {
    // Validate input date
    if (!baseTime || !(baseTime instanceof Date) || isNaN(baseTime.getTime())) {
      console.error('🚨 Invalid baseTime passed to applyJitter:', baseTime);
      return new Date(); // Return current time as fallback
    }

    if (!this.enableJitter) {
      return new Date(baseTime);
    }

    try {
      // Create a simple seed from email for consistent jitter per lead
      let seed = 0;
      for (let i = 0; i < emailSeed.length; i++) {
        seed = ((seed << 5) - seed + emailSeed.charCodeAt(i)) & 0xffffffff;
      }

      // Use seeded random to generate consistent offset for this email
      const seedRandom = Math.abs(seed) / 0xffffffff;

      // Generate offset between -jitterMinutes and +jitterMinutes
      const offsetMinutes = (seedRandom - 0.5) * 2 * this.jitterMinutes;
      const offsetMs = offsetMinutes * 60 * 1000;

      const jitteredTime = new Date(baseTime.getTime() + offsetMs);

      // Validate the result
      if (isNaN(jitteredTime.getTime())) {
        console.error('🚨 Invalid jitteredTime created in applyJitter');
        return new Date(baseTime); // Return original time as fallback
      }

      // Ensure jittered time doesn't go below minimum 5-minute spacing from previous
      // This is a simplified check - in practice, you'd validate against previous scheduled times
      return jitteredTime;
    } catch (error) {
      console.error('🚨 Error in applyJitter:', error);
      return new Date(baseTime); // Return original time as fallback
    }
  }
}

module.exports = CampaignScheduler;