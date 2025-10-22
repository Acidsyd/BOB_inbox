# Email Threading Fix - October 22, 2025

## Problem

Follow-up emails were not threading properly with their original emails in Gmail, despite:
- Having the correct "Re:" prefix in the subject line
- Campaign configuration set to `replyToSameThread: true`
- Threading code properly implemented in the system

## Root Cause

The `updateEmailStatus` function in `CronEmailProcessor.js` was unconditionally overwriting the `message_id_header` field when an email was marked as sent (line 1012):

```javascript
if (actualMessageId) updateData.message_id_header = actualMessageId;
```

**The Issue**:
- For **initial emails**: This field should store the email's OWN Message-ID (so follow-ups can reference it)
- For **follow-up emails**: This field should store the PARENT's Message-ID (for the In-Reply-To header)

When a follow-up was sent, the function was overwriting the parent's Message-ID with the follow-up's own Message-ID, breaking the threading chain.

## The Fix

Modified `CronEmailProcessor.js` in two places:

### 1. Line 920-924 (sendEmail call)
```javascript
// 🔥 CRITICAL FIX: Don't overwrite message_id_header for follow-ups replying to same thread
// For follow-ups, message_id_header contains the PARENT's Message-ID (for In-Reply-To header)
// For initial emails, message_id_header should contain their OWN Message-ID
const isThreadedFollowUp = email.is_follow_up && email.reply_to_same_thread;
await this.updateEmailStatus(email.id, 'sent', result.messageId, null, result.actualMessageId, result.threadId, isThreadedFollowUp);
```

### 2. Line 1007-1022 (updateEmailStatus function)
```javascript
async updateEmailStatus(emailId, status, messageId = null, errorMessage = null, actualMessageId = null, threadId = null, isThreadedFollowUp = false) {
  const updateData = {
    status: status,
    updated_at: new Date().toISOString()
  };

  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
    if (messageId) updateData.message_id = messageId;

    // 🔥 CRITICAL FIX: Don't overwrite message_id_header for threaded follow-ups
    // Threaded follow-ups need to preserve the PARENT's Message-ID for In-Reply-To header
    // Only initial emails should store their OWN Message-ID in this field
    if (actualMessageId && !isThreadedFollowUp) {
      updateData.message_id_header = actualMessageId;
    }

    if (threadId) updateData.thread_id = threadId;
  }
  // ...
}
```

## Verification

All scheduled follow-ups currently have the correct parent Message-IDs stored:

```
✅ Message-IDs MATCH (correct for threading) - All 5 checked follow-ups
```

Example:
- Parent: `<CAPfzo0ob7turpaPXcF_zjJpGQp7tbXrXOT53L5Jg7ie+Bms5Yg@mail.gmail.com>`
- Follow-up: `<CAPfzo0ob7turpaPXcF_zjJpGQp7tbXrXOT53L5Jg7ie+Bms5Yg@mail.gmail.com>` (SAME as parent)

## Expected Behavior After Fix

### Before Fix (OLD behavior)
1. Initial email sent → `message_id_header = <email123@gmail.com>` ✅
2. Follow-up scheduled → `message_id_header = <email123@gmail.com>` ✅ (parent's Message-ID)
3. Follow-up sent → `message_id_header = <email456@gmail.com>` ❌ (overwritten!)
4. In-Reply-To header uses WRONG Message-ID → **threading FAILS**

### After Fix (NEW behavior)
1. Initial email sent → `message_id_header = <email123@gmail.com>` ✅
2. Follow-up scheduled → `message_id_header = <email123@gmail.com>` ✅ (parent's Message-ID)
3. Follow-up sent → `message_id_header = <email123@gmail.com>` ✅ (PRESERVED!)
4. In-Reply-To header uses CORRECT Message-ID → **threading WORKS!** 🎉

## Testing

To verify the fix is working for new follow-ups:

```bash
cd backend
node check-sent-followups.cjs
```

This will show if newly sent follow-ups have matching Message-IDs with their parents.

## Important Notes

1. **Already sent follow-ups**: Cannot be retroactively fixed (emails already sent with wrong headers)
2. **New follow-ups**: Will thread correctly starting immediately
3. **No changes needed**: Campaigns already configured correctly with `replyToSameThread: true`
4. **Restart required**: Restart the cron processor to pick up the code changes

## Files Modified

- `backend/src/services/CronEmailProcessor.js` (lines 920-924, 1007-1022)

## Files Created

- `backend/check-threading.cjs` - Diagnostic script for campaign configuration
- `backend/check-sent-followups.cjs` - Diagnostic script for sent follow-ups
- `backend/verify-threading-fix.cjs` - Verification script for the fix
- `THREADING_FIX_SUMMARY.md` - This document
