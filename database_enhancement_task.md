Phase 4 Database Enhancement Workstream: Fix Supabase query issues and implement performance optimizations

CURRENT DATABASE STATE:
- Supabase integration: ACTIVE and working
- 1000 leads and 9 email accounts successfully stored
- WARNING IDENTIFIED: 'Query not implemented for Supabase' for leads listing
- Pagination working but needs optimization
- Redis disabled (warnings: 'Cannot check token blacklist, Redis unavailable')

SPECIFIC ISSUES TO FIX:
1. SUPABASE QUERY COMPATIBILITY:
   - Fix leads query causing 'Query not implemented' warning
   - Current failing query from logs:
     SELECT id, email, first_name, last_name, company, phone, status, created_at, updated_at 
     FROM leads WHERE organization_id = $1 AND status = $2 
     ORDER BY created_at DESC LIMIT $3 OFFSET $4
   - Replace with proper Supabase .select() API calls

2. CURSOR-BASED PAGINATION:
   - Implement efficient cursor-based pagination for 1000+ leads
   - Replace OFFSET-based pagination with cursor pagination using created_at or id
   - Target: 60% performance improvement for large datasets

3. BULK OPERATIONS OPTIMIZATION:
   - Implement efficient bulk operations for lead import/export
   - Use Supabase batch processing with proper error handling
   - Add progress tracking for large operations

4. DATABASE QUERY OPTIMIZATION:
   - Implement proper Supabase query patterns (.select(), .eq(), .order(), .range())
   - Add database indexes for frequently queried fields
   - Optimize COUNT queries to use Supabase's optimized counting

TECHNICAL IMPLEMENTATION:

1. Fix Query Translation Layer:
   - File: src/database/connection.js
   - Convert SQL queries to proper Supabase API calls
   - Implement query mapping for all existing SQL patterns

2. Implement Efficient Pagination:
   - Files: src/routes/leads.js, src/routes/campaigns.js
   - Replace LIMIT/OFFSET with cursor-based pagination
   - Add pagination metadata (hasMore, cursor, total estimates)

3. Bulk Operations:
   - Files: src/services/LeadImportService.js
   - Implement batched inserts with proper error handling
   - Add progress reporting for long operations

4. Database Performance:
   - Use Supabase RPC for complex queries
   - Implement proper indexes via migration
   - Add query performance monitoring

CONSTRAINTS:
- Must maintain current system stability (99% uptime)
- All existing functionality must remain operational
- Memory usage must stay under current 31MB RSS
- No breaking changes to API responses

SUCCESS CRITERIA:
- Eliminate all 'Query not implemented' warnings
- 60% performance improvement for lead queries
- Cursor-based pagination working for 1000+ records  
- Bulk operations handle 10,000+ records efficiently
- All Supabase queries use proper API methods
- Database response times <100ms for typical queries

FILES TO WORK WITH:
- src/database/connection.js (query translation)
- src/routes/leads.js (pagination, queries)
- src/routes/campaigns.js (data operations)
- src/services/LeadImportService.js (bulk operations)
- Use MCP supabase tools for schema management and testing

Please implement these database enhancements while ensuring backward compatibility and system stability.
