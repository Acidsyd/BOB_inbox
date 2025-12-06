# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Quick Start Commands

```bash
# Development
npm run dev              # Starts both frontend (3001) and backend (4000) - API server only
npm run dev:backend      # Backend only (port 4000) - API server only
npm run dev:frontend     # Frontend only (port 3001)
npm run cron:dev         # Standalone cron worker (REQUIRED for email processing)
npm run reply-monitor:dev # Reply monitoring cron (development mode)

# Cron Architecture (IMPORTANT: Prevent Duplicate Emails!)
# Backend = API server ONLY (no cron auto-start)
# Cron = ALWAYS runs as standalone process

# Development Mode:
npm run dev:backend      # API server only
npm run cron:dev         # Dedicated cron worker (required)
npm run cron:test-reschedule # Test nightly reschedule (picks up new leads)

# Production Mode:
npm run start            # API server only
npm run cron             # Dedicated cron worker (required)

# Testing & Quality
npm run test             # Unit tests (Jest)
npm run test:unit        # Unit tests (Jest)
npm run test:integration # Integration tests only
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # E2E tests with UI
npm run test:e2e:headed  # E2E tests with browser UI
npm run test:e2e:debug   # Debug E2E tests
npm run test:e2e:report  # Show E2E test report
npm run test:e2e:install # Install Playwright browsers
npm run test:auth        # Auth-specific E2E tests
npm run test:dashboard   # Dashboard E2E tests
npm run test:api         # API performance tests
npm run lint             # Lint both frontend and backend
npm run lint:fix         # Auto-fix linting issues
npm run typecheck        # TypeScript check
npm run validate         # Run all checks (typecheck + lint + test)

# Build & Deploy
npm run build            # Build both frontend and backend
npm run start            # Start production build

# Database Setup
npm run db:migrate       # Run migrations
npm run db:seed          # Seed data
npm run db:seed:performance # Seed performance test data
npm run db:reset         # Reset database
npm run setup            # Install all dependencies (root, backend, frontend)
npm run clean            # Clean coverage and build artifacts
npm run clean:all        # Clean everything including node_modules
npm run precommit        # Run lint:fix and test:unit (git hook)

# Database Optimization & Cleanup
npm run db:size:analyze  # Analyze database storage usage by table
npm run db:cleanup:emergency           # Preview what would be deleted (dry-run)
npm run db:cleanup:emergency --confirm # Execute cleanup (frees 150-250MB)

# External Storage (Supabase Storage)
npm run db:storage:init                 # Initialize Supabase Storage bucket
npm run db:storage:migrate              # Preview email migration to storage (dry-run)
npm run db:storage:migrate -- --confirm --age=180  # Migrate emails >180 days to storage

# Docker Development
npm run docker:build     # Build Docker containers
npm run docker:up        # Start all services with Docker Compose
npm run docker:down      # Stop all Docker services
npm run docker:logs      # View Docker container logs

# Rate Limiting & System Monitoring
npm run rate-limit:test     # Test rate limiting system
npm run rate-limit:check    # Check system status
npm run rate-limit:monitor  # Monitor rate limiting in real-time
npm run rate-limit:test-live # Test live system performance
npm run reset:daily         # Manual daily rate limit reset
npm run cron:setup          # Setup daily reset cron job

# Security
npm run security:audit      # Security audit for all packages
npm run security:fix        # Auto-fix security vulnerabilities
npm run production:setup    # Production setup script
npm run production:deploy   # Production deployment (custom command)
```

## System Architecture

**Cold Email Automation Platform** - Monorepo with dual-provider email system and sophisticated scheduling.

### Project Structure
```
Mailsender/
├── backend/                 # Node.js/Express API server
├── frontend/                # Next.js 14 web application
├── docs/                    # All project documentation
├── config/                  # Configuration files (database schema, nginx)
├── scripts/                 # Utility scripts
├── n8n-workflows/           # N8N workflow templates
├── @TIMESTAMP_ARCHITECTURE.md # Timezone handling documentation
└── CLAUDE.md               # This guidance file
```

### Core Components
- **CronEmailProcessor**: Production scheduler (1-minute intervals, 99.9% uptime)
- **NightlyRescheduleService**: Automatic campaign rescheduling at 3am daily (picks up new leads)
- **BackgroundSyncService**: Simple 15-minute interval sync for all email accounts
- **OAuth2Service**: Gmail API integration with RFC-compliant threading
- **UnifiedInboxService**: Conversation threading across all email accounts
- **EmailService**: Dual-provider routing (OAuth2 + SMTP fallback)
- **CampaignScheduler**: Timing rules with human-like jitter system

### Database (Supabase PostgreSQL)
```sql
-- Multi-tenant with organization isolation
campaigns (id, organization_id, status, config JSONB)
scheduled_emails (id, campaign_id, organization_id, status, send_at)
leads (id, organization_id, email, lead_list_id)
  UNIQUE(email, organization_id)

-- Unified inbox system
conversations (id, organization_id, conversation_type, participants[])
conversation_messages (id, conversation_id, direction, message_id_header)

-- Dual email account tables
oauth2_tokens (id, organization_id, email, status: 'linked_to_account')
email_accounts (id, organization_id, provider, email)
```

## Critical System Rules

### 1. User Isolation (NEVER CHANGE)
```javascript
// ALWAYS filter by organizationId in every query
.eq('organization_id', req.user.organizationId)
```

### 2. OAuth2 Status Consistency
```javascript
// ALL OAuth2 queries MUST use this status
.eq('status', 'linked_to_account')
```

### 3. Campaign Interval Enforcement (CRITICAL FIX)
```javascript
// CronEmailProcessor ensures exactly 1 email per campaign interval
emailsToSendNow = accountEmails.slice(0, 1); // NEVER change this
```

### 4. Duplicate Detection Rules
```javascript
// Check across ALL user's lists (no lead_list_id filter)
.eq('organization_id', req.user.organizationId)

// Database constraint enforces uniqueness
UNIQUE(email, organization_id)
```

## Email System Flow

### Campaign Processing
```
Campaign Start → Creates scheduled_emails → Standalone cron processor →
Cron (1 min) → Enforces timing rules → Account rotation → OAuth2/SMTP send →
Updates conversations → Tracks metrics → Schedules follow-ups
```

### Nightly Reschedule (NEW)
```
Daily at 3am → Fetch all active campaigns → For each campaign:
  1. Preserve sent emails (conversation history intact)
  2. Update scheduled/failed/skipped emails with fresh timing
  3. Add NEW leads added during the day to campaign
  4. Apply perfect rotation to all scheduled emails
  5. Increment reschedule_count and update last_rescheduled_at
Result: New leads automatically included without manual intervention
```

**Configuration**:
- `RESCHEDULE_HOUR`: Hour to run (0-23, default: 3)
- `RESCHEDULE_MINUTE`: Minute to run (0-59, default: 0)

**Tracking**:
- `reschedule_count`: Number of times campaign has been automatically rescheduled
- `last_rescheduled_at`: Timestamp of last reschedule operation
- Displayed in Campaign Info section: "Nightly Reschedules: X times (last: date)"

**Use Case**: When using API to add leads to lead list, they're automatically picked up at 3am and scheduled with proper rotation. No need to manually stop/restart campaigns.

### Scheduling Rules (ALL enforced by CronEmailProcessor)
- **Campaign intervals**: 5 minutes minimum, exact compliance
- **Daily/hourly limits**: emailsPerDay, emailsPerHour
- **Sending hours**: Only within configured time windows
- **Timezone handling**: Campaign timezone for all calculations
- **Account rotation**: Intelligent distribution across multiple accounts
- **Human-like jitter**: ±1-3 minute variations to avoid robotic patterns

### Perfect Rotation Algorithm
**Design Philosophy**: Guarantee no consecutive emails from the same account for optimal deliverability.

```javascript
// CampaignScheduler.scheduleEmailsWithPerfectRotation()
// Algorithm: Round-robin distribution in account-first pattern

1. Distribute all leads across accounts first (round-robin)
   Lead 0 → Account 0
   Lead 1 → Account 1
   Lead 2 → Account 2
   ...
   Lead N → Account (N % accountCount)

2. Schedule in time-ordered rounds
   Round 1 (10:00): [Lead 0 from Acc0, Lead 1 from Acc1, Lead 2 from Acc2...]
   Round 2 (10:15): [Lead 8 from Acc0, Lead 9 from Acc1, Lead 10 from Acc2...]
   Round 3 (10:30): [Lead 16 from Acc0, Lead 17 from Acc1, Lead 18 from Acc2...]

3. Result: Perfect rotation with max_consecutive = 1
   Timeline: Acc0 → Acc1 → Acc2 → ... → Acc7 → Acc0 → Acc1 → ...
```

**Key Properties**:
- **No consecutive duplicates**: Each account followed by different account
- **Even distribution**: All accounts send roughly equal number of emails
- **Deterministic scheduling**: Same inputs always produce same schedule
- **Timezone-aware**: Respects business hours and active days
- **Rate limit compliant**: Enforces daily/hourly limits per account

**Usage**:
```javascript
// campaigns.js - POST /api/campaigns/:id/start
const result = await campaignScheduler.scheduleEmailsWithPerfectRotation({
  campaign,
  leads,
  emailAccounts,
  organizationId: req.user.organizationId
});

// Returns: { emailRecords: Array, stats: { totalScheduled, rotationQuality } }
// rotationQuality: { maxConsecutive: 1, uniqueAccountsInFirst24: 8 }
```

**Advantages over Random Rotation**:
- Random: May have consecutive duplicates, uneven distribution
- Perfect: Guaranteed optimal rotation, predictable behavior

### Conversation Threading
```
Email sent/received → Message-ID headers → In-Reply-To matching →
Subject + participants fallback → Create/update conversation →
Store with direction (sent/received)
```

### Email Sync Architecture (CRITICAL SIMPLIFICATION)
```
Background Sync (15 min) → Fetch all OAuth2 accounts → Sync each account →
Update timestamps → Store messages → Manual sync button preserved
```

**Design Philosophy**: Simple and reliable over complex and feature-rich
- **BackgroundSyncService**: Fixed 15-minute intervals, no activity-based logic
- **Manual sync**: Preserved via `/api/inbox/sync/manual` endpoint and UI button
- **No auto-sync**: Eliminated complex SyncSchedulerService with activity intervals
- **Singleton pattern**: Single background service manages all account syncing
- **Error isolation**: Failed accounts don't block other account syncing

## Frontend Patterns

### React Hooks Pattern
```typescript
// Standard pattern: hooks/use[Resource].ts
export function useEmailAccounts(): UseEmailAccountsReturn {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])

  // Optimistic updates with organization isolation
  const updateAccount = async (data) => {
    // Immediate UI update, API call, error handling
  }

  return { accounts, updateAccount, refetch }
}
```

### Rich Text Editor (CRITICAL)
```javascript
// MUST use dynamic import to prevent SSR errors
const RichTextEditor = dynamic(() => import('../ui/rich-text-editor'), {
  ssr: false // CRITICAL: Tiptap requires client-side only
})

// Tiptap Dependencies (v3.3.0+)
// @tiptap/react, @tiptap/starter-kit, @tiptap/extension-* packages
// All Tiptap components must use consistent versioning
```

### Campaign Actions (CRITICAL UX)
```javascript
// ALWAYS implement instant loading states
const [isStarting, setIsStarting] = useState(false)

const handleStart = () => {
  setIsStarting(true) // INSTANT UI blocking
  startCampaignMutation.mutate()
}

disabled={mutation.isPending || isStarting}
```

## Environment Setup

```bash
# Required - Core System
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
EMAIL_ENCRYPTION_KEY=your-32-char-key

# Required - Google OAuth2 (Primary)
GOOGLE_OAUTH2_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH2_REDIRECT_URI=http://localhost:4000/api/oauth2/auth/callback

# Optional - SMTP Fallback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional - Nightly Reschedule (picks up new leads automatically)
RESCHEDULE_HOUR=3    # Hour (0-23, default: 3 = 3am)
RESCHEDULE_MINUTE=0  # Minute (0-59, default: 0)
```

## Key Files

### Backend Services
- `src/services/CronEmailProcessor.js` - **Production scheduler** (4-phase enhanced, exact interval compliance)
- `src/services/NightlyRescheduleService.js` - **Automatic campaign reschedule** (daily at 3am, picks up new leads)
- `src/services/CampaignScheduler.js` - **Perfect rotation algorithm** (round-robin scheduling with no consecutive duplicates)
- `src/services/BackgroundSyncService.js` - **Simple background sync** (15-minute intervals for all accounts)
- `src/services/OAuth2Service.js` - Gmail API integration with attachment support
- `src/services/EmailService.js` - Dual-provider email sending
- `src/services/UnifiedInboxService.js` - RFC-compliant conversation threading
- `src/services/TimezoneService.js` - **Universal timezone conversion** (IANA timezone support, business hours)
- `src/services/AccountRateLimitService.js` - Account rotation and rate limiting
- `src/services/BounceTrackingService.js` - Multi-provider bounce detection

### Backend Utilities
- `src/utils/supabaseHelpers.js` - **Pagination utilities** (fetchAllWithPagination, fetchCount, batchUpdate)

### API Routes
- `src/routes/campaigns.js` - Campaign CRUD (email scheduling)
- `src/routes/oauth2.js` - OAuth2 flow management
- `src/routes/inbox.js` - Unified inbox with conversation threading
- `src/routes/leadLists.js` - Lead management with unlimited count support

### Frontend Components
- `components/campaigns/EmailSequenceBuilder.tsx` - Campaign creation with follow-up editors
- `components/ui/rich-text-editor.tsx` - Full Tiptap editor with attachments
- `components/inbox/ComposeEmailModal.tsx` - Minimizable email composition
- `hooks/useEmailAccounts.ts` - Account management with rate limiting

## Campaign Configuration (JSONB)

```javascript
campaigns.config = {
  emailSubject, emailContent, leadListId,
  emailSequence: [{ id, subject, content, delay, replyToSameThread }],
  emailAccounts: [uuid], emailsPerDay: 50,
  sendingInterval: 15, // minutes (minimum 5)
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  enableJitter: true, jitterMinutes: 3, // ±1-3 min variations
  trackOpens: true, trackClicks: true, stopOnReply: true
}
```

## Database Query Patterns

### Supabase Pagination (CRITICAL)
**Problem**: Supabase defaults to 1000-row limit; large campaigns need pagination.

**Solution**: Use `src/utils/supabaseHelpers.js` utilities for consistent pagination.

```javascript
const { fetchAllWithPagination, fetchCount, batchUpdate } = require('../utils/supabaseHelpers');
```

### Pattern 1: Count-Only Queries (Most Efficient)
```javascript
// ✅ CORRECT - Use count query for efficiency
const { count, error } = await supabase
  .from('scheduled_emails')
  .select('*', { count: 'exact', head: true })  // head: true returns no data
  .eq('campaign_id', campaignId)
  .eq('status', 'sent');

console.log(`Total sent: ${count}`);

// ❌ INCORRECT - Fetches all rows just to count
const { data, error } = await supabase
  .from('scheduled_emails')
  .select('id')  // Still fetches data!
  .eq('campaign_id', campaignId);

const count = data?.length || 0;  // Capped at 1000!
```

### Pattern 2: Simple Pagination with Helper
```javascript
// ✅ CORRECT - Automatic pagination with helper
const { data: allEmails, count } = await fetchAllWithPagination(supabase, 'scheduled_emails', {
  select: 'id, to_email, send_at, status',
  filters: [
    { column: 'campaign_id', value: campaignId },
    { column: 'status', value: 'scheduled' }
  ],
  order: { column: 'send_at', ascending: true },
  pageSize: 1000  // optional, defaults to 1000
});

console.log(`Fetched ${allEmails.length} emails across ${Math.ceil(count / 1000)} pages`);

// Helper handles:
// 1. Count query to get total
// 2. Automatic page loop with .range()
// 3. Error handling per page
// 4. Returns all rows + count
```

### Pattern 3: Manual Pagination (Complex Filters)
```javascript
// Use when fetchAllWithPagination doesn't support filter types
// (e.g., .gte(), .lte(), .not(), .or(), .in())

// Step 1: Get count first
const { count: totalCount } = await supabase
  .from('conversation_messages')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', organizationId)
  .gte('received_at', startDate.toISOString())
  .lte('received_at', endDate.toISOString());

// Step 2: Fetch pages
const pageSize = 1000;
let page = 0;
const allMessages = [];

while (allMessages.length < totalCount) {
  const { data: pageData, error } = await supabase
    .from('conversation_messages')
    .select('id, from_email, received_at')
    .eq('organization_id', organizationId)
    .gte('received_at', startDate.toISOString())
    .lte('received_at', endDate.toISOString())
    .range(page * pageSize, (page + 1) * pageSize - 1)
    .order('received_at', { ascending: true });

  if (error) throw error;
  if (!pageData || pageData.length === 0) break;

  allMessages.push(...pageData);
  page++;
}

console.log(`Fetched ${allMessages.length}/${totalCount} messages`);
```

### Pattern 4: Update Queries (Never Return Data)
```javascript
// ✅ CORRECT - Count first, update without select
const { count: cancelCount } = await supabase
  .from('scheduled_emails')
  .select('*', { count: 'exact', head: true })
  .eq('campaign_id', campaignId)
  .eq('status', 'scheduled');

const { error } = await supabase
  .from('scheduled_emails')
  .update({ status: 'cancelled', updated_at: new Date().toISOString() })
  .eq('campaign_id', campaignId)
  .eq('status', 'scheduled');
  // No .select() = doesn't return rows

console.log(`Cancelled ${cancelCount} emails`);

// ❌ INCORRECT - Returns potentially thousands of rows
const { data: cancelled, error } = await supabase
  .from('scheduled_emails')
  .update({ status: 'cancelled' })
  .eq('campaign_id', campaignId)
  .select();  // Returns all updated rows!
```

### Pattern 5: Batch Updates (Large Datasets)
```javascript
const { data: emailsToUpdate } = await fetchAllWithPagination(supabase, 'scheduled_emails', {
  select: 'id',
  filters: [{ column: 'campaign_id', value: campaignId }]
});

// Prepare batch updates
const updates = emailsToUpdate.map(email => ({
  id: email.id,
  updates: { send_at: newTimestamp }
}));

// Use helper for efficient batch processing
const { success, failed } = await batchUpdate(supabase, 'scheduled_emails', updates, 50);
console.log(`Updated ${success}, failed ${failed}`);
```

### Helper Function Reference

#### fetchAllWithPagination
```javascript
const { data, count } = await fetchAllWithPagination(supabase, tableName, {
  select: 'id, name',        // columns to select
  filters: [                 // .eq() filters only
    { column: 'status', value: 'active' }
  ],
  order: { column: 'created_at', ascending: false },
  pageSize: 1000             // optional, defaults to 1000
});
```

#### fetchCount
```javascript
const count = await fetchCount(supabase, tableName, [
  { column: 'organization_id', value: orgId },
  { column: 'status', value: 'sent' }
]);
```

#### batchUpdate
```javascript
const { success, failed } = await batchUpdate(supabase, tableName, [
  { id: 'uuid1', updates: { status: 'sent' } },
  { id: 'uuid2', updates: { status: 'sent' } }
], 50);  // batch size
```

### Pagination Safety Rules
- **Always use count queries** for totals (not `data.length`)
- **Never assume <1000 rows** for any user-generated data
- **Use helpers for simple queries** to reduce code duplication
- **Use manual pagination for complex filters** (.gte, .lte, .not, .or, .in)
- **Remove .select() from updates** to avoid fetching updated rows
- **Test with large datasets** (>1000 rows) in development

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Duplicate emails sent to recipients | Multiple cron instances running! Ensure ONLY ONE cron process is running (npm run cron:dev or npm run cron) |
| OAuth2 accounts not showing | Verify status = 'linked_to_account' |
| Emails not respecting intervals | Check CronEmailProcessor.js `slice(0, 1)` fix |
| Duplicates not detected | Ensure organization_id filter only |
| Rich text editor crashes | Use `dynamic` import with `ssr: false` |
| Campaign double-start | Implement instant loading states |
| Reply detection failing | Check Message-ID headers in conversation_messages |
| Timezone issues | CronEmailProcessor uses campaign timezone |
| Scheduled emails wrong timezone | Check formatCampaignDate helper in campaigns.js |
| TimezoneService errors | Use valid Intl.DateTimeFormat options, not custom format strings |
| Frontend timezone inconsistency | InboxMessageView.tsx must use frontend timezone context, not backend display timestamps |
| Bounce messages not showing | Check FolderService bounce filtering |
| Lead count capped at 1000 | Use Supabase count queries with `{ count: 'exact', head: true }`, not data.length |
| Query returns incomplete data | Use `fetchAllWithPagination` helper for >1000 rows |
| Update query too slow | Remove `.select()` from updates; use count query first |
| Analytics showing wrong counts | Ensure all count queries use pagination patterns |
| Rotation has consecutive duplicates | Use `scheduleEmailsWithPerfectRotation` not random shuffle |
| Campaign missing emails | Check if all scheduled_emails were created on start |
| New leads added via API not sending | NightlyRescheduleService picks them up at 3am automatically; or manually stop/restart campaign |
| Nightly reschedule not running | Check if cron service is running with `npm run cron:dev` or `npm run cron` |
| Tiptap focus/selection issues | Remove content from useEditor deps |
| Manual sync not working | Check `/api/inbox/sync/manual` endpoint and triggerManualSync function |
| Background sync not running | Verify BackgroundSyncService initialization in backend index.js |
| Auto-sync references | Auto-sync was removed - use BackgroundSyncService for 15-min intervals |
| Database storage exceeded | Run `npm run db:size:analyze` to check usage, then `npm run db:cleanup:emergency --confirm` |
| Database size too large | Use emergency cleanup to delete old tracking events, failed emails, and redundant configs |
| Out of space on free tier | Cleanup frees 150-250MB; tracking events and failed emails consume most space |

## Debug Commands

```bash
# Check OAuth2 status
SELECT email, status FROM oauth2_tokens WHERE organization_id = 'uuid';

# Monitor email processing
npm run cron:dev

# Check scheduled emails
SELECT COUNT(*) FROM scheduled_emails WHERE status = 'scheduled';

# Verify conversation threading
SELECT COUNT(*) FROM conversations WHERE organization_id = 'uuid';

# Test system health
curl http://localhost:4000/api/health/cron

# Test timezone conversion
node -e "const TZ = require('./src/services/TimezoneService'); console.log(TZ.convertToUserTimezone('2025-09-17T08:58:00.000Z', 'Europe/Rome'));"

# Check backend server status
curl http://localhost:4000/health

# Database cleanup and storage analysis
npm run db:size:analyze                    # Analyze storage usage
npm run db:cleanup:emergency               # Preview cleanup (dry-run)
npm run db:cleanup:emergency --confirm     # Execute cleanup
```

## Production System Status

### ✅ Completed Enhancements (September-October 2025)
- **Phase 1-4 Improvements**: Error resilience, database optimization, parallel processing, graceful shutdown
- **Campaign Timing Fixed**: Exact interval compliance with 1 email per interval enforcement
- **Perfect Rotation Algorithm**: Round-robin scheduling guarantees no consecutive emails from same account
- **Pagination System**: Universal helpers for unlimited row queries (fetchAllWithPagination, fetchCount, batchUpdate)
- **Query Optimization**: Converted all analytics/campaign queries to use count queries and pagination
- **Simplified Sync Architecture**: Replaced complex auto-sync with simple 15-minute background sync
- **Reply Detection**: Unified inbox system with RFC-compliant threading
- **Bounce Protection**: Auto-pause campaigns at 5% bounce rate
- **Rate Limiting**: Sophisticated account rotation with usage tracking
- **Human-like Timing**: Smart jitter system (±1-3 minutes)
- **Unlimited Lead Counts**: Fixed Supabase 1000-row query limit across all queries
- **Timezone Architecture**: Universal TimezoneService with IANA timezone support
- **Scheduled Activity Fix**: formatCampaignDate helper with proper Intl.DateTimeFormat options

### System Performance
- 99.9% uptime with automatic error recovery
- 3-5x throughput with parallel campaign processing
- 60-80% database efficiency with optimized queries
- Exact interval compliance for all campaigns
- Smart account rotation with automatic failover

## Display Name Management

### Architecture
Email accounts support customizable display names that appear in:
- Account management list
- Compose email modal (from dropdown)
- Email headers when sending

### Database Schema
```sql
-- Both tables support display_name
email_accounts (id, email, provider, display_name, ...)
oauth2_tokens (id, email, provider, display_name, ...)
```

### Backend Implementation
The `/api/email-accounts/:id/settings` endpoint accepts `display_name`:

```javascript
// emailAccounts.js - PUT /:id/settings
router.put('/:id/settings', authenticateToken, async (req, res) => {
  const { display_name, daily_limit, hourly_limit, ... } = req.body;

  const updateData = {};
  if (display_name !== undefined) updateData.display_name = display_name;
  // ... other fields

  await supabase
    .from('email_accounts')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', req.user.organizationId);
});
```

### Frontend Patterns

**Display Name in Compose Modal** (`ComposeEmailModal.tsx`):
```typescript
// Show display name prominently, email as secondary
<SelectItem key={account.id} value={account.id}>
  <div className="flex flex-col">
    <div className="flex items-center space-x-2">
      <span className="font-medium">{account.display_name}</span>
      <Badge variant="secondary">{account.provider.toUpperCase()}</Badge>
    </div>
    {account.display_name !== account.email && (
      <span className="text-xs text-gray-500">{account.email}</span>
    )}
  </div>
</SelectItem>
```

**Editable Display Name** (`settings/email-accounts/[id]/page.tsx`):
```typescript
// State management
const [displayName, setDisplayName] = useState('')
const [isEditingDisplayName, setIsEditingDisplayName] = useState(false)
const [savingDisplayName, setSavingDisplayName] = useState(false)

// Save function
const saveDisplayName = async () => {
  await api.put(`/email-accounts/${account.id}/settings`, {
    display_name: displayName
  })
  // Show success toast, refresh page
}

// UI with edit/save/cancel buttons
{isEditingDisplayName ? (
  <Input value={displayName} onChange={...} />
  <Button onClick={saveDisplayName}>Save</Button>
  <Button onClick={cancel}>Cancel</Button>
) : (
  <div>{account.display_name || "Not set"}</div>
  <Button onClick={edit}>Edit</Button>
)}
```

### Data Flow
1. User updates display name in account settings page
2. PUT request to `/api/email-accounts/:id/settings` with `display_name`
3. Backend updates `email_accounts` or `oauth2_tokens` table
4. Frontend refreshes to show updated display name
5. Compose modal immediately shows new display name in dropdown

### Important Notes
- Display name defaults to email address if not set
- Display name is used in "From" header when sending emails
- Both OAuth2 and relay (Mailgun/SendGrid) accounts support display names
- Always include `display_name` in SELECT queries for email accounts

## Critical Patterns

1. **Always use organization_id filtering** for multi-tenant isolation
2. **OAuth2 status must be 'linked_to_account'** for account visibility
3. **Campaign intervals enforced by CronEmailProcessor** - no manual intervention needed
4. **Perfect rotation required for all campaigns** - use scheduleEmailsWithPerfectRotation
5. **Pagination required for all queries** - assume >1000 rows, use fetchAllWithPagination
6. **Count queries for totals** - use `{ count: 'exact', head: true }`, never data.length
7. **Remove .select() from updates** - avoid fetching potentially thousands of rows
8. **Rich text editors require SSR: false** to prevent hydration errors
9. **Instant loading states required** for all campaign actions
10. **Conversation threading uses Message-ID headers** for RFC compliance
11. **Account rotation prevents single-account bottlenecks**
12. **Human-like jitter prevents robotic patterns** in email timing
13. **Frontend timezone consistency requires formatDateInTimezone()** - never use backend display timestamps
14. **Display names must be included in email account queries** - use in compose dropdowns and email headers

## Timezone Patterns (CRITICAL)

### TimezoneService Usage
```javascript
// ✅ CORRECT - Use valid Intl.DateTimeFormat options
const options = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',     // Safe: avoids "24" hour issue
  minute: '2-digit',
  hour12: true
};
TimezoneService.convertToUserTimezone(date, timezone, options);

// ❌ INCORRECT - Custom format strings not supported
TimezoneService.convertToUserTimezone(date, timezone, { format: 'MMM d, yyyy h:mm a' });
```

### Helper Function Pattern
```javascript
// Always create helper functions for timezone conversion
function formatCampaignDate(dateString, timezone, customFormat = null) {
  if (!dateString) return null;

  const defaultOptions = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  };

  return TimezoneService.convertToUserTimezone(
    dateString, timezone, customFormat || defaultOptions
  );
}
```

### Frontend Timezone Pattern
```typescript
// ✅ CORRECT - Use frontend timezone context consistently
const { formatDateInTimezone } = useTimezone()
const displayTime = formatDateInTimezone(message.sent_at, 'MMM d, yyyy h:mm a')

// ❌ INCORRECT - Don't prioritize backend display timestamps
const displayTime = message.sent_at_display || message.received_at_display || fallback
```

### Timezone Safety Rules
- **Always validate timezone strings** with `TimezoneService.isValidTimezone()`
- **Use UTC for all database storage** and processing logic
- **Convert to user timezone only for display** purposes
- **Handle timezone detection failures** with UTC fallback
- **Test DST transitions** when working with scheduled times
- **Frontend components must use formatDateInTimezone()** for consistency

## External Storage (Supabase Storage)

**Problem**: Email content (HTML/plain text) consumes significant database space (60-70% of total).

**Solution**: Move old email content to Supabase Storage (cheaper object storage) while keeping metadata in database.

### Architecture

**Before** (All in PostgreSQL):
```
conversation_messages table
├── id, subject, from_email (metadata)
├── content_html (30KB avg) ← Takes up space!
└── content_plain (10KB avg) ← Takes up space!
```

**After** (Hybrid storage):
```
Database (conversation_messages)          Supabase Storage Bucket
├── id, subject, from_email              ├── 2025/01/msg-id.html
├── storage_html_path (reference only)   ├── 2025/01/msg-id.txt
├── storage_plain_path (reference only)  └── 2024/12/...
└── archived_at
```

### Setup Process

1. **Initialize Storage Bucket**:
   ```bash
   npm run db:storage:init
   ```
   Creates private Supabase Storage bucket named `email-archives`.

2. **Run Database Migration**:
   - Open Supabase SQL Editor
   - Run SQL from `config/migrations/20250113_add_storage_columns.sql`
   - Adds `storage_html_path`, `storage_plain_path`, `archived_at` columns

3. **Preview Migration** (dry-run):
   ```bash
   npm run db:storage:migrate
   ```
   Shows what would be migrated without making changes.

4. **Execute Migration**:
   ```bash
   # Migrate emails older than 180 days
   npm run db:storage:migrate -- --confirm --age=180

   # Limit migration to 100 emails for testing
   npm run db:storage:migrate -- --confirm --age=180 --limit=100
   ```

5. **Run VACUUM to Reclaim Space**:
   ```sql
   VACUUM ANALYZE;
   ```

### How It Works

**Email Access** (transparent to users):
- Recent emails (<180 days): Stored in database → Fast access (20ms)
- Old emails (>180 days): Stored in Supabase Storage → Slightly slower (200ms), cached (50ms)

**EmailArchiveService**:
```javascript
// Upload email to storage
await archiveService.uploadEmailContent(messageId, htmlContent, plainContent);

// Retrieve email (checks storage if needed)
const message = await archiveService.retrieveMessage(messageFromDB);
```

**Caching**: Recently accessed emails cached in memory for 15 minutes.

### Storage Costs

Supabase Storage pricing:
- **Free tier**: 1 GB included
- **After 1GB**: $0.021/GB/month
- **Bandwidth**: 2 GB/month free, then $0.09/GB

**Example**: 300MB of emails → $0/month (within free tier)

### Space Savings

**conversation_messages** table:
- Before: 33 MB (current)
- After archiving 50% of emails: 16-20 MB
- Savings: ~15 MB per archival batch

**Long-term**: Keeps database under 400MB indefinitely.

### Retrieval Examples

**Backend** (automatic):
```javascript
const EmailArchiveService = require('./services/EmailArchiveService');
const archiveService = new EmailArchiveService();

// Get message from database
const { data: message } = await supabase
  .from('conversation_messages')
  .select('*')
  .eq('id', messageId)
  .single();

// Retrieve content (from storage if needed)
const fullMessage = await archiveService.retrieveMessage(message);
// fullMessage.content_html is now available
```

**Frontend**: No changes needed - API returns complete message.

### Monitoring

Check storage usage:
```javascript
const stats = await archiveService.getStorageStats();
// Returns: { fileCount, totalSize, bucketName }
```

### Safety Features

- **Dry-run mode** by default
- **Verification** after upload (downloads and checks)
- **Batch processing** (50 emails at a time)
- **Error isolation** (failed uploads don't stop migration)
- **Rollback capability** (original content kept until verified)

### Migration Strategy

**Conservative approach** (recommended):
1. Week 1: Archive emails >180 days (oldest content)
2. Week 2: Monitor performance, adjust if needed
3. Week 3: Archive emails >90 days (more aggressive)
4. Week 4: Set up automated archival (future feature)

**Aggressive approach** (if space critical):
1. Archive all emails >30 days immediately
2. Run VACUUM to reclaim space
3. Monitor inbox performance

---
*Never modify user isolation, OAuth2 status patterns, or campaign interval enforcement without understanding the complete system flow.*