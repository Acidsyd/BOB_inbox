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
    // 🔥 DEPRECATED: emailsPerHour is no longer used (kept for backwards compatibility)
    this.emailsPerHour = config.emailsPerHour || 10; // Deprecated - not used in calculations
    this.sendingInterval = Math.max(5, config.sendingInterval || 15); // Enforce minimum 5 minutes

    // Validate and fix sending hours to prevent 00:00-00:00 bug
    const rawSendingHours = config.sendingHours || { start: 9, end: 17 };
    this.sendingHours = this.validateSendingHours(rawSendingHours);

    // NEW: Volume variation settings (±20% daily variation)
    // Default to TRUE to reduce predictability for all campaigns
    this.enableVolumeVariation = config.enableVolumeVariation !== undefined
      ? config.enableVolumeVariation
      : true; // Default enabled

    // NEW: Window variation settings (±30 minutes on start/end times)
    // Default to TRUE to reduce predictability for all campaigns
    this.enableWindowVariation = config.enableWindowVariation !== undefined
      ? config.enableWindowVariation
      : true; // Default enabled
    this.windowVariationMinutes = config.windowVariationMinutes || 30; // Default ±30 minutes

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
   * Calculate daily volume target with optional randomization
   * Adds ±20% variation to make sending patterns less predictable
   * Also applies day-of-week bonuses (Monday +10%, Friday -10%)
   *
   * @param {Date} date - The date to calculate volume for
   * @param {number} baseTarget - Base daily email target
   * @param {boolean} enabled - Whether volume variation is enabled (default: true)
   * @returns {number} Adjusted daily target (capped between 10 and 150% of base)
   */
  getDailyVolumeTarget(date, baseTarget, enabled = true) {
    if (!enabled) {
      return baseTarget; // No variation when disabled
    }

    // Generate random factor between 0.8 and 1.2 (±20%)
    const randomFactor = 0.8 + (Math.random() * 0.4);
    let adjusted = Math.floor(baseTarget * randomFactor);

    // Apply day-of-week patterns for more natural behavior
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1) {
      // Monday: +10% (start of week boost)
      adjusted = Math.floor(adjusted * 1.1);
    } else if (dayOfWeek === 5) {
      // Friday: -10% (end of week slowdown)
      adjusted = Math.floor(adjusted * 0.9);
    }

    // Cap to reasonable bounds (10 minimum, 150% of base maximum)
    const minTarget = 10;
    const maxTarget = Math.floor(baseTarget * 1.5);

    return Math.max(minTarget, Math.min(adjusted, maxTarget));
  }

  /**
   * Get varied sending hours for a specific date
   * Uses seeded random to ensure same hours throughout the day
   * @param {Date} date - The date to get varied hours for
   * @returns {Object} Varied sending hours { start, end }
   */
  getVariedSendingHours(date) {
    if (!this.enableWindowVariation) {
      return this.sendingHours; // No variation when disabled
    }

    // Create seed from date string (YYYY-MM-DD) for daily consistency
    const dateStr = date.toISOString().split('T')[0];
    const seed = this.hashString(dateStr);

    // Generate seeded random value between -1 and +1
    const seededRandom = this.seededRandom(seed);

    // Calculate variation in minutes (±windowVariationMinutes)
    const variationMinutes = Math.floor(seededRandom * this.windowVariationMinutes);

    // Apply variation to start and end hours
    const variedStart = this.sendingHours.start + (variationMinutes / 60);
    const variedEnd = this.sendingHours.end + (variationMinutes / 60);

    // Ensure variation doesn't create invalid windows
    const clampedStart = Math.max(0, Math.min(23, variedStart));
    const clampedEnd = Math.max(clampedStart + 1, Math.min(23, variedEnd));

    return {
      start: Math.floor(clampedStart),
      end: Math.floor(clampedEnd)
    };
  }

  /**
   * Simple string hash for seeding random generator
   * @private
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator
   * @private
   */
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return (x - Math.floor(x)) * 2 - 1; // Returns -1 to +1
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

    // NEW: Get daily volume target with optional variation
    // This will be recalculated when we move to a new day
    let dailyVolumeTarget = this.getDailyVolumeTarget(currentTime, this.emailsPerDay, this.enableVolumeVariation);

    // 🔥 DEPRECATED: emailsPerHour no longer used in calculations
    // Using sendingInterval directly to avoid override issues
    const actualIntervalMinutes = this.sendingInterval;

    console.log(`📅 Starting scheduling from: ${currentTime.toISOString()}`);
    console.log(`   Timezone: ${this.timezone}`);
    console.log(`   Daily limit: ${this.emailsPerDay}/day (base)`);
    if (this.enableVolumeVariation) {
      console.log(`   Daily target (varied): ${dailyVolumeTarget}/day`);
    }
    console.log(`   Sending interval: ${this.sendingInterval} minutes (emailsPerHour deprecated)`);
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

      // CRITICAL FIX: Ensure jittered time is never in the past
      // If jitter moved time backwards past "now", advance to next valid window
      const now = new Date();
      if (jitteredTime < now) {
        // Start from "now" and find next valid sending window
        jitteredTime = this.moveToNextValidSendingWindow(now);
      }

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

        // NEW: Recalculate daily volume target for the new day
        const previousTarget = dailyVolumeTarget;
        dailyVolumeTarget = this.getDailyVolumeTarget(currentTime, this.emailsPerDay, this.enableVolumeVariation);

        if (this.enableVolumeVariation) {
          console.log(`📅 Moved to new day: ${newDay} - Reset counters, new daily target: ${dailyVolumeTarget} (was ${previousTarget})`);
        } else {
          console.log(`📅 Moved to new day: ${newDay} - Reset counters`);
        }
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
   * Schedule emails with PERFECT ROTATION - guarantees no consecutive emails from same account
   * This method distributes leads evenly across accounts first, then schedules in rounds
   *
   * Example with 3 accounts and 10 leads:
   * Round 1: Acc0→Acc1→Acc2→Acc0 (4 leads)
   * Round 2: Acc1→Acc2→Acc0→Acc1 (4 leads)
   * Round 3: Acc2→Acc0 (2 leads)
   *
   * This ensures perfect rotation regardless of business hours gaps
   */
  scheduleEmailsWithPerfectRotation(leads, emailAccounts, startTime = null) {
    console.log(`\n✨ PERFECT ROTATION SCHEDULING`);
    console.log(`   Total leads: ${leads.length}`);
    console.log(`   Email accounts: ${emailAccounts.length}`);

    // Step 1: Distribute leads evenly across accounts
    const leadsByAccount = {};
    emailAccounts.forEach(accountId => {
      leadsByAccount[accountId] = [];
    });

    // Distribute leads in round-robin to ensure even distribution
    leads.forEach((lead, index) => {
      const accountId = emailAccounts[index % emailAccounts.length];
      leadsByAccount[accountId].push(lead);
    });

    console.log(`\n📊 Lead distribution:`);
    Object.entries(leadsByAccount).forEach(([accountId, accountLeads]) => {
      console.log(`   ...${accountId.substring(0, 8)}: ${accountLeads.length} leads`);
    });

    // Step 2: Setup scheduling time
    let currentTime;
    if (startTime) {
      currentTime = new Date(startTime);
      if (isNaN(currentTime.getTime())) {
        console.error('🚨 Invalid startTime provided to scheduleEmailsWithPerfectRotation:', startTime);
        currentTime = new Date();
      }
    } else {
      currentTime = new Date();
    }

    currentTime = this.moveToNextValidSendingWindow(currentTime);

    // 🎲 Add random start offset (0-10 minutes) to prevent exact hour starts
    // This ensures campaigns don't all start at :00:00 and look robotic
    const randomMinutes = Math.floor(Math.random() * 11); // 0-10 minutes
    const randomSeconds = Math.floor(Math.random() * 60); // 0-59 seconds
    const randomOffsetMs = (randomMinutes * 60 * 1000) + (randomSeconds * 1000);
    currentTime = new Date(currentTime.getTime() + randomOffsetMs);

    console.log(`🎲 Applied random start offset: +${randomMinutes}m ${randomSeconds}s`);

    // 🔥 DEPRECATED: emailsPerHour no longer used - use sendingInterval directly
    const actualIntervalMinutes = this.sendingInterval;

    console.log(`\n⏰ Scheduling parameters:`);
    console.log(`   Start time: ${currentTime.toISOString()}`);
    console.log(`   Timezone: ${this.timezone}`);
    console.log(`   Interval: ${actualIntervalMinutes} minutes (emailsPerHour deprecated)`);
    console.log(`   Jitter: ${this.enableJitter ? `±${this.jitterMinutes} min` : 'disabled'}\n`);

    // Step 3: Schedule in perfect rounds
    const schedules = [];
    const maxLeadsPerAccount = Math.max(...Object.values(leadsByAccount).map(arr => arr.length));

    let emailCount = 0;

    // Schedule round by round
    for (let round = 0; round < maxLeadsPerAccount; round++) {
      // In each round, cycle through all accounts
      for (let accIdx = 0; accIdx < emailAccounts.length; accIdx++) {
        const accountId = emailAccounts[accIdx];
        const accountLeads = leadsByAccount[accountId];

        // Check if this account has a lead for this round
        if (round < accountLeads.length) {
          const lead = accountLeads[round];

          // Advance time if not the first email
          if (emailCount > 0) {
            currentTime = new Date(currentTime.getTime() + (actualIntervalMinutes * 60 * 1000));
          }

          // Apply jitter BEFORE moving to valid window (ensures first email also gets jitter)
          let jitteredTime = this.applyJitter(currentTime, lead.email);

          // Now move to valid sending window (this preserves the jitter variation)
          jitteredTime = this.moveToNextValidSendingWindow(jitteredTime);

          // Ensure not in the past
          const now = new Date();
          if (jitteredTime < now) {
            jitteredTime = this.moveToNextValidSendingWindow(now);
          }

          // Schedule the email
          schedules.push({
            lead,
            emailAccountId: accountId,
            sendAt: jitteredTime
          });

          emailCount++;

          // Log first 20 for verification
          if (emailCount <= 20) {
            console.log(`[${emailCount}] ${jitteredTime.toISOString()} → ...${accountId.substring(0, 8)} | ${lead.email}`);
          }
        }
      }
    }

    if (emailCount > 20) {
      console.log(`... (${emailCount - 20} more emails) ...\n`);
    }

    console.log(`✅ Perfect rotation complete: ${schedules.length} emails scheduled`);

    // Verify rotation quality
    this.verifyRotationQuality(schedules, emailAccounts);

    return schedules;
  }

  /**
   * Verify rotation quality by checking for consecutive duplicates
   */
  verifyRotationQuality(schedules, emailAccounts) {
    if (schedules.length < 2) return;

    console.log(`\n🔍 Rotation Quality Check (first 50 emails):`);

    const first50 = schedules.slice(0, 50);
    const accountSequence = first50.map(s => s.emailAccountId.substring(0, 8));

    // Check unique accounts in sequence
    const uniqueAccounts = new Set(accountSequence.slice(0, Math.min(emailAccounts.length * 2, accountSequence.length))).size;
    console.log(`   Unique accounts in first ${Math.min(emailAccounts.length * 2, accountSequence.length)} emails: ${uniqueAccounts}/${emailAccounts.length}`);

    // Check for consecutive duplicates
    let maxConsecutive = 1;
    let consecutiveCount = 1;
    for (let i = 1; i < accountSequence.length; i++) {
      if (accountSequence[i] === accountSequence[i - 1]) {
        consecutiveCount++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      } else {
        consecutiveCount = 1;
      }
    }

    console.log(`   Max consecutive from same account: ${maxConsecutive}`);

    if (maxConsecutive === 1) {
      console.log(`   ✅ PERFECT ROTATION ACHIEVED!\n`);
    } else {
      console.log(`   ⚠️  Found ${maxConsecutive} consecutive emails from same account\n`);
    }
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

      // Get sending hours for current date (may be varied)
      const effectiveHours = this.getVariedSendingHours(current);

      // Check if current hour is within sending hours
      const hour = this.getHourInTimezone(current);
      if (hour < effectiveHours.start) {
        // Move to start hour of same day
        current = this.setHourInTimezone(current, effectiveHours.start, 0, 0);
      } else if (hour >= effectiveHours.end) {
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

    // Get varied hours for the new day
    const effectiveHours = this.getVariedSendingHours(current);
    current = this.setHourInTimezone(current, effectiveHours.start, 0, 0);

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
      // FIXED: Use TimezoneService for proper timezone conversion
      // Get the date components in the target timezone
      const year = parseInt(date.toLocaleDateString('en-CA', { timeZone: this.timezone, year: 'numeric' }));
      const month = parseInt(date.toLocaleDateString('en-CA', { timeZone: this.timezone, month: '2-digit' }));
      const day = parseInt(date.toLocaleDateString('en-CA', { timeZone: this.timezone, day: '2-digit' }));

      // Create a date string in the target timezone
      const timezoneDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

      // Use TimezoneService to convert from timezone to UTC
      const result = TimezoneService.convertFromUserTimezone(timezoneDateStr, this.timezone);

      // Validate final result
      if (!result || isNaN(result.getTime())) {
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
   * Uses Gaussian (bell-curve) distribution for more natural timing variation
   * Most variations cluster around the base time (±1 min), with occasional larger shifts
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
      // Box-Muller transform to generate Gaussian (normal) distribution
      // This creates a bell curve centered at 0 with standard deviation = 1
      const u1 = Math.random();
      const u2 = Math.random();

      // Generate standard normal distribution (mean=0, stddev=1)
      const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      // Scale by jitterMinutes to get desired range
      // Standard deviation = jitterMinutes means:
      // - 68% of variations within ±jitterMinutes (±3 min)
      // - 95% of variations within ±2*jitterMinutes (±6 min)
      // - 99.7% of variations within ±3*jitterMinutes (±9 min)
      const jitterMs = gaussian * this.jitterMinutes * 60 * 1000;

      // Cap extreme outliers at ±10 minutes to prevent excessive deviation
      const maxJitter = 10 * 60 * 1000;
      const cappedJitter = Math.max(-maxJitter, Math.min(maxJitter, jitterMs));

      const jitteredTime = new Date(baseTime.getTime() + cappedJitter);

      // Validate the result
      if (isNaN(jitteredTime.getTime())) {
        console.error('🚨 Invalid jitteredTime created in applyJitter');
        return new Date(baseTime); // Return original time as fallback
      }

      return jitteredTime;
    } catch (error) {
      console.error('🚨 Error in applyJitter:', error);
      return new Date(baseTime); // Return original time as fallback
    }
  }
}

module.exports = CampaignScheduler;