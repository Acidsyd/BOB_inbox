# Timestamp Architecture Documentation

## Overview
This document outlines the timestamp handling architecture in the Mailsender application, including timezone conversion, database storage, and display formatting.

## Core Principles

### 1. Database Storage (UTC Only)
- **All timestamps in the database MUST be stored in UTC format**
- **Format**: ISO 8601 with 'Z' indicator: `"2025-09-18T05:00:00.000Z"`
- **Method**: Always use `.toISOString()` for database storage
- **Never use**: `toLocalTimestamp()` for database storage

### 2. Timezone Conversion for Display
- **Server-side conversion**: Use `TimezoneService.convertToUserTimezone()`
- **Campaign timezone**: Retrieved from `campaign.config.timezone`
- **Default fallback**: 'UTC' if no timezone specified
- **Format**: Human-readable format for frontend display

### 3. User Timezone Handling
- **Source of truth**: Campaign configuration (`campaign.config.timezone`)
- **Validation**: Use `TimezoneService.isValidTimezone()` before conversion
- **IANA format**: Use standard timezone identifiers (e.g., 'Europe/Rome', 'America/New_York')

## Architecture Components

### TimezoneService (`src/services/TimezoneService.js`)
**Primary timezone conversion service with comprehensive features:**

```javascript
// Core conversion method
TimezoneService.convertToUserTimezone(utcDate, userTimezone, options)

// Validation
TimezoneService.isValidTimezone(timezone)

// Business hours checking
TimezoneService.isWithinBusinessHours(timezone, date)

// Conversation date formatting
TimezoneService.formatConversationDate(date, timezone)
```

**Key Features:**
- ✅ Clean timestamp handling (deprecated Z suffix logic removed)
- ✅ Automatic fallback to UTC for invalid timezones
- ✅ Business hours calculation per timezone
- ✅ Relative date formatting for conversations
- ✅ Comprehensive timezone info retrieval

### DateUtils (`src/utils/dateUtils.cjs`)
**Local timestamp utilities (DEPRECATED for database storage):**

```javascript
// ❌ DEPRECATED for database storage - use .toISOString() instead
toLocalTimestamp(date)

// ✅ OK for display formatting
formatDisplayTime(timestampStr, options)
parseTimestamp(timestampStr)
```

**Important Notes:**
- `toLocalTimestamp()` should NOT be used for database storage
- Use only for local time formatting when explicitly needed
- Always prefer TimezoneService for timezone conversions

### Frontend Timezone Components

#### TimezoneContext (`frontend/contexts/TimezoneContext.tsx`)
**React context for consistent timezone handling across frontend:**

```typescript
// Core timezone context functions
const { formatDateInTimezone, getUserTimezone } = useTimezone()

// Usage in components
formatDateInTimezone(timestamp, 'MMM d, yyyy h:mm a')
```

#### Timezone Library (`frontend/lib/timezone.ts`)
**Client-side timezone utilities with browser detection:**

```typescript
// Browser timezone detection
getUserTimezone()           // Gets user's detected timezone
formatDateInTimezone()      // Frontend timezone formatting
formatConversationDate()    // Relative date formatting
```

**Key Features:**
- ✅ Automatic browser timezone detection
- ✅ localStorage timezone persistence
- ✅ Clean timestamp handling (no deprecated Z suffix logic)
- ✅ Consistent formatting across all frontend components
- ✅ Relative date formatting for conversation lists

## Database Schema

### Scheduled Emails Table
```sql
scheduled_emails (
  id UUID PRIMARY KEY,
  campaign_id UUID,
  send_at TIMESTAMP WITH TIME ZONE,  -- ALWAYS UTC
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

### Campaign Configuration
```javascript
campaign.config = {
  timezone: 'Europe/Rome',           // IANA timezone identifier
  sendingHours: { start: 9, end: 17 }, // Local campaign timezone
  activeDays: ['monday', 'tuesday', ...]
}
```

## Critical Fixes Applied (September 2025)

### Issue #0: Deprecated Z Suffix Logic Cleanup (September 2025)
**Problem**: Legacy "Z" suffix logic was causing double timezone conversion across the application

**Files Cleaned**:
1. **Frontend** (`lib/timezone.ts:120`) - Removed regex pattern adding 'Z' to timestamps
2. **Backend** (`services/TimezoneService.js:136`) - Removed deprecated Z suffix logic
3. **Backend** (`routes/inbox.js:596`) - Fixed timestamp creation to use `toISOString()`

**Root Cause**:
- Legacy logic was designed to handle timestamps without timezone info
- Backend now properly converts UTC → user timezone when serving data
- Frontend was applying additional conversion, causing double conversion

**Solution**:
```javascript
// REMOVED from all files:
if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(dateStr)) {
  dateObj = new Date(dateStr + 'Z');  // This caused double conversion
}

// REPLACED with clean approach:
dateObj = new Date(utcDate);  // Direct creation, backend handles conversion
```

**Result**:
- ✅ Eliminated root cause of double timezone conversion
- ✅ Clean timestamp handling throughout application
- ✅ Proper separation: backend converts, frontend formats

### Issue #1: Timezone Display Bug (Backend)
**Problem**: Scheduled emails showed incorrect times (7:00 AM instead of 9:00 AM for Rome timezone)

**Root Cause**:
- `toLocalTimestamp()` was storing local Rome time (`2025-09-18T07:00:00`) without timezone indicator
- TimezoneService treated these as UTC, causing incorrect display

**Solution Applied**:

1. **Fixed Database Storage** (`CronEmailProcessor.js`):
```javascript
// BEFORE (incorrect):
send_at: toLocalTimestamp(newSendTime)  // Stored: "2025-09-18T07:00:00"

// AFTER (correct):
send_at: newSendTime.toISOString()      // Stores: "2025-09-18T05:00:00.000Z"
```

2. **Cleaned Up Legacy Logic** (`TimezoneService.js`):
```javascript
// REMOVED deprecated Z suffix logic - backend now handles timezone conversion properly
// Frontend displays backend-converted timestamps directly without additional conversion
```

**Result**:
- ✅ 5:00 UTC now correctly displays as 9:00 AM Rome time
- ✅ Deprecated Z suffix logic removed from all components
- ✅ Clean timestamp handling without double conversion
- ✅ Future timestamps stored in proper UTC format

### Issue #2: Scheduled Activity Timezone Display (September 2025)
**Problem**: Scheduled emails displayed wrong timestamps in frontend UI (showing 7:00 AM instead of 9:00 AM for Europe/Rome timezone)

**Root Cause**:
- JavaScript Date constructor was misinterpreting UTC timestamps without 'Z' suffix as local time
- Backend sent timestamps like `"2025-09-22T07:00:00"` which were treated as local time instead of UTC
- For Europe/Rome (CEST = UTC+2): UTC 7:00 AM should display as 9:00 AM but showed as 7:00 AM

**Technical Details**:
```javascript
// The issue:
new Date("2025-09-22T07:00:00")     // Interpreted as local time
new Date("2025-09-22T07:00:00Z")    // Correctly interpreted as UTC
```

**Solution Applied**:

1. **Frontend Timezone Fix** (`frontend/lib/timezone.ts:117-124`):
```typescript
// Detect UTC timestamps without Z and append it
if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/) && !dateStr.endsWith('Z')) {
  dateObj = new Date(dateStr + 'Z');  // Force UTC interpretation
} else {
  dateObj = new Date(dateStr);
}
```

2. **Backend Timezone Fix** (`backend/src/services/TimezoneService.js:132-141`):
```javascript
// Same UTC timestamp detection and fix
const dateStr = utcDate.toString();
if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/) && !dateStr.endsWith('Z')) {
  dateObj = new Date(dateStr + 'Z');
} else {
  dateObj = new Date(dateStr);
}
```

3. **Backend Pre-formatting** (`backend/src/routes/campaigns.js:1747-1778`):
```javascript
// Schedule-activity endpoint now pre-formats timestamps
const formattedTime = TimezoneService.convertToUserTimezone(
  email.send_at,
  campaignTimezone,
  {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  }
);

return {
  id: email.id,
  time: formattedTime,        // Pre-formatted: "Sep 22, 2025, 9:00 AM"
  rawTime: email.send_at,     // Keep raw for debugging
  // ...
};
```

4. **Frontend Pre-formatted Display** (`frontend/app/campaigns/[id]/page.tsx:621-643`):
```typescript
// Use pre-formatted timestamps from backend
const formatActivityTime = (activity: ScheduledActivity) => {
  if (activity.time && typeof activity.time === 'string' &&
      (activity.time.includes('AM') || activity.time.includes('PM'))) {
    return activity.time; // Use pre-formatted
  } else {
    return formatDate(activity.time, 'MMM d, yyyy h:mm a'); // Legacy fallback
  }
};
```

**Verification**:
Backend logs confirmed successful conversion:
```
rawTime: '2025-09-22T07:00:00'
formattedTime: 'Sep 22, 2025, 9:00 AM'  ✅
```

**Result**:
- ✅ Fixed UTC timestamp interpretation across frontend and backend
- ✅ Scheduled emails now correctly display 9:00 AM for UTC 7:00 AM in Europe/Rome
- ✅ Backend pre-formats timestamps to ensure consistent display
- ✅ Comprehensive fix prevents similar issues with other timestamp displays
- ✅ Test script created to validate the fix (`test-timezone-fix.cjs`)

## Best Practices

### For Database Operations
```javascript
// ✅ CORRECT - Store in UTC
const scheduledEmail = {
  send_at: sendTime.toISOString(),  // "2025-09-18T05:00:00.000Z"
  created_at: new Date().toISOString()
};

// ❌ INCORRECT - Don't use local timestamp for DB
const scheduledEmail = {
  send_at: toLocalTimestamp(sendTime)  // "2025-09-18T07:00:00"
};
```

### For Display
```javascript
// ✅ CORRECT - Convert for user display
const campaignTimezone = campaign.config.timezone || 'UTC';
const displayTime = TimezoneService.convertToUserTimezone(
  email.send_at,
  campaignTimezone
);

// ✅ CORRECT - Validate timezone first
if (TimezoneService.isValidTimezone(timezone)) {
  // Use timezone
} else {
  // Fallback to UTC
}
```

### For API Responses
```javascript
// ✅ CORRECT - Include both UTC and formatted time
const response = {
  send_at: email.send_at,  // UTC timestamp
  formattedTime: TimezoneService.convertToUserTimezone(
    email.send_at,
    campaignTimezone
  )
};
```

## Testing Timezone Conversion

### Manual Testing
```javascript
const TimezoneService = require('./src/services/TimezoneService.js');

// Test legacy format (without Z)
console.log(TimezoneService.convertToUserTimezone(
  '2025-09-18T07:00:00',
  'Europe/Rome'
)); // Should output: "Sep 18, 2025, 9:00 AM"

// Test new format (with Z)
console.log(TimezoneService.convertToUserTimezone(
  '2025-09-18T07:00:00Z',
  'Europe/Rome'
)); // Should output: "Sep 18, 2025, 9:00 AM"
```

### Expected Results
- **7:00 UTC** → **9:00 AM Rome** (UTC+2 during summer)
- **7:00 UTC** → **8:00 AM Rome** (UTC+1 during winter)

## Timezone Support

### Supported Timezones
The system supports all IANA timezone identifiers through `TimezoneService.COMMON_TIMEZONES`:

- **Americas**: New_York, Chicago, Denver, Los_Angeles, Toronto, etc.
- **Europe**: London, Paris, Berlin, Rome, Madrid, Amsterdam, etc.
- **Asia**: Tokyo, Shanghai, Mumbai, Dubai, Seoul, Bangkok, etc.
- **Oceania**: Sydney, Melbourne, Perth, Auckland, etc.
- **Africa**: Cairo, Johannesburg, Lagos, etc.

### Business Hours Configuration
Per-timezone business hours are configured in `TimezoneService.BUSINESS_HOURS`:

```javascript
'Europe/Rome': { start: 9, end: 17 },    // 9 AM - 5 PM
'Asia/Tokyo': { start: 9, end: 18 },     // 9 AM - 6 PM
'America/New_York': { start: 9, end: 17 } // 9 AM - 5 PM
```

## Migration Notes

### Legacy Data Handling
- **Existing timestamps**: Automatically handled by TimezoneService backward compatibility
- **No migration required**: System handles both formats transparently
- **Future data**: Will be stored in proper UTC format

### Deployment Considerations
- **No breaking changes**: Backward compatibility maintained
- **Immediate effect**: Timezone display fixes apply immediately
- **Database**: No schema changes required

## Debugging Timezone Issues

### Debug Logging
Enable timezone debug logging in campaigns.js:
```javascript
console.log('🕐 Campaign timezone:', campaignTimezone);
console.log('🕐 Converting time:', timestamp);
console.log('🕐 Formatted result:', formattedTime);
```

### Common Issues
1. **Wrong timezone display**: Check campaign.config.timezone setting
2. **Legacy timestamps**: Ensure TimezoneService handles format correctly
3. **Invalid timezone**: Verify IANA timezone identifier format

### Validation Commands
```bash
# Test timezone service
cd backend && node -e "console.log(require('./src/services/TimezoneService.js').convertToUserTimezone('2025-09-18T07:00:00', 'Europe/Rome'))"

# Check campaign timezone
curl -H "Authorization: Bearer <token>" "http://localhost:4000/api/campaigns/<id>"
```

---

**Last Updated**: September 2025
**Status**: ✅ Timezone conversion issue resolved
**Next Review**: When adding new timezone features