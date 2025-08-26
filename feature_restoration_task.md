Phase 4 Feature Restoration Workstream: Implement essential features with minimal complexity

CURRENT SIMPLIFIED STATE:
- Analytics endpoint: Returns stub data (totalCampaigns: 0, totalLeads: 0, responseRate: 0)
- Tracking endpoints: Simplified stubs returning { enabled: false }
- Dashboard: Expecting analytics data but receiving basic stubs
- WebSocket: RealtimeClient exists but not integrated
- Email account health: Stub endpoint without real monitoring

FEATURE RESTORATION TASKS (80% functionality with 20% complexity):

1. BASIC CAMPAIGN METRICS (Replace Analytics Stubs):
   - File: src/index.js (lines 111-117) - replace stub endpoint  
   - Implement real campaign metrics: open rates, response rates, click rates
   - Data sources: campaigns table, email activities (if exists), basic calculations
   - Return format: { campaigns: {total, active}, leads: {total, active, replied, bounced}, emails: {sent, opened, clicked}, rates: {openRate, clickRate, replyRate} }
   - Memory overhead: <1MB for basic aggregations

2. DASHBOARD DATA AGGREGATION:
   - Create new route: /api/analytics/dashboard with authentication 
   - Pre-computed metrics with hourly refresh capability
   - Cache results in memory for 30 minutes to reduce database load
   - Support dashboard interface expecting DashboardStats format

3. LIGHTWEIGHT WEBSOCKET FOR CAMPAIGN PROGRESS:
   - Integrate existing RealtimeClient.js with backend
   - Add WebSocket endpoint for campaign progress tracking only (not full real-time)
   - Events: campaign_started, campaign_progress, campaign_completed
   - Memory footprint: <2MB for WebSocket connections

4. EMAIL ACCOUNT HEALTH MONITORING:
   - Replace stub at src/index.js lines 127-129
   - Real-time status indicators: active/inactive, send quota, error rates
   - Simple health calculation: successful_sends / total_attempts over 24h
   - Update email accounts table with health status field

IMPLEMENTATION CONSTRAINTS:
- Memory overhead: <5MB total for all new features
- No external dependencies (no Redis, complex queue systems)
- Maintain current performance (startup <2s, API <200ms)
- Use existing database schema (Supabase)
- Simple implementation - no complex real-time processing

SPECIFIC FEATURES TO IMPLEMENT:

1. Analytics Dashboard Route:
   Location: New file src/routes/analytics.js
   Features: 
   - GET /api/analytics/dashboard (authenticated)
   - Campaign stats aggregation  
   - Lead conversion metrics
   - Email delivery statistics
   - Response rates calculation

2. WebSocket Integration:
   Files: src/index.js (WebSocket server), existing RealtimeClient.js
   Features:
   - Campaign progress broadcasting
   - Connection management for authenticated users
   - Event types: progress updates only

3. Email Account Health:
   File: src/routes/emailAccounts.js (enhance existing)  
   Features:
   - Real health status calculation
   - Last activity tracking
   - Simple health score (0-100)

4. Dashboard Data Caching:
   Files: src/utils/cache.js (new), src/routes/analytics.js
   Features:
   - In-memory caching with TTL
   - Automatic invalidation on data changes
   - Memory-efficient data structures

SUCCESS CRITERIA:
- Dashboard shows real data instead of stubs
- Campaign progress visible during execution
- Email account health reflects actual status  
- All features working with <5MB memory overhead
- Response times maintained (<200ms)
- 80% of removed functionality restored with simple implementations

FILES TO CREATE/MODIFY:
- src/routes/analytics.js (new - dashboard analytics)
- src/utils/cache.js (new - lightweight caching)
- src/index.js (WebSocket integration, remove stubs)
- src/routes/emailAccounts.js (health monitoring)
- src/utils/RealtimeClient.js (integration with backend)

Please implement these features while maintaining the current system stability and performance.
