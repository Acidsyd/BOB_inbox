# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Quick Start Commands

```bash
# Development
npm run dev              # Starts both frontend (3001) and backend (4000)
npm run dev:backend      # Backend only (port 4000)
npm run dev:frontend     # Frontend only (port 3001)
npm run cron:dev         # Email processor (every minute) - PRODUCTION-READY with 4-phase enhancements
npm run reply-monitor:dev # Reply monitoring cron (development mode)

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
Campaign Start → Auto-starts cron processor → Creates scheduled_emails →
Cron (1 min) → Enforces timing rules → Account rotation → OAuth2/SMTP send →
Updates conversations → Tracks metrics → Schedules follow-ups
```

### Scheduling Rules (ALL enforced by CronEmailProcessor)
- **Campaign intervals**: 5 minutes minimum, exact compliance
- **Daily/hourly limits**: emailsPerDay, emailsPerHour
- **Sending hours**: Only within configured time windows
- **Timezone handling**: Campaign timezone for all calculations
- **Account rotation**: Intelligent distribution across multiple accounts
- **Human-like jitter**: ±1-3 minute variations to avoid robotic patterns

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
```

## Key Files

### Backend Services
- `src/services/CronEmailProcessor.js` - **Production scheduler** (4-phase enhanced, exact interval compliance)
- `src/services/BackgroundSyncService.js` - **Simple background sync** (15-minute intervals for all accounts)
- `src/services/OAuth2Service.js` - Gmail API integration with attachment support
- `src/services/EmailService.js` - Dual-provider email sending
- `src/services/UnifiedInboxService.js` - RFC-compliant conversation threading
- `src/services/TimezoneService.js` - **Universal timezone conversion** (IANA timezone support, business hours)
- `src/services/AccountRateLimitService.js` - Account rotation and rate limiting
- `src/services/BounceTrackingService.js` - Multi-provider bounce detection

### API Routes
- `src/routes/campaigns.js` - Campaign CRUD with auto-start processor
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

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
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
| Lead count capped at 1000 | Use Supabase count queries, not data length |
| Tiptap focus/selection issues | Remove content from useEditor deps |
| Manual sync not working | Check `/api/inbox/sync/manual` endpoint and triggerManualSync function |
| Background sync not running | Verify BackgroundSyncService initialization in backend index.js |
| Auto-sync references | Auto-sync was removed - use BackgroundSyncService for 15-min intervals |

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
```

## Production System Status

### ✅ Completed Enhancements (September 2025)
- **Phase 1-4 Improvements**: Error resilience, database optimization, parallel processing, graceful shutdown
- **Campaign Timing Fixed**: Exact interval compliance with 1 email per interval enforcement
- **Simplified Sync Architecture**: Replaced complex auto-sync with simple 15-minute background sync
- **Reply Detection**: Unified inbox system with RFC-compliant threading
- **Bounce Protection**: Auto-pause campaigns at 5% bounce rate
- **Rate Limiting**: Sophisticated account rotation with usage tracking
- **Human-like Timing**: Smart jitter system (±1-3 minutes)
- **Unlimited Lead Counts**: Fixed Supabase 1000-row query limit
- **Timezone Architecture**: Universal TimezoneService with IANA timezone support
- **Scheduled Activity Fix**: formatCampaignDate helper with proper Intl.DateTimeFormat options

### System Performance
- 99.9% uptime with automatic error recovery
- 3-5x throughput with parallel campaign processing
- 60-80% database efficiency with optimized queries
- Exact interval compliance for all campaigns
- Smart account rotation with automatic failover

## Critical Patterns

1. **Always use organization_id filtering** for multi-tenant isolation
2. **OAuth2 status must be 'linked_to_account'** for account visibility
3. **Campaign intervals enforced by CronEmailProcessor** - no manual intervention needed
4. **Rich text editors require SSR: false** to prevent hydration errors
5. **Instant loading states required** for all campaign actions
6. **Conversation threading uses Message-ID headers** for RFC compliance
7. **Account rotation prevents single-account bottlenecks**
8. **Human-like jitter prevents robotic patterns** in email timing
9. **Frontend timezone consistency requires formatDateInTimezone()** - never use backend display timestamps

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

---
*Never modify user isolation, OAuth2 status patterns, or campaign interval enforcement without understanding the complete system flow.*