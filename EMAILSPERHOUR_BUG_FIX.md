# emailsPerHour Bug Fix - Complete Analysis

## Problem Summary
Campaign configured for 5-minute intervals was sending emails every **16 minutes** instead.

## Root Causes

### 1. **Missing Field in PUT Endpoint** (Primary Cause)
**File**: `backend/src/routes/campaigns.js:2540-2563`

The PUT endpoint (campaign update) was **not extracting** `emailsPerHour` from the request body:

```javascript
// ❌ BEFORE (line 2540-2562)
const {
  description,
  emailSubject,
  // ... other fields ...
  emailsPerDay,
  sendingInterval,
  // emailsPerHour,  // ← MISSING!
  trackOpens,
  // ...
} = frontendConfig;
```

**Result**: When you edited a campaign, `emailsPerHour` was lost and became `undefined`.

### 2. **Conflicting Default Values** in CronEmailProcessor
**File**: `backend/src/services/CronEmailProcessor.js`

Two different default values existed in the same file:
- Line 664: `emailsPerHour || 10` ✅
- Line 776: `emailsPerHour || 4` ❌ (wrong default)

With the wrong default of 4:
```
Minimum interval = Math.ceil(60 / 4) = 15 minutes
```

### 3. **Missing Config Preservation** in PUT Endpoint
**File**: `backend/src/routes/campaigns.js:2600-2621`

The campaignConfig object didn't include `emailsPerHour`:

```javascript
// ❌ BEFORE (line 2611-2612)
emailsPerDay: emailsPerDay !== undefined ? emailsPerDay : (existingConfig.emailsPerDay || 50),
sendingInterval: sendingInterval !== undefined ? Math.max(5, sendingInterval) : (existingConfig.sendingInterval || 15),
// emailsPerHour: ... ← MISSING!
```

## Timeline of What Happened

1. **Oct 27, 2025** - Campaign "WISE 4" created
   - Backend POST endpoint set `emailsPerHour: 5` (default from line 626)

2. **Unknown date** - Campaign edited via UI
   - PUT endpoint didn't extract `emailsPerHour` from request
   - Field became `undefined` in database

3. **Nov 3, 2025** - Campaign restarted
   - `emailsPerHour: undefined` → Used default of `4` (wrong default at line 776)
   - Minimum interval: `60/4 = 15 minutes`
   - Actual interval: ~16 minutes (15 min + cron cycle overhead)

## Fixes Applied

### Fix 1: Add emailsPerHour to PUT Endpoint Extraction
**File**: `backend/src/routes/campaigns.js:2553`

```javascript
// ✅ AFTER
const {
  description,
  emailSubject,
  emailContent,
  followUpEnabled,
  emailSequence,
  selectedLeads,
  leadListId: selectedLeadListId,
  leadListName: selectedLeadListName,
  leadListCount: selectedLeadListCount,
  emailAccounts,
  selectedAccountIds,
  emailsPerDay,
  emailsPerHour,  // ✅ ADDED
  sendingInterval,
  trackOpens,
  trackClicks,
  stopOnReply,
  activeDays,
  sendingHours,
  enableJitter,
  jitterMinutes,
  timezone
} = frontendConfig;
```

### Fix 2: Add emailsPerHour to Campaign Config Object
**File**: `backend/src/routes/campaigns.js:2612`

```javascript
// ✅ AFTER
emailAccounts: getValueOrExisting(selectedAccountIds || emailAccounts, existingConfig.emailAccounts, []),
emailsPerDay: emailsPerDay !== undefined ? emailsPerDay : (existingConfig.emailsPerDay || 50),
emailsPerHour: emailsPerHour !== undefined ? emailsPerHour : (existingConfig.emailsPerHour || 10),  // ✅ ADDED
sendingInterval: sendingInterval !== undefined ? Math.max(5, sendingInterval) : (existingConfig.sendingInterval || 15),
```

### Fix 3: Fix Conflicting Default in CronEmailProcessor
**File**: `backend/src/services/CronEmailProcessor.js:776`

```javascript
// ❌ BEFORE
const emailsPerHour = campaignConfig?.emailsPerHour || 4; // Default 4 emails/hour

// ✅ AFTER
const emailsPerHour = campaignConfig?.emailsPerHour || 10; // Default 10 emails/hour (FIXED: was inconsistent with line 664)
```

### Fix 4: Update Campaign Config for Immediate Relief
**Script**: `backend/fix-campaign-interval.js`

Updated campaign "WISE 4" to explicitly set:
```javascript
emailsPerHour: 12  // Allows 5-minute intervals (60/12 = 5 min minimum)
```

## Verification

### Expected Behavior After Fixes

For a campaign with `sendingInterval: 5` and `emailsPerHour: 12`:

```javascript
Configured interval: 5 minutes
Min from emailsPerHour: Math.ceil(60/12) = 5 minutes
Actual interval: Math.max(5, 5) = 5 minutes
```

**Effective sending**: ~6 minutes between emails (5 min interval + ~1 min cron cycle)

### How to Verify

1. Restart cron worker: `npm run cron:dev`
2. Monitor intervals: `node diagnose-campaign-interval.js`
3. Check recent sends: Should see 5-6 minute gaps instead of 16 minutes

## Lessons Learned

1. **Always preserve config fields during updates** - Use existing config as fallback
2. **Consistent defaults across codebase** - Don't use different defaults for the same field
3. **Explicit is better than implicit** - Set explicit values instead of relying on defaults
4. **Test update flows** - Ensure CRUD operations preserve all fields

## Prevention

### Code Review Checklist
- [ ] All config fields extracted from request body
- [ ] All config fields included in update object
- [ ] Consistent defaults across all endpoints
- [ ] Fallback to existing config when value is undefined

### Testing
- [ ] Create campaign → Verify all fields saved
- [ ] Edit campaign → Verify all fields preserved
- [ ] Start/stop/restart → Verify config remains intact

## Related Files

- `backend/src/routes/campaigns.js` - POST and PUT endpoints
- `backend/src/services/CronEmailProcessor.js` - Email sending logic
- `backend/src/utils/CampaignScheduler.js` - Scheduling algorithm
- `backend/diagnose-campaign-interval.js` - Diagnostic tool
- `backend/fix-campaign-interval.js` - One-time fix script

## Impact

- **Before**: Campaigns could lose emailsPerHour setting during edits → Wrong intervals
- **After**: emailsPerHour always preserved → Correct intervals maintained

---

**Date**: November 3, 2025
**Campaign Affected**: WISE 4 (823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1)
**Status**: ✅ Fixed and deployed
