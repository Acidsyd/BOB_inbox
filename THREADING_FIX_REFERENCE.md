# Email Threading Fix - Reference Documentation

## Problem
Follow-up emails were being sent as standalone emails instead of appearing as threaded replies in Gmail conversations. Recipients would see follow-ups as separate email threads rather than as responses to the original email.

## Root Cause
**EmailService.js was missing threading parameters in its function signature.**

The threading flow was broken at the EmailService layer:
1. ✅ CronEmailProcessor.js correctly set `sendParams.inReplyTo` and `sendParams.references` (line 910)
2. ❌ EmailService.sendEmail() didn't accept these parameters, so they were silently ignored
3. ✅ OAuth2Service.js already had code to construct In-Reply-To/References headers (lines 402-407)

**The missing link**: EmailService wasn't passing threading parameters through to OAuth2Service.

## Solution Applied

### Commit: 41d0a89b
**Message**: "fix(EmailService): pass threading parameters to OAuth2/SMTP for follow-up replies"

### Changes Made to `backend/src/services/EmailService.js`

#### 1. Added Threading Parameters to Function Signature (Line 299)
```javascript
async sendEmail({
  accountId,
  organizationId,
  to,
  cc = null,
  bcc = null,
  subject,
  html,
  text = null,
  attachments = [],
  campaignId = null,
  includeUnsubscribe = false,
  trackOpens = false,
  trackClicks = false,
  trackingToken = null,
  scheduledEmailId = null,
  inReplyTo = null,        // ← NEW: Threading parameter
  references = null,       // ← NEW: Threading parameter
  threadId = null          // ← NEW: Threading parameter
})
```

#### 2. Added Logging for Threading Parameters (Lines 328-330)
```javascript
console.log('📊 Tracking:', { trackOpens, trackClicks, trackingToken });
if (inReplyTo) console.log('🔗 In-Reply-To:', inReplyTo);
if (references) console.log('🔗 References:', references);
if (threadId) console.log('🧵 Thread-ID:', threadId);
```

#### 3. Passed Parameters to OAuth2Service (Lines 354-369)
```javascript
if (useOAuth2) {
  console.log('🔐 Using OAuth2 Gmail API for sending');
  result = await this.oauth2Service.sendEmail({
    fromEmail: account.email,
    toEmail: to,
    cc: cc,
    bcc: bcc,
    subject: subject,
    htmlBody: trackedHtml,
    textBody: text,
    organizationId: organizationId,
    attachments,
    campaignId,
    includeUnsubscribe,
    inReplyTo,          // ← PASS THROUGH
    references,         // ← PASS THROUGH
    threadId            // ← PASS THROUGH
  });
}
```

#### 4. Also Added to SMTP Fallback (Lines 371-389)
```javascript
else {
  console.log('📧 Using SMTP for sending (OAuth2 not available)');
  result = await this.sendViaSmtp({
    account: account,
    to: to,
    cc: cc,
    bcc: bcc,
    subject: subject,
    html: trackedHtml,
    text: text,
    attachments,
    organizationId,
    campaignId,
    includeUnsubscribe,
    inReplyTo,          // ← PASS THROUGH
    references,         // ← PASS THROUGH
    threadId            // ← PASS THROUGH
  });
}
```

## How It Works

### Threading Flow (After Fix)

1. **CronEmailProcessor.js** (Line 910) sets threading parameters when follow-up has a parent:
   ```javascript
   sendParams.inReplyTo = email.message_id_header;
   sendParams.references = email.message_id_header;
   if (email.thread_id) {
     sendParams.threadId = email.thread_id;
   }
   ```

2. **EmailService.js** (Now fixed) accepts and passes parameters:
   ```javascript
   result = await this.oauth2Service.sendEmail({
     // ... other params
     inReplyTo,    // Message-ID of parent email
     references,   // Message-ID of parent email
     threadId      // Gmail thread ID (if available)
   });
   ```

3. **OAuth2Service.js** (Already working) constructs RFC 822 headers:
   ```javascript
   // Lines 402-407
   if (inReplyTo) {
     emailParts.push(`In-Reply-To: ${inReplyTo}`);
   }
   if (references) {
     emailParts.push(`References: ${references}`);
   }
   ```

4. **Gmail API** recognizes the In-Reply-To and References headers and threads the follow-up with the original email.

## Verification

### Check Database for Correct Data
```sql
SELECT
  se.id,
  se.to_email,
  se.is_follow_up,
  se.parent_email_id,
  se.message_id_header,
  parent.message_id_header as parent_message_id
FROM scheduled_emails se
LEFT JOIN scheduled_emails parent ON se.parent_email_id = parent.id
WHERE se.is_follow_up = true
  AND se.status = 'sent'
LIMIT 5;
```

**Expected**: Follow-ups should have `parent_email_id` and `message_id_header` should match parent's Message-ID.

### Check Production Logs
When follow-ups are sent, you should see:
```
🔗 In-Reply-To: <original-message-id@mail.gmail.com>
🔗 References: <original-message-id@mail.gmail.com>
```

### Check in Gmail
1. Open the original email sent to a lead
2. Wait for the follow-up to be sent (based on delay configuration)
3. Refresh Gmail
4. The follow-up should appear **in the same conversation thread** as the original email

## Related Fixes

This threading fix works in conjunction with the follow-up rescheduling fix:

### Commit: 4eba8a71
**Message**: "fix(CronEmailProcessor): exclude follow-ups from ALL reschedule operations"

This ensured follow-ups are actually sent at their scheduled time instead of being constantly rescheduled. See the commit for details on all 6 locations where `filter(e => !e.is_follow_up)` was added.

## Key Takeaway

**When adding new parameters to email sending flow, ensure they're passed through ALL layers:**

1. ✅ CronEmailProcessor sets parameters
2. ✅ EmailService accepts and passes parameters ← **This was missing**
3. ✅ OAuth2Service/SMTP uses parameters

The bug occurred because EmailService was acting as a "broken link" in the chain, silently dropping the threading parameters that were correctly set upstream and expected downstream.

---

**Fix Confirmed Working**: October 28, 2025
**Production Deployment**: Deploy to Production #146
**User Confirmation**: "now the theatering seems working"
