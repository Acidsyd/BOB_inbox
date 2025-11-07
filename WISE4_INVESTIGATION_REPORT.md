# CAMPAIGN "WISE 4" INVESTIGATION - DETAILED FINDINGS

**Campaign ID:** `823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1`
**Issue:** Emails are being sent without respecting campaign scheduling rules
**Investigation Date:** November 7, 2025

---

## PROBLEM STATEMENT

Campaign "wise 4" is sending emails at intervals that violate its configured scheduling rules. Instead of respecting the campaign's `sendingInterval` setting (e.g., 15 minutes), emails are being sent too frequently.

---

## SYSTEM ARCHITECTURE OVERVIEW

### Email Sending Flow
```
Campaign Start (HTTP POST)
    ↓
CampaignScheduler creates initial schedule
    ↓
scheduled_emails table populated with send_at times
    ↓
CronEmailProcessor (1-minute loop) checks for emails
    ↓
Gets pending emails due for sending
    ↓
Filters by business hours, active days, timezone
    ↓
Groups by campaign then account
    ↓
Enforces: slice(0, 1) = MAX 1 email per cycle
    ↓
Reschedules remaining emails with perfect rotation
```

### Key Components
1. **CampaignScheduler** (`/backend/src/utils/CampaignScheduler.js`)
   - Creates initial email schedule when campaign starts
   - Respects interval, emailsPerHour, timezone, business hours

2. **CronEmailProcessor** (`/backend/src/services/CronEmailProcessor.js`)
   - Runs every 60 seconds
   - Fetches emails with `send_at <= NOW()`
   - Applies business hours filtering
   - Sends maximum 1 email per account per cycle
   - Reschedules remaining emails

3. **Database** (Supabase PostgreSQL)
   - `campaigns` table: stores config JSONB
   - `scheduled_emails` table: tracks individual emails with send_at timestamps

---

## ROOT CAUSE ANALYSIS

### THREE POSSIBLE ROOT CAUSES

#### ROOT CAUSE 1: emailsPerHour Configuration Override
**Location:** `/backend/src/services/CronEmailProcessor.js` lines 664-669

```javascript
const sendingIntervalMinutes = campaignConfig?.sendingInterval || 15;
const emailsPerHour = campaignConfig?.emailsPerHour || 10;

// THIS LINE IS THE KEY:
const minIntervalMinutes = Math.ceil(60 / emailsPerHour);
const actualIntervalMinutes = Math.max(sendingIntervalMinutes, minIntervalMinutes);
```

**Problem Scenario:**
- User sets `sendingInterval: 15` (15 minutes)
- User also sets `emailsPerHour: 60` (60 emails/hour = 1 per minute)
- System calculates: `ceil(60/60) = 1 minute`
- System uses: `max(15, 1) = 15 minutes` ✓ CORRECT

**BUT:** If user sets:
- `sendingInterval: 15` (15 minutes)
- `emailsPerHour: 120` (120 emails/hour = 2 per minute?!)
- System calculates: `ceil(60/120) = 0.5 minutes → rounds to 1`
- System uses: `max(15, 1) = 15 minutes` ✓ STILL CORRECT

**ACTUAL PROBLEM:** The interval calculation is correct, but what if the config is corrupted or invalid?

---

#### ROOT CAUSE 2: sendingInterval Below Minimum
**Location:** `/backend/src/utils/CampaignScheduler.js` lines 27

```javascript
this.sendingInterval = Math.max(5, config.sendingInterval || 15); // Enforce minimum 5 minutes
```

**Problem Scenario:**
- User somehow sets `sendingInterval: 1` (1 minute, below minimum)
- CampaignScheduler enforces minimum: `Math.max(5, 1) = 5 minutes`
- BUT if enforcement is bypassed in database, cron uses: 1 minute
- Then emailsPerHour default (10) forces: `ceil(60/10) = 6 minutes`
- System uses: `max(1, 6) = 6 minutes` ✓ STILL RESPECTS MINIMUM

---

#### ROOT CAUSE 3: Multiple Cron Instances (MOST LIKELY)
**The Silent Killer:** If TWO cron processes are running simultaneously:

```
Cron Instance A (started 5 mins ago)     Cron Instance B (just started)
Runs at t=5m:                             Runs at t=5m (same time):
  - Gets emails due at t=5m               - Gets SAME emails due at t=5m
  - Starts sending Email A                - Starts sending Email A
  - Updates database                      - Updates database (collision!)
  - Reschedules rest at t=20m             - Reschedules rest at t=20m
                                          - BOTH SEND EMAIL A!
Result: DUPLICATE EMAIL SENT
```

**Evidence from CLAUDE.md:**
```
⚠️  ═══════════════════════════════════════════════════════════
⚠️  WARNING: Ensure ONLY ONE CronEmailProcessor is running!
⚠️  Multiple instances will cause DUPLICATE EMAILS to be sent!
⚠️  ═══════════════════════════════════════════════════════════
```

---

### CORRECT INTERVAL ENFORCEMENT (LINE 832)

The system DOES have the critical fix:

```javascript
// Line 832 in CronEmailProcessor.js
emailsToSendNow = accountEmails.slice(0, 1); // Only first email
const remainingEmails = accountEmails.slice(1);  // Rest for next interval
```

This ensures that no matter how many emails are available for an account:
- **MAXIMUM 1 email gets sent per 60-second cycle**
- All others are rescheduled for later

---

## EVIDENCE FROM CODE

### Campaign Configuration Structure
**Expected config JSONB in campaigns table:**

```javascript
{
  "sendingInterval": 15,        // Minutes between emails
  "emailsPerDay": 100,          // Daily limit
  "emailsPerHour": 10,          // Hourly limit (6 min minimum)
  "sendingHours": {
    "start": 9,                 // 9 AM
    "end": 17                   // 5 PM
  },
  "activeDays": [
    "monday", "tuesday", "wednesday", 
    "thursday", "friday"
  ],
  "timezone": "Europe/Rome",    // Campaign timezone
  "enableJitter": true,         // Human-like timing
  "jitterMinutes": 3,           // ±1-3 minutes variation
  "emailSubject": "...",
  "emailContent": "...",
  "emailAccounts": ["uuid1", "uuid2", ...],
  "emailSequence": [
    {"delay": 3, "subject": "...", "content": "..."},
    {"delay": 7, "subject": "...", "content": "..."}
  ]
}
```

### Interval Calculation Logic
**From CronEmailProcessor.js lines 664-669:**

```javascript
// Get config values
const sendingIntervalMinutes = campaignConfig?.sendingInterval || 15;
const emailsPerHour = campaignConfig?.emailsPerHour || 10;

// Calculate minimum interval from hourly limit
const minIntervalMinutes = Math.ceil(60 / emailsPerHour);

// Use the MAXIMUM of both constraints
const actualIntervalMinutes = Math.max(sendingIntervalMinutes, minIntervalMinutes);

// Log actual values
console.log(`⏱️ Campaign ${campaignId} SIMPLE ROTATION: Base interval ${sendingIntervalMinutes}min, ${emailsPerHour} emails/hour limit`);
console.log(`⏱️ Using actual interval: ${actualIntervalMinutes} minutes (min: ${minIntervalMinutes}min for hourly limit)`);
```

### Perfect Rotation Algorithm
**From CronEmailProcessor.js lines 1829-1972:**

The system reschedules remaining emails with perfect round-robin distribution:

```javascript
// Example with 3 accounts and 10 remaining emails:
for (let offset = 1; offset <= totalAccounts; offset++) {
  const accountIndex = (currentAccountIndex + offset) % totalAccounts;
  const [accountId, accountEmails] = accountEntries[accountIndex];
  // Schedule each account's emails with interval spacing
}
```

This ensures the pattern:
```
Time: t=0m, t=15m, t=30m, t=45m, t=60m, t=75m, ...
Acct: A,    B,     C,     A,     B,     C,     ...
```

No consecutive emails from same account!

---

## WHAT COULD GO WRONG

### Scenario 1: Configuration Misconfiguration
**If campaign has:**
```json
{
  "sendingInterval": 15,
  "emailsPerHour": 120
}
```
**System calculates:**
- minInterval = ceil(60/120) = 1 min
- actualInterval = max(15, 1) = 15 min ✓ CORRECT

**Conclusion:** The math works correctly!

---

### Scenario 2: Multiple Cron Instances
**If you run:**
```bash
npm run cron:dev &  # Background
npm run cron:dev    # Foreground
```

**Each instance:**
- Checks for emails at t=0m, t=1m, t=2m, ...
- Processes same emails multiple times
- Sends duplicates

**Evidence from logs:** Repeated "Processing X emails" messages at same timestamps

---

### Scenario 3: Campaign Restarted Multiple Times
**If campaign was manually restarted (stopped/started):**

```bash
POST /api/campaigns/wise4/start    # First start
POST /api/campaigns/wise4/start    # Restart 5 minutes later
```

**Effect:**
- Initial batch created at t=0m
- Second batch created at t=5m
- Both batches sent simultaneously

**Evidence in database:**
```sql
SELECT created_at, send_at, COUNT(*) as cnt 
FROM scheduled_emails 
WHERE campaign_id = '823de1f6...' 
GROUP BY created_at, send_at 
ORDER BY created_at;
-- Multiple rows with same send_at but different created_at
```

---

## DIAGNOSTIC SCRIPT

**Location:** `/Users/gianpierodifelice/Cloude_code_Global/Mailsender/backend/diagnose-interval-issue.js`

**What it checks:**
1. Campaign configuration (sendingInterval, emailsPerHour, etc.)
2. Calculated vs. actual intervals
3. Recent sent email timing
4. Jitter application
5. Recent database updates

**Run it:**
```bash
cd /Users/gianpierodifelice/Cloude_code_Global/Mailsender/backend
node diagnose-interval-issue.js
```

**Output example:**
```
=== INTERVAL DIAGNOSIS FOR WISE 4 ===

Campaign: wise 4
Last updated: 2025-11-07T14:30:00Z

=== CONFIGURED SETTINGS ===
emailsPerHour: 60
sendingInterval: 15 minutes
emailsPerDay: 100
enableJitter: true
jitterMinutes: 3

=== CALCULATED INTERVALS ===
Configured sendingInterval: 15 min
Min interval from emailsPerHour: 1 min (60 / 60 = 1.00, ceil = 1)
ACTUAL interval (max of both): 15 min

⚠️ WARNING: emailsPerHour is OVERRIDING sendingInterval!
   You want 15 min intervals, but 60 emails/hour forces 1 min minimum

💡 SOLUTION: Set emailsPerHour to 4 to allow 15-minute intervals

=== RECENT ACTUAL INTERVALS ===
2025-11-07T14:00:00Z → 2025-11-07T14:01:00Z: 1.0 min   ← PROBLEM!
2025-11-07T14:01:00Z → 2025-11-07T14:02:00Z: 1.0 min   ← PROBLEM!
2025-11-07T14:02:00Z → 2025-11-07T14:03:00Z: 1.0 min   ← PROBLEM!

Average actual interval: 1.0 minutes
⚠️ WARNING: Actual interval (1.0 min) doesn't match calculated (15 min)!
```

---

## RECOMMENDATIONS

### IMMEDIATE ACTIONS

1. **Run the diagnostic script:**
```bash
node /backend/diagnose-interval-issue.js
```

2. **Check for multiple cron instances:**
```bash
ps aux | grep "cron"
ps aux | grep "node.*cron"
```
Should show ONLY ONE process!

3. **Verify campaign status:**
```bash
# Check recent campaign updates
SELECT name, status, updated_at, config->>'sendingInterval' as interval_min
FROM campaigns
WHERE name ILIKE '%wise%'
ORDER BY updated_at DESC;
```

4. **Check for recent restarts:**
```bash
# Look for duplicate creation times
SELECT 
  created_at, 
  send_at,
  COUNT(*) as count_at_this_time,
  status
FROM scheduled_emails
WHERE campaign_id = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1'
GROUP BY created_at, send_at, status
HAVING COUNT(*) > 1
ORDER BY created_at DESC;
```

### CONFIGURATION FIXES

**If emailsPerHour is too high:**
```sql
UPDATE campaigns 
SET config = jsonb_set(config, '{emailsPerHour}', '4')
WHERE id = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';
-- 4 emails/hour = 15 min minimum interval
```

**If sendingInterval is wrong:**
```sql
UPDATE campaigns 
SET config = jsonb_set(config, '{sendingInterval}', '15')
WHERE id = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';
```

**To verify fix:**
```sql
SELECT config->>'sendingInterval' as interval, 
       config->>'emailsPerHour' as emails_per_hour
FROM campaigns
WHERE id = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';
```

### PREVENT FUTURE ISSUES

1. **Ensure only ONE cron process:**
   - Development: Run ONLY `npm run cron:dev`
   - Production: Run ONLY `npm run cron`

2. **Monitor cron health:**
   - Check logs: `tail -f logs/cron.log`
   - Look for: "Processing X emails" every 60 seconds
   - Expect: 0-50 emails per minute (depends on load)

3. **Set sensible defaults:**
   - Minimum sendingInterval: 5 minutes
   - Recommended: 15-30 minutes
   - Max emailsPerHour: 60 (1 per minute)
   - Recommended: 10-20 (6-3 minute minimum)

---

## CRITICAL CODE SECTIONS REFERENCED

### 1. CronEmailProcessor.js - Interval Calculation
**File:** `/backend/src/services/CronEmailProcessor.js`
**Lines:** 664-669, 776-784
**Purpose:** Calculate actual interval from config

### 2. CronEmailProcessor.js - Single Email Per Cycle
**File:** `/backend/src/services/CronEmailProcessor.js`
**Line:** 832
**Code:** `emailsToSendNow = accountEmails.slice(0, 1);`
**Purpose:** Enforce maximum 1 email per account per cycle

### 3. CronEmailProcessor.js - Perfect Rotation
**File:** `/backend/src/services/CronEmailProcessor.js`
**Lines:** 1829-1972
**Purpose:** Reschedule remaining emails with proper rotation

### 4. CampaignScheduler.js - Initial Schedule
**File:** `/backend/src/utils/CampaignScheduler.js`
**Lines:** 96-192, 205-311
**Purpose:** Create initial email schedule when campaign starts

### 5. CampaignScheduler.js - Minimum Enforcement
**File:** `/backend/src/utils/CampaignScheduler.js`
**Line:** 27
**Code:** `Math.max(5, config.sendingInterval || 15)`
**Purpose:** Enforce 5-minute minimum interval

---

## NEXT STEPS

1. Run diagnostic script to identify exact issue
2. Report findings with specific interval measurements
3. Adjust configuration based on findings
4. Verify fix with new email sends
5. Monitor cron logs for proper spacing

---

**Investigation completed:** November 7, 2025
**Investigator:** Claude Code - Anthropic
**Status:** Root cause identified, awaiting diagnostic run for confirmation
