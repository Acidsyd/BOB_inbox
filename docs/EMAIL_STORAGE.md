# Email Storage System

## Overview

The Email Storage System automatically archives old email content to Supabase Storage, reducing database size while keeping all emails accessible. This hybrid approach stores metadata in PostgreSQL (fast, expensive) and content in object storage (slower, cheap).

## Architecture

### Two-Tier Storage Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     Email Lifecycle                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  New Email Received                                              │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────┐                                           │
│  │   PostgreSQL     │  ← Recent emails (<180 days)              │
│  │   Database       │  ← Fast queries                           │
│  │                  │  ← Full content stored                    │
│  │  content_html    │                                           │
│  │  content_plain   │                                           │
│  └──────────────────┘                                           │
│         │                                                         │
│         │ (After 180 days)                                       │
│         ▼                                                         │
│  ┌──────────────────┐      ┌─────────────────────┐             │
│  │   PostgreSQL     │─────▶│  Supabase Storage   │             │
│  │   Database       │      │                     │             │
│  │                  │      │  2025/01/msg.html   │             │
│  │  storage_html    │      │  2025/01/msg.txt    │             │
│  │  storage_plain   │      │                     │             │
│  │  archived_at     │      │  (Cheap storage)    │             │
│  └──────────────────┘      └─────────────────────┘             │
│         │                            │                           │
│         └────────────────────────────┘                           │
│                    │                                              │
│                    ▼                                              │
│            User views email                                      │
│            (Transparent retrieval)                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Breakdown

| Storage Type | Use Case | Size | Speed | Cost |
|-------------|----------|------|-------|------|
| **PostgreSQL** | Recent emails (<180 days) | ~30 KB/email | Fast | High |
| **Supabase Storage** | Old emails (>180 days) | ~12 KB/email | Moderate | Low |
| **Database (archived)** | Metadata only | ~1 KB/email | Fast | High |

## How It Works

### 📦 Archival Process

**Command:**
```bash
npm run db:storage:migrate -- --confirm --age=180
```

**Steps:**

1. **Find Old Emails**
   - Queries `conversation_messages` table
   - Filters emails older than 180 days
   - Skips already archived emails

2. **Upload to Storage**
   - HTML content → `email-archives/2025/01/message-id.html`
   - Plain text → `email-archives/2025/01/message-id.txt`
   - Path format: `YYYY/MM/message-id.{html|txt}`

3. **Verify Upload**
   - Downloads file immediately after upload
   - Confirms content matches original
   - Rolls back if verification fails

4. **Update Database**
   ```sql
   UPDATE conversation_messages SET
     storage_html_path = '2025/01/abc-123.html',
     storage_plain_path = '2025/01/abc-123.txt',
     content_html = NULL,        -- Removes content
     content_plain = NULL,        -- Removes content
     archived_at = '2025-01-13T10:30:00Z'
   WHERE id = 'abc-123';
   ```

5. **Space Saved**
   - Database row shrinks from ~30 KB to ~1 KB
   - 97% size reduction per email

### 📥 Retrieval Process (Automatic)

**Your application code doesn't change!**

```javascript
// Example: Viewing an old email in the inbox
const message = await supabase
  .from('conversation_messages')
  .select('*')
  .eq('id', messageId)
  .single();

// EmailArchiveService automatically checks:
if (message.storage_html_path && !message.content_html) {
  // Content is in storage - fetch it transparently
  message.content_html = await archiveService.downloadEmailContent(
    message.storage_html_path
  );
}

// User sees the email normally - no difference!
```

**Performance:**
- First view: ~200ms (download from storage)
- Cached views (15 min): <5ms (memory)
- Cache size: 100 most recent emails

## Setup Instructions

### Prerequisites

- Supabase project with PostgreSQL database
- Node.js 20+ installed
- Environment variables configured:
  ```bash
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_KEY=your-service-key
  SUPABASE_STORAGE_BUCKET=email-archives  # Optional, defaults to "email-archives"
  ```

### Step 1: Initialize Storage Bucket

```bash
npm run db:storage:init
```

**What this does:**
- Creates private `email-archives` bucket
- Sets file size limit to 10 MB
- Configures allowed MIME types (text/html, text/plain)
- Shows current storage stats

**Expected output:**
```
✅ Storage initialized successfully!
   Bucket name: email-archives
   Storage type: Private (requires authentication)
   Max file size: 10 MB

📊 Storage Stats:
   Files: 0
   Total size: 0.00 MB
```

### Step 2: Add Database Columns

Run this SQL in **Supabase SQL Editor**:

```sql
-- Migration: Add storage columns to conversation_messages
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS storage_html_path TEXT;

ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS storage_plain_path TEXT;

ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversation_messages_archived
ON conversation_messages(archived_at)
WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_storage_html
ON conversation_messages(storage_html_path)
WHERE storage_html_path IS NOT NULL;
```

### Step 3: Preview Migration (Dry Run)

```bash
npm run db:storage:migrate
```

**What this shows:**
- Number of emails to archive
- Estimated space savings
- No actual changes made

**Example output:**
```
📊 Counting emails older than 180 days...
   Found 5,432 old emails

   Would migrate 5,432 emails to storage
   Estimated space savings: ~157 MB

💡 Run with --confirm to execute migration
```

### Step 4: Execute Migration

```bash
npm run db:storage:migrate -- --confirm --age=180
```

**Options:**
- `--confirm`: Execute the migration (required)
- `--age=N`: Archive emails older than N days (default: 180)
- `--limit=N`: Process only N emails (for testing)

**Example output:**
```
📦 Migrating emails in batches of 50...

   Progress: 5432/5432 (100.0%)

📊 MIGRATION SUMMARY
════════════════════════════════════════════════════════════
Emails found:      5432
Uploaded:          5432
Database updated:  5432
Errors:            0

Total time:        45.3 seconds
💾 Estimated space saved: ~157 MB
```

### Step 5: Reclaim Database Space

Run in **Supabase SQL Editor**:

```sql
VACUUM FULL;
```

This physically removes the deleted content and reclaims disk space. Takes 3-5 minutes.

## Usage Commands

### Archive Old Emails

```bash
# Archive emails older than 180 days (default)
npm run db:storage:migrate -- --confirm --age=180

# Archive emails older than 90 days (more aggressive)
npm run db:storage:migrate -- --confirm --age=90

# Archive emails older than 1 year (conservative)
npm run db:storage:migrate -- --confirm --age=365

# Test with 100 emails first
npm run db:storage:migrate -- --confirm --age=180 --limit=100
```

### Preview Migration

```bash
# See what would be archived (no changes made)
npm run db:storage:migrate
```

### Check Storage Stats

```bash
npm run db:storage:init
```

Shows:
- Bucket name
- File count
- Total storage size
- Cache statistics

## Real-World Example

### Before Migration

**Database row (30 KB):**
```sql
id: "abc-123-def-456"
from_email: "lead@example.com"
subject: "Re: Your proposal"
content_html: "<html><body>...10,000 characters...</body></html>"
content_plain: "Plain text version with 2,000 characters..."
storage_html_path: NULL
storage_plain_path: NULL
archived_at: NULL
received_at: "2024-07-15T09:30:00Z"  -- 180+ days ago
```

### After Migration

**Database row (1 KB) - 30x smaller:**
```sql
id: "abc-123-def-456"
from_email: "lead@example.com"
subject: "Re: Your proposal"
content_html: NULL  ← Removed from database
content_plain: NULL  ← Removed from database
storage_html_path: "2025/01/abc-123-def-456.html"  ← Added
storage_plain_path: "2025/01/abc-123-def-456.txt"  ← Added
archived_at: "2025-01-13T10:30:00Z"
received_at: "2024-07-15T09:30:00Z"
```

**Storage files created:**
- `email-archives/2025/01/abc-123-def-456.html` (10 KB)
- `email-archives/2025/01/abc-123-def-456.txt` (2 KB)

### When User Views This Email

1. Application queries `conversation_messages` table
2. Finds `storage_html_path` is set and `content_html` is NULL
3. `EmailArchiveService` automatically downloads from storage
4. Content cached in memory for 15 minutes
5. User sees email normally - completely transparent!

## Cost Analysis

### Supabase Free Tier Limits

| Resource | Free Tier Limit | Usage Type |
|----------|----------------|------------|
| Database | 500 MB | Expensive (premium tier) |
| Storage | 1 GB | Cheap (standard tier) |

### Example: 10,000 Emails

**Without archival:**
```
10,000 emails × 30 KB = 300 MB in database
Database usage: 300 MB / 500 MB (60% of free tier)
Storage usage: 0 MB
```

**With archival:**
```
Recent emails (1,000): 1,000 × 30 KB = 30 MB in database
Archived emails (9,000): 9,000 × 1 KB = 9 MB in database
Total database: 39 MB / 500 MB (8% of free tier)

Archived content: 9,000 × 12 KB = 108 MB in storage
Storage usage: 108 MB / 1 GB (10% of free tier)
```

**Space saved: 261 MB (87% reduction!)**

### Break-Even Point

**When archival saves you money:**
- Database: $0.125/GB/month (beyond free tier)
- Storage: $0.021/GB/month (beyond free tier)

Archiving is cost-effective when you have >1,000 emails per user.

## Safety Features

### Built-in Protections

✅ **Dry-run Mode by Default**
- Preview changes before executing
- Shows exactly what will be archived
- No data modified without `--confirm` flag

✅ **Verification After Upload**
- Downloads file immediately after upload
- Confirms content matches original
- Rolls back if verification fails

✅ **Batch Processing**
- Processes 50 emails at a time
- Prevents memory issues
- Allows progress monitoring

✅ **Error Isolation**
- Failed emails don't block others
- Continues with next batch on error
- Reports all errors at end

✅ **No Data Loss**
- Content removed only after verified upload
- Database transaction ensures consistency
- Rollback on any failure

✅ **Graceful Degradation**
- If storage is down, database content used (if available)
- Cache prevents repeated storage calls
- User always sees email content

### Safety Checklist

Before running production migration:

- [ ] Tested with `--limit=100` first
- [ ] Verified archived emails load correctly in UI
- [ ] Confirmed storage bucket has proper permissions
- [ ] Backup database (Supabase auto-backup recommended)
- [ ] Monitor first migration closely
- [ ] Schedule during low-traffic period

## Maintenance Schedule

### Recommended Frequency

| System Size | Migration Frequency | Archive Age |
|-------------|---------------------|-------------|
| **Small** (<1,000 emails/month) | Quarterly | 180 days |
| **Medium** (1,000-10,000 emails/month) | Monthly | 180 days |
| **Large** (>10,000 emails/month) | Weekly | 90 days |

### Monthly Maintenance (Recommended)

```bash
# 1. Archive old emails
npm run db:storage:migrate -- --confirm --age=180

# 2. Reclaim space (in Supabase SQL Editor)
VACUUM FULL;

# 3. Check storage stats
npm run db:storage:init
```

### Quarterly Maintenance

```bash
# Optional: More aggressive archival for very old emails
npm run db:storage:migrate -- --confirm --age=365
```

## Troubleshooting

### Issue: "No old emails to migrate"

**Cause:** No emails older than threshold (180 days by default)

**Solution:** Either wait for emails to age, or reduce threshold:
```bash
npm run db:storage:migrate -- --confirm --age=90
```

### Issue: "Storage bucket not found"

**Cause:** Bucket not initialized

**Solution:**
```bash
npm run db:storage:init
```

### Issue: "Upload verification failed"

**Cause:** Storage permissions issue or network error

**Solution:**
1. Check Supabase Storage permissions
2. Verify `SUPABASE_SERVICE_KEY` has storage access
3. Check network connectivity
4. Try with `--limit=1` to test single email

### Issue: "Database size not reducing after migration"

**Cause:** PostgreSQL doesn't auto-reclaim space

**Solution:** Run `VACUUM FULL;` in Supabase SQL Editor

### Issue: "Archived emails not loading in UI"

**Cause:** `EmailArchiveService` not integrated in route

**Solution:** Ensure `retrieveMessage()` is called:
```javascript
const archiveService = new EmailArchiveService();
const message = await archiveService.retrieveMessage(dbMessage);
```

### Issue: "Storage costs too high"

**Cause:** Too many emails archived

**Solution:**
1. Increase archive age threshold (180 → 365 days)
2. Delete very old emails completely (6+ months in storage)
3. Consider implementing lifecycle policies

## API Reference

### EmailArchiveService

```javascript
const EmailArchiveService = require('./services/EmailArchiveService');
const archiveService = new EmailArchiveService();
```

#### Methods

**`initializeBucket()`**
```javascript
const result = await archiveService.initializeBucket();
// Returns: { success: true } or { error: Error }
```

**`uploadEmailContent(messageId, contentHtml, contentPlain)`**
```javascript
const result = await archiveService.uploadEmailContent(
  'abc-123',
  '<html>...</html>',
  'Plain text...'
);
// Returns: { htmlPath: '2025/01/abc-123.html', plainPath: '2025/01/abc-123.txt' }
// Or: { error: Error }
```

**`downloadEmailContent(storagePath)`**
```javascript
const content = await archiveService.downloadEmailContent('2025/01/abc-123.html');
// Returns: String content or null
```

**`retrieveMessage(message)`**
```javascript
// Automatically fetches from storage if needed
const fullMessage = await archiveService.retrieveMessage(dbMessage);
// Returns: Message object with content populated
```

**`getStorageStats()`**
```javascript
const stats = await archiveService.getStorageStats();
// Returns: {
//   bucketName: 'email-archives',
//   fileCount: 5432,
//   totalSize: '157.3 MB',
//   cacheSize: 45,
//   cacheMaxSize: 100
// }
```

**`clearCache()`**
```javascript
archiveService.clearCache();
// Clears in-memory cache
```

## Integration Examples

### Example 1: Inbox Route

```javascript
// routes/inbox.js
const EmailArchiveService = require('../services/EmailArchiveService');
const archiveService = new EmailArchiveService();

router.get('/api/inbox/conversations/:conversationId/messages', async (req, res) => {
  // Fetch messages from database
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('received_at', { ascending: true });

  // Automatically fetch archived content
  const fullMessages = await Promise.all(
    messages.map(msg => archiveService.retrieveMessage(msg))
  );

  res.json({ messages: fullMessages });
});
```

### Example 2: Manual Archival

```javascript
// Manually archive a specific message
const message = await supabase
  .from('conversation_messages')
  .select('*')
  .eq('id', messageId)
  .single();

const result = await archiveService.archiveMessage(message);

if (result.error) {
  console.error('Archive failed:', result.error);
} else {
  console.log('Archived to:', result.storage_html_path);

  // Update database
  await supabase
    .from('conversation_messages')
    .update({
      storage_html_path: result.storage_html_path,
      storage_plain_path: result.storage_plain_path,
      content_html: null,
      content_plain: null,
      archived_at: new Date().toISOString()
    })
    .eq('id', messageId);
}
```

### Example 3: Lifecycle Policy (Advanced)

```javascript
// Delete emails from storage after 2 years
const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);

const { data: veryOldMessages } = await supabase
  .from('conversation_messages')
  .select('id, storage_html_path, storage_plain_path')
  .not('archived_at', 'is', null)
  .lt('archived_at', twoYearsAgo.toISOString());

for (const message of veryOldMessages) {
  // Delete from storage
  if (message.storage_html_path) {
    await archiveService.deleteArchivedContent(message.storage_html_path);
  }
  if (message.storage_plain_path) {
    await archiveService.deleteArchivedContent(message.storage_plain_path);
  }

  // Delete database record (or keep minimal metadata)
  await supabase
    .from('conversation_messages')
    .delete()
    .eq('id', message.id);
}

console.log(`Deleted ${veryOldMessages.length} very old messages`);
```

## Performance Considerations

### Cache Strategy

**In-Memory Cache:**
- Size: 100 emails
- TTL: 15 minutes
- Eviction: LRU (Least Recently Used)

**Cache Hit Rate:**
- Expected: 70-80% for active conversations
- Benefit: 40x faster retrieval (~5ms vs ~200ms)

### Optimization Tips

1. **Pre-warm cache for active users:**
   ```javascript
   // Load recent archived emails into cache
   const recentArchived = await supabase
     .from('conversation_messages')
     .select('storage_html_path')
     .not('storage_html_path', 'is', null)
     .order('archived_at', { ascending: false })
     .limit(50);

   for (const msg of recentArchived) {
     await archiveService.downloadEmailContent(msg.storage_html_path);
   }
   ```

2. **Batch retrieval:**
   ```javascript
   // Fetch multiple archived emails in parallel
   const archivedMessages = messages.filter(m => m.storage_html_path);
   await Promise.all(
     archivedMessages.map(m => archiveService.retrieveMessage(m))
   );
   ```

3. **Index optimization:**
   ```sql
   -- Already created during setup
   CREATE INDEX idx_conversation_messages_archived
   ON conversation_messages(archived_at)
   WHERE archived_at IS NOT NULL;
   ```

## Best Practices

### ✅ Do

- Run migrations during low-traffic periods
- Test with `--limit` flag first
- Monitor first migration closely
- Keep recent emails (<90 days) in database
- Use caching for frequently accessed emails
- Run VACUUM FULL after large migrations
- Schedule regular monthly migrations

### ❌ Don't

- Archive very recent emails (<30 days)
- Skip verification step
- Run multiple migrations simultaneously
- Forget to run VACUUM FULL
- Delete storage files without updating database
- Archive emails users access frequently

## Migration Strategies

### Conservative (Recommended for Production)

```bash
# Archive only emails older than 6 months
npm run db:storage:migrate -- --confirm --age=180

# Run monthly
```

**Benefits:**
- Safe - emails users rarely access
- Predictable performance
- Lower risk

### Aggressive (High-Volume Systems)

```bash
# Archive emails older than 3 months
npm run db:storage:migrate -- --confirm --age=90

# Run weekly
```

**Benefits:**
- Maximizes database space
- Better for high-volume systems
- More frequent maintenance

### Custom (Enterprise)

```bash
# Archive emails older than 1 year
npm run db:storage:migrate -- --confirm --age=365

# Run quarterly
```

**Benefits:**
- Minimal impact on performance
- Suitable for compliance requirements
- Long-term archival strategy

## Monitoring

### Key Metrics

**Database Size:**
```sql
SELECT pg_database_size(current_database()) / 1024 / 1024 AS size_mb;
```

**Archived Email Count:**
```sql
SELECT COUNT(*)
FROM conversation_messages
WHERE archived_at IS NOT NULL;
```

**Storage Usage:**
```javascript
const stats = await archiveService.getStorageStats();
console.log('Storage:', stats.totalSize);
console.log('Files:', stats.fileCount);
```

**Cache Performance:**
```javascript
console.log('Cache size:', archiveService.cache.size);
console.log('Cache max:', archiveService.cacheMaxSize);
```

## Support

### Documentation Files

- `EMAIL_STORAGE.md` (this file)
- `CLAUDE.md` - General project documentation
- `backend/src/services/EmailArchiveService.js` - Service implementation
- `backend/scripts/migrate-emails-to-storage.js` - Migration script
- `config/migrations/20250113_add_storage_columns.sql` - Database schema

### Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run db:storage:init` | Initialize storage bucket |
| `npm run db:storage:migrate` | Preview migration (dry run) |
| `npm run db:storage:migrate -- --confirm --age=180` | Execute migration |
| `npm run db:storage:migrate -- --confirm --age=180 --limit=100` | Test with 100 emails |
| `VACUUM FULL;` | Reclaim disk space (run in SQL editor) |

---

## Summary

The Email Storage System is a production-ready solution for managing email content at scale:

✅ **Automatic archival** of old emails to cheap object storage
✅ **Transparent retrieval** - no application code changes needed
✅ **97% size reduction** - from 30 KB to 1 KB per email
✅ **In-memory caching** - 40x faster retrieval for active emails
✅ **Safe migration** - verification, batching, rollback on errors
✅ **Cost-effective** - leverage Supabase Storage free tier

Run monthly migrations to keep your database lean while preserving all email data!
