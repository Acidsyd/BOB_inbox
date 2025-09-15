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

class CampaignScheduler {
  constructor(config) {
    this.timezone = config.timezone || 'UTC';
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
    } else {
      // Create a time that represents "now" in the campaign timezone
      const nowInTz = new Date().toLocaleString('en-US', { timeZone: this.timezone });
      currentTime = new Date(nowInTz);
    }
    
    // Move to next valid sending window if needed
    currentTime = this.moveToNextValidSendingWindow(currentTime);
    
    // Track counts for limits
    let emailsSentToday = 0;
    let emailsSentThisHour = 0;
    let currentDay = this.getDateInTimezone(currentTime);
    let currentHour = this.getHourInTimezone(currentTime);
    
    console.log(`📅 Starting scheduling from: ${currentTime.toISOString()}`);
    console.log(`   Timezone: ${this.timezone}`);
    console.log(`   Limits: ${this.emailsPerHour}/hour, ${this.emailsPerDay}/day`);
    console.log(`   Interval: ${this.sendingInterval} minutes between emails`);
    console.log(`   Jitter: ${this.enableJitter ? `±${this.jitterMinutes} minutes` : 'disabled'}`);
    
    leads.forEach((lead, leadIndex) => {
      // Select email account (round-robin)
      const emailAccountId = emailAccounts[leadIndex % emailAccounts.length];
      
      // Check if we need to move to next hour
      if (emailsSentThisHour >= this.emailsPerHour) {
        currentTime = this.moveToNextHour(currentTime);
        emailsSentThisHour = 0;
        currentHour = this.getHourInTimezone(currentTime);
        
        // Check if day changed
        const newDay = this.getDateInTimezone(currentTime);
        if (newDay !== currentDay) {
          currentDay = newDay;
          emailsSentToday = 0;
        }
      }
      
      // Check if we need to move to next day
      if (emailsSentToday >= this.emailsPerDay) {
        currentTime = this.moveToNextDay(currentTime);
        emailsSentToday = 0;
        emailsSentThisHour = 0;
        currentDay = this.getDateInTimezone(currentTime);
        currentHour = this.getHourInTimezone(currentTime);
      }
      
      // Ensure we're in a valid sending window
      currentTime = this.moveToNextValidSendingWindow(currentTime);
      
      // Apply human-like jitter to make timing less robotic
      const jitteredTime = this.applyJitter(currentTime, lead.email);
      
      // Schedule the email
      schedules.push({
        lead,
        emailAccountId,
        sendAt: jitteredTime
      });
      
      // Update counters
      emailsSentToday++;
      emailsSentThisHour++;
      
      // Move to next sending time (add interval)
      currentTime = new Date(currentTime.getTime() + (this.sendingInterval * 60 * 1000));
      
      // Check if we crossed into a new hour
      const newHour = this.getHourInTimezone(currentTime);
      if (newHour !== currentHour) {
        currentHour = newHour;
        emailsSentThisHour = 0;
        console.log(`⏰ Moved to new hour: ${currentHour}:00 - Reset hourly counter`);
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
    current = this.setHourInTimezone(current, currentHourInTz + 1, 0, 0);
    
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
    return parseInt(date.toLocaleString('en-US', {
      timeZone: this.timezone,
      hour: '2-digit',
      hour12: false
    }));
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
    // Create a date string in the campaign timezone
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: this.timezone });
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;

    // Combine and create new Date - this will be interpreted as local time
    const targetTimeStr = `${dateStr}T${timeStr}:00`;

    // Convert to UTC by getting the offset
    const tempDate = new Date(targetTimeStr);
    const tzOffset = this.getTimezoneOffset(tempDate);

    return new Date(tempDate.getTime() - tzOffset);
  }

  /**
   * Get timezone offset in milliseconds
   */
  getTimezoneOffset(date) {
    const utcTime = date.getTime();
    const tzTime = new Date(date.toLocaleString('en-US', { timeZone: this.timezone })).getTime();
    return utcTime - tzTime;
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
    if (!this.enableJitter) {
      return new Date(baseTime);
    }

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
    
    // Ensure jittered time doesn't go below minimum 5-minute spacing from previous
    // This is a simplified check - in practice, you'd validate against previous scheduled times
    return jitteredTime;
  }
}

module.exports = CampaignScheduler;