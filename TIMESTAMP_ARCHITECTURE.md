# Timestamp Architecture

This document explains how timestamps are handled, displayed, and transformed throughout the Mailsender application.

## Overview

The application handles timestamps across multiple layers with timezone-aware conversions, ensuring users see times in their local timezone while maintaining UTC consistency in the database.

## Architecture Schema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TIMESTAMP FLOW ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   FRONTEND   │    │   BACKEND    │    │   DATABASE   │    │   DISPLAY    │  │
│  │              │    │              │    │              │    │              │  │
│  │ Browser TZ   │    │ UTC/TZ Conv  │    │ UTC Storage  │    │ User Local   │  │
│  │ Detection    │───▶│ Processing   │───▶│ Timestamp    │───▶│ Format       │  │
│  │              │    │              │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              DATA FLOW DETAILS                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Browser Detection          2. API Request               3. Database Query   │
│  ┌─────────────────┐           ┌─────────────────┐          ┌─────────────────┐ │
│  │ getUserTimezone()│──────────▶│ timezone param  │─────────▶│ UTC timestamps  │ │
│  │ Europe/Rome     │           │ ?timezone=...   │          │ TIMESTAMPTZ     │ │
│  └─────────────────┘           └─────────────────┘          └─────────────────┘ │
│                                                                                 │
│  4. Backend Processing         5. Timezone Conversion       6. Frontend Display │
│  ┌─────────────────┐           ┌─────────────────┐          ┌─────────────────┐ │
│  │ toLocaleString()│──────────▶│ User timezone   │─────────▶│ Formatted time  │ │
│  │ hour: 'numeric' │           │ CEST display    │          │ "Sep 15, 3:45PM"│ │
│  └─────────────────┘           └─────────────────┘          └─────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend Timezone Detection

**Location**: `frontend/lib/timezone.ts`

The frontend automatically detects and manages user timezone preferences:

```typescript
// Primary timezone detection
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect browser timezone, falling back to UTC:', error);
    return 'UTC';
  }
}

// Persistent timezone management
export function getUserTimezone(): string {
  try {
    // Check localStorage first
    const stored = localStorage.getItem('userTimezone');
    if (stored) return stored;

    // Fall back to browser detection
    const browserTimezone = getBrowserTimezone();
    localStorage.setItem('userTimezone', browserTimezone);
    return browserTimezone;
  } catch (error) {
    return 'UTC';
  }
}
```

**Key Features**:
- Automatic browser timezone detection using `Intl.DateTimeFormat()`
- Persistent storage in localStorage
- Fallback to UTC if detection fails
- Support for manual timezone override

### 2. Database Storage Strategy

**Storage Format**: All timestamps are stored in UTC using PostgreSQL `TIMESTAMPTZ` type

```sql
-- Example database columns
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY,
  sent_at TIMESTAMPTZ NOT NULL,           -- UTC timestamp
  received_at TIMESTAMPTZ,                -- UTC timestamp
  sent_at_display TEXT,                   -- Timezone-converted display string
  received_at_display TEXT                -- Timezone-converted display string
);

CREATE TABLE scheduled_emails (
  id UUID PRIMARY KEY,
  send_at TIMESTAMPTZ NOT NULL,           -- UTC timestamp for processing
  created_at TIMESTAMPTZ DEFAULT NOW(),   -- UTC timestamp
  updated_at TIMESTAMPTZ DEFAULT NOW()    -- UTC timestamp
);
```

**Benefits**:
- Consistent UTC storage eliminates timezone confusion
- PostgreSQL handles timezone conversions efficiently
- Easy comparison and sorting across timezones
- Future-proof for international expansion

### 3. Backend Timezone Conversion

The backend performs timezone conversions for display purposes while maintaining UTC for processing.

#### Inbox Messages (`backend/src/routes/inbox.js`)

```javascript
// Convert timestamps to user timezone for display
if (userTimezone && userTimezone !== 'UTC') {
  convertedMessage.sent_at_display = sentAtDate.toLocaleString('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (convertedMessage.received_at) {
    const receivedAtDate = new Date(convertedMessage.received_at);
    convertedMessage.received_at_display = receivedAtDate.toLocaleString('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}
```

#### TimezoneService Implementation (`backend/src/services/TimezoneService.js`)

The TimezoneService provides centralized timezone conversion functionality using the Intl.DateTimeFormat API:

```javascript
class TimezoneService {
  static convertToUserTimezone(dateString, timezone, options = {}) {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }

      // Use Intl.DateTimeFormat for reliable timezone conversion
      return date.toLocaleString('en-US', {
        timeZone: timezone,
        ...options
      });
    } catch (error) {
      console.error('TimezoneService conversion error:', error);
      return dateString; // Fallback to original
    }
  }
}
```

**Critical Pattern**: All TimezoneService calls must use valid Intl.DateTimeFormat options:

```javascript
// ✅ CORRECT - Valid Intl.DateTimeFormat options
const options = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
};

// ❌ INCORRECT - Custom format strings not supported
const badOptions = {
  format: 'MMM d, yyyy h:mm a'  // This causes errors
};
```

#### Campaign Scheduling (`backend/src/utils/CampaignScheduler.js`)

```javascript
class CampaignScheduler {
  constructor(config) {
    this.timezone = config.timezone || 'UTC';
  }

  // Get hour in campaign timezone for scheduling logic
  getHourInTimezone(date) {
    try {
      const hourString = date.toLocaleString('en-US', {
        timeZone: this.timezone,
        hour: 'numeric',
        hour12: false
      });

      const hour = parseInt(hourString);

      if (isNaN(hour) || hour < 0 || hour > 23) {
        console.error('🚨 Invalid hour result:', hourString);
        return 9; // Safe default
      }

      return hour;
    } catch (error) {
      console.error('🚨 Error in timezone conversion:', error);
      return 9;
    }
  }
}
```

### 4. Production Environment Configuration

**Location**: `ecosystem.config.cjs` (PM2 configuration)

Critical for production deployment - ensures Node.js processes use the correct timezone:

```javascript
module.exports = {
  apps: [
    {
      name: 'mailsender-backend',
      script: './backend/src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        TZ: 'Europe/Rome'  // ✅ CRITICAL: Forces timezone consistency
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        TZ: 'Europe/Rome'  // ✅ CRITICAL: Forces timezone consistency
      }
    }
    // ... other services with same TZ setting
  ]
};
```

**Why This Matters**:
- Production servers often run in UTC by default
- Without TZ environment variable, Node.js inherits system timezone (UTC)
- This causes 2-hour offset for CEST users (UTC → CEST conversion fails)
- Setting TZ forces all Node.js `toLocaleString()` calls to use correct base timezone

**Verification**:
```bash
# Check if timezone is correctly set
pm2 env 0 | grep TZ
# Should output: TZ: Europe/Rome

# Test timezone in Node.js process
TZ=Europe/Rome node -e "console.log(new Date().toString())"
# Should output: CEST time, not UTC
```

### 5. Timezone Settings UI System

**Location**: `frontend/app/settings/timezone/page.tsx`, `frontend/contexts/TimezoneContext.tsx`

Complete timezone management system with UI for user control and React Context for state management:

#### Timezone Settings Page Features

```typescript
// Comprehensive timezone settings interface
const timezoneOptions = [
  {
    region: 'North America',
    zones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']
  },
  {
    region: 'Europe',
    zones: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome']
  },
  {
    region: 'Asia Pacific',
    zones: ['Asia/Tokyo', 'Asia/Shanghai', 'Asia/Mumbai', 'Australia/Sydney']
  }
];

// Auto-detection with manual override
const handleTimezoneChange = async (newTimezone: string) => {
  if (newTimezone === 'auto') {
    refreshTimezone(); // Triggers browser detection
  } else {
    setTimezone(newTimezone); // Manual selection
  }
};
```

**Features**:
- Auto-detect timezone with browser API
- Manual timezone selection organized by regions
- Current timezone display with live time preview
- Business hours and campaign scheduling information
- Debug information for troubleshooting

#### TimezoneContext Performance Optimizations

**Location**: `frontend/contexts/TimezoneContext.tsx`

**Critical Fix**: Removed performance-blocking console.log statements from formatting functions:

```typescript
// ❌ BEFORE - Caused inbox loading hangs
const formatDate = (date: string | Date | undefined | null, formatString?: string) => {
  if (!isClient) return '';
  console.log('🌐 formatDate called:', { date, timezone, isClient }); // REMOVED
  return formatDateInTimezone(date, formatString, timezone);
};

// ✅ AFTER - Performance optimized
const formatDate = (date: string | Date | undefined | null, formatString?: string) => {
  if (!isClient) return '';
  return formatDateInTimezone(date, formatString, timezone);
};
```

**Context Features**:
- Centralized timezone state management across the app
- Enhanced timezone detection with error handling
- Automatic timezone change monitoring
- Performance-optimized date formatting
- Server-side rendering safe initialization

#### Navigation Integration

**Location**: `frontend/components/layout/Sidebar.tsx`

Added timezone settings to main navigation dropdown:

```typescript
{
  name: 'Settings',
  icon: Settings,
  children: [
    { name: 'Email Accounts', href: '/settings/email-accounts' },
    { name: 'Integrations', href: '/settings/integrations' },
    { name: 'Billing', href: '/settings/billing' },
    { name: 'Timezone', href: '/settings/timezone' }, // ✅ NEW
  ]
}
```

### 6. Frontend Display Formatting

**Location**: `frontend/lib/timezone.ts`

Multiple formatting functions handle different display contexts:

```typescript
// Detailed inbox message timestamps
export function formatInboxMessageDate(date: string | Date | undefined | null): string {
  return formatDateInTimezone(date, 'MMM d, yyyy h:mm a');
}

// Compact conversation list timestamps
export function formatConversationDate(date: string | Date | undefined | null): string {
  if (!date) return '';

  const userTimezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  // Today: show time only
  const todayStr = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd');
  const dateStr = formatInTimeZone(dateObj, userTimezone, 'yyyy-MM-dd');

  if (dateStr === todayStr) {
    return formatInTimeZone(dateObj, userTimezone, 'h:mm a');
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatInTimeZone(yesterday, userTimezone, 'yyyy-MM-dd');
  if (dateStr === yesterdayStr) {
    return 'Yesterday';
  }

  // This year: show month and day
  const currentYear = formatInTimeZone(now, userTimezone, 'yyyy');
  const dateYear = formatInTimeZone(dateObj, userTimezone, 'yyyy');
  if (dateYear === currentYear) {
    return formatInTimeZone(dateObj, userTimezone, 'MMM d');
  }

  // Different year: show full date
  return formatInTimeZone(dateObj, userTimezone, 'MMM d, yyyy');
}
```

## Data Flow Patterns

### 1. Inbox Message Display Flow

```
1. User opens inbox
   ↓
2. Frontend detects timezone (Europe/Rome)
   ↓
3. API request: GET /inbox/conversations/{id}/messages?timezone=Europe/Rome
   ↓
4. Backend queries UTC timestamps from database
   ↓
5. Backend converts to user timezone using toLocaleString()
   ↓
6. Response includes both UTC and display timestamps
   ↓
7. Frontend displays converted timestamp: "Sep 15, 3:45 PM"
```

### 2. Campaign Scheduling Flow

```
1. User creates campaign with timezone setting
   ↓
2. Campaign config stored with timezone: "Europe/Rome"
   ↓
3. CampaignScheduler processes in user timezone
   ↓
4. Scheduled emails created with UTC timestamps
   ↓
5. Cron processor executes based on UTC times
   ↓
6. Timeline display converts back to user timezone
```

### 3. Email Sync Flow

```
1. Gmail API returns timestamps in UTC
   ↓
2. EmailSyncService stores raw UTC timestamps
   ↓
3. UnifiedInboxService preserves original timing
   ↓
4. Display layer converts to user timezone
```

## Timezone Conversion Methods

### Safe toLocaleString() Pattern

**Problem**: `hour: '2-digit'` can return "24" for midnight, causing errors

**Solution**: Use safer formatting options

```javascript
// ❌ PROBLEMATIC - Can return "24"
const badFormat = date.toLocaleString('en-US', {
  timeZone: timezone,
  hour: '2-digit',
  hour12: false
});

// ✅ SAFE - Returns valid hours 0-23
const safeFormat = date.toLocaleString('en-US', {
  timeZone: timezone,
  hour: 'numeric',
  hour12: false
});

// ✅ USER-FRIENDLY - 12-hour format with AM/PM
const friendlyFormat = date.toLocaleString('en-US', {
  timeZone: timezone,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});
```

## Critical Implementation Notes

### 1. Consistency Rules

- **Database**: Always store in UTC
- **API**: Accept timezone parameter for display conversion
- **Processing**: Use UTC for all time-based logic
- **Display**: Convert to user timezone only for presentation

### 2. Error Handling

```javascript
// Always validate dates before conversion
if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
  console.error('Invalid date provided:', date);
  return 'Invalid date';
}

// Provide fallbacks for failed conversions
try {
  return formatInTimeZone(dateObj, userTimezone, formatString);
} catch (error) {
  console.error('Timezone conversion error:', error);
  return 'Error formatting date';
}
```

### 3. Performance Considerations

- **Cache timezone detection**: Store in localStorage to avoid repeated browser queries
- **Batch conversions**: Convert multiple timestamps in single operations
- **Avoid repeated conversions**: Store display strings when possible

## Common Timezone Issues & Solutions

### Issue 1: "Invalid hour result: 24"
**Cause**: `hour: '2-digit'` returning invalid hour value
**Solution**: Use `hour: 'numeric'` instead
**Status**: ✅ Fixed September 2025

### Issue 2: Scheduled Activity Timezone Display
**Cause**: formatCampaignDate helper function using invalid format properties for TimezoneService.convertToUserTimezone()
**Symptoms**: Scheduled emails showing times 2 hours behind (8:58 AM instead of 10:58 AM for Europe/Rome timezone)
**Solution**: Fixed formatCampaignDate helper in campaigns.js to use proper Intl.DateTimeFormat options instead of custom format strings
**Files affected**:
- `backend/src/routes/campaigns.js:16-51` (formatCampaignDate helper)
- `backend/src/routes/campaigns.js:1741-1742` (scheduled activity API route)
**Technical Details**: The fix involved updating the formatCampaignDate helper function to properly convert format strings to Intl.DateTimeFormat options:

```javascript
// Fixed formatCampaignDate helper function in campaigns.js
function formatCampaignDate(dateString, timezone, customFormat = null) {
  if (!dateString) return null;

  try {
    // Default format for campaign dates
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    // Use custom format if provided, otherwise use default
    const formatOptions = customFormat || defaultOptions;

    return TimezoneService.convertToUserTimezone(dateString, timezone, formatOptions);
  } catch (error) {
    console.error('Error formatting campaign date:', error);
    return dateString; // Fallback to original if formatting fails
  }
}

// Updated scheduled activity API route
const formattedTime = formatCampaignDate(email.send_at, campaignTimezone);
```

**Verification**: UTC timestamps now correctly convert to local timezone:
- UTC 8:58 AM → Rome 10:58 AM ✅
- UTC 9:12 AM → Rome 11:12 AM ✅
- UTC 9:28 AM → Rome 11:28 AM ✅

**Status**: ✅ Fixed September 2025 - Backend server restarted with timezone conversion fixes

### Issue 3: UTC vs Local Time Confusion
**Cause**: Mixing UTC and local times in calculations
**Solution**: Always use UTC for processing, local only for display

### Issue 4: Inbox Loading Performance Issues
**Cause**: Excessive console.log statements in TimezoneContext formatting functions called on every message render
**Symptoms**: Inbox page shows "Loading timezone..." and hangs, especially with many conversations
**Solution**: Removed performance-blocking console.log statements from formatDate and formatMessageDate functions
**Status**: ✅ Fixed September 2025

```typescript
// Problem was in TimezoneContext.tsx
const formatDate = (date: string | Date | undefined | null, formatString?: string) => {
  if (!isClient) return '';
  // console.log('🌐 formatDate called:', { date, timezone, isClient }); // ❌ REMOVED
  return formatDateInTimezone(date, formatString, timezone);
};
```

### Issue 5: Missing Timezone Settings Access
**Cause**: No user-accessible timezone settings interface
**Solution**: Created comprehensive timezone settings page and added to navigation
**Status**: ✅ Fixed September 2025
- Complete timezone settings page at `/settings/timezone`
- Added to sidebar navigation dropdown
- Auto-detection with manual override options

### Issue 6: Production vs Development Timezone Mismatch
**Cause**: Production server running in UTC while development runs in local timezone
**Solution**: Set `TZ` environment variable in PM2 ecosystem config to match user timezone
```javascript
// ecosystem.config.cjs
env: {
  NODE_ENV: 'production',
  PORT: 4000,
  TZ: 'Europe/Rome'  // Critical: Forces Node.js to use this timezone
}
```
**Status**: ✅ Fixed September 2025 - All PM2 processes now use Europe/Rome timezone

### Issue 7: Daylight Saving Time Transitions
**Cause**: Date calculations during DST changes
**Solution**: Use IANA timezone identifiers and proper libraries

### Issue 8: Browser Compatibility
**Cause**: Different browsers handle timezone conversion differently
**Solution**: Use standardized Intl.DateTimeFormat API with fallbacks

## Testing Timezone Functionality

### Manual Testing Checklist

1. **Change browser timezone** and verify inbox displays update
2. **Test DST transitions** with dates around time changes
3. **Verify campaign scheduling** respects timezone settings
4. **Check midnight edge cases** (23:59 → 00:00 transitions)
5. **Test multiple timezone scenarios** (UTC, EST, PST, CEST, etc.)

### Debug Tools

```javascript
// Debug current timezone settings
import { getTimezoneInfo, logTimezoneDebug } from '@/lib/timezone';

// Log comprehensive timezone information
logTimezoneDebug();

// Get timezone details
const info = getTimezoneInfo();
console.log('Timezone Debug:', info);
```

### Production Troubleshooting

When timestamps show incorrect times in production but work correctly in development:

1. **Check Server Timezone**:
```bash
ssh root@your-server "date"
ssh root@your-server "timedatectl status"
```

2. **Check Node.js Process Timezone**:
```bash
ssh root@your-server "pm2 env 0 | grep TZ"
```

3. **Test Timezone Conversion**:
```bash
# Should show CEST time if TZ is set correctly
ssh root@your-server "cd /var/www/mailsender && TZ=Europe/Rome node -e \"console.log(new Date().toString())\""
```

4. **Common Fix - Update PM2 Config**:
```bash
# Add TZ environment variable to all apps in ecosystem.config.cjs
# Then restart services
pm2 delete all
pm2 start ecosystem.config.cjs --env production
```

## Recent Improvements (September 2025)

### ✅ Completed Enhancements

1. **Timezone Settings UI**: Complete timezone management interface with auto-detection and manual override
2. **React Context Integration**: Centralized timezone management with performance optimization
3. **Sidebar Navigation**: Direct access to timezone settings from main navigation
4. **Enhanced Detection**: Robust timezone detection with error handling and fallbacks
5. **Performance Optimization**: Removed excessive logging that caused inbox loading issues

## Future Enhancements

### Planned Improvements

1. **Multi-Timezone Display**: Show times in multiple zones for global teams
2. **Smart Timezone Detection**: Detect timezone changes during long sessions
3. **Timezone History**: Track timezone changes for audit purposes

### Migration Considerations

- All existing UTC timestamps remain valid
- New display fields can be computed on-demand
- Gradual rollout of timezone-aware features
- Backward compatibility with existing API consumers

---

*This architecture ensures consistent, accurate timestamp handling across the entire application while providing users with intuitive, localized time displays.*