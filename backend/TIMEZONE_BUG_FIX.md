# Campaign Scheduling Timezone Bug - Root Cause & Fix

## Issue Summary

**Problem**: Campaign emails are scheduled at the wrong time (e.g., showing 8 AM instead of 10 AM, or appearing 2 hours off from expected time).

**User Report**: "Campaign scheduled from tomorrow at 10 am but it should be 9 am"

## Root Cause Analysis

### The Complete Picture

1. **System Environment**:
   - Server timezone: `Europe/Rome` (UTC+2)
   - Database: Supabase PostgreSQL
   - Node.js: Running in Rome timezone

2. **The Bug Chain**:
   ```
   Campaign restarted at 10 AM Rome
   ↓
   Scheduler creates: 2025-10-16T08:00:00.000Z (10 AM Rome = 08:00 UTC) ✅
   ↓
   Code calls: sendAt.toISOString() = "2025-10-16T08:00:00.000Z" ✅
   ↓
   PostgreSQL stores: 2025-10-16T08:00:00.000 (STRIPS 'Z' suffix!) ❌
   ↓
   JavaScript reads back: new Date("2025-10-16T08:00:00.000")
   ↓
   JavaScript interprets as ROME LOCAL TIME (not UTC!) ❌
   ↓
   Converts to UTC: 2025-10-16T06:00:00.000Z (08:00 Rome → 06:00 UTC)
   ↓
   Displays: 08:00 AM Rome (WRONG! Should be 10:00 AM)
   ```

3. **Why This Happens**:
   - PostgreSQL `timestamp` (without timezone) columns strip timezone info
   - When storing `2025-10-16T08:00:00.000Z`, the 'Z' is removed
   - When JavaScript parses `2025-10-16T08:00:00.000` (no 'Z'), it treats it as LOCAL TIME
   - On a UTC+2 system, this causes a 2-hour shift

## Proof

### Test Results

**Scheduler Output (CORRECT)**:
```
UTC: 2025-10-16T07:00:00.000Z
Rome: 09:00:00 ✅
```

**Database Storage (INCORRECT)**:
```
Raw: 2025-10-16T07:59:48.37 (no 'Z' suffix)
Parsed: 2025-10-16T05:59:48.370Z (JavaScript treats as Rome local time)
Displayed: 07:59:48 AM Rome ❌ (should be 09:59:48 AM)
```

### Real Examples from Database

Campaign ID: `55205d7b-9ebf-414a-84bc-52c8b724dd30`

| Database Value | Intended Time | Actual Display |
|----------------|---------------|----------------|
| 2025-10-16T07:59:48.37 | 09:59 AM Rome | 07:59 AM Rome ❌ |
| 2025-10-16T08:03:28.162 | 10:03 AM Rome | 08:03 AM Rome ❌ |
| 2025-10-16T08:11:25.375 | 10:11 AM Rome | 08:11 AM Rome ❌ |

**All times are 2 hours off!**

## The Fix

### Solution: Use `timestamptz` Columns

Change PostgreSQL columns from `timestamp` (without timezone) to `timestamptz` (with timezone).

### Migration Script

**File**: `database_migrations/fix_timestamp_columns.sql`

```sql
-- Fix scheduled_emails timestamp columns
ALTER TABLE scheduled_emails
ALTER COLUMN send_at TYPE timestamptz USING send_at AT TIME ZONE 'UTC';

ALTER TABLE scheduled_emails
ALTER COLUMN sent_at TYPE timestamptz USING sent_at AT TIME ZONE 'UTC';

ALTER TABLE scheduled_emails
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE scheduled_emails
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
```

### How to Apply the Fix

1. **Go to Supabase Dashboard** → SQL Editor
2. **Paste the migration SQL** from `database_migrations/fix_timestamp_columns.sql`
3. **Execute the query**
4. **Restart the campaign** to reschedule emails with correct times

### After the Fix

After running the migration:
- Database will preserve the 'Z' suffix: `2025-10-16T08:00:00.000Z`
- JavaScript will correctly parse as UTC: `2025-10-16T08:00:00.000Z`
- Display will show correct time: `10:00 AM Rome`

## Additional Context

### Why Campaign Shows Wrong Start Time

When you restart a campaign:
1. Code uses `new Date()` (current server time)
2. If restarted at 10 AM Rome, scheduler keeps 10 AM (within sending hours 9-17)
3. Scheduler creates `08:00 UTC` (= 10 AM Rome) ✅
4. But database timezone bug causes display as 8 AM ❌

### Code Location

The campaign restart logic is in:
- **File**: `src/routes/campaigns.js`
- **Line**: 2132
- **Code**: `scheduler.scheduleEmailsWithPerfectRotation(allLeadsForRestart, emailAccounts);`

No `startTime` parameter is passed, so it defaults to `new Date()` (current time).

## Testing

After applying the fix, test by:

1. **Stop and restart the campaign**
2. **Check the first scheduled email time** in the database:
   ```sql
   SELECT send_at, to_email
   FROM scheduled_emails
   WHERE campaign_id = '55205d7b-9ebf-414a-84bc-52c8b724dd30'
   AND status = 'scheduled'
   ORDER BY send_at ASC
   LIMIT 5;
   ```
3. **Verify the 'Z' suffix is present**: `2025-10-16T09:00:00.000Z`
4. **Check frontend display** shows correct time

## Summary

- **Root Cause**: PostgreSQL `timestamp` columns strip timezone info
- **Impact**: All timestamps display 2 hours off (on UTC+2 systems)
- **Fix**: Change columns to `timestamptz`
- **Migration**: Run SQL in Supabase SQL Editor
- **Result**: Timezone information preserved, correct display times

---

**Created**: 2025-10-15
**Status**: Fix ready, migration script created
**Priority**: HIGH (affects all campaign scheduling)
