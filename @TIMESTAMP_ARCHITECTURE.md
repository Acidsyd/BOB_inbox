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
- ✅ Handles both legacy timestamps (`2025-09-18T07:00:00`) and new UTC timestamps (`2025-09-18T05:00:00Z`)
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
- ✅ Legacy timestamp handling (adds 'Z' for UTC)
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

2. **Added Backward Compatibility** (`TimezoneService.js`):
```javascript
// Handle legacy timestamps without 'Z' indicator
if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(dateStr)) {
  // Add 'Z' to treat as UTC since database times should be UTC
  dateObj = new Date(dateStr + 'Z');
}
```

**Result**:
- ✅ 5:00 UTC now correctly displays as 9:00 AM Rome time
- ✅ Legacy timestamps are handled correctly
- ✅ Future timestamps stored in proper UTC format

### Issue #2: Frontend Timezone Inconsistency (September 2025)
**Problem**: Message view showed different time than conversation list (11:15 AM vs 9:15 AM for CEST)

**Root Cause**:
- `InboxMessageView.tsx` prioritized backend pre-formatted timestamps over frontend timezone context
- Conversation list used frontend timezone formatting while message view used backend display timestamps

**Solution Applied**:

1. **Fixed formatEuropeRomeDate function** (`InboxMessageView.tsx:105`):
```javascript
// BEFORE (hardcoded timezone):
return formatDateInTimezone(date, 'MMM d, yyyy h:mm a', 'Europe/Rome');

// AFTER (uses timezone context):
return formatDateInTimezone(date, 'MMM d, yyyy h:mm a');
```

2. **Fixed formatDate precedence logic** (`InboxMessageView.tsx:413-416`):
```javascript
// BEFORE (backend display timestamps took precedence):
const displayTime = message.sent_at_display || message.received_at_display
if (displayTime) {
  return displayTime
}

// AFTER (consistent frontend formatting):
const formatDate = (message: Message) => {
  return formatDateInTimezone(message.sent_at || message.received_at, 'MMM d, yyyy h:mm a')
}
```

**Result**:
- ✅ Message view now shows same time as conversation list (9:15 AM CEST)
- ✅ Consistent timezone formatting across all components
- ✅ Frontend timezone context properly utilized throughout UI

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