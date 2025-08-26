Phase 4 Performance Optimization Workstream: Implement intelligent caching and query optimization

CURRENT PERFORMANCE BASELINE:
- Startup time: <1s (excellent)
- Memory usage: 24MB heap, 31MB RSS (excellent)  
- Backend: Port 4000, no Redis dependency (simplified auth working)
- 9 essential routes operational with good response times
- Supabase integration active with 1000 leads, 9 email accounts

PERFORMANCE OPTIMIZATION TARGETS:
1. API Response Time: 40% improvement to <200ms average
2. Memory Usage: Stay under 50MB total (<5MB additional overhead)
3. Query Performance: 60% improvement for lead operations
4. Startup Time: Maintain <2s (ideally keep current <1s)

IMPLEMENTATION TASKS:

1. LIGHTWEIGHT MEMORY-BASED LRU CACHE (Redis Alternative):
   - Implement in-memory LRU cache for authentication tokens (replace Redis dependency)
   - Cache size: 1000 entries max, 15-minute TTL for tokens
   - Add cache hit/miss metrics with minimal overhead
   - Files: src/middleware/auth.js, src/utils/cache.js (new)

2. QUERY RESULT CACHING FOR SUPABASE:
   - Implement query result caching for lead queries with 30s TTL
   - Focus on: lead listings, campaign data, email account status
   - Use intelligent cache invalidation on data mutations
   - Files: src/database/connection.js, src/routes/leads.js, src/routes/campaigns.js

3. API RESPONSE OPTIMIZATION:
   - Implement response compression (already has compression middleware)
   - Add intelligent pagination with cursor-based approach
   - Optimize JSON serialization for large datasets
   - Reduce database query complexity

4. MEMORY MANAGEMENT:
   - Implement garbage collection hints for large operations
   - Add memory monitoring and cleanup routines
   - Optimize object creation patterns

CONSTRAINTS:
- Must maintain current stability (99% uptime)
- No external dependencies (no Redis, keep Supabase only)
- Memory overhead: <5MB additional
- Performance must improve, not degrade

FILES TO OPTIMIZE:
- src/middleware/auth.js (token caching)
- src/database/connection.js (query caching)
- src/routes/leads.js (pagination, caching)
- src/routes/campaigns.js (response optimization)
- src/utils/ (new cache utilities)

SUCCESS CRITERIA:
- 40% API response time improvement (<200ms average)
- 60% query performance improvement
- Memory usage <50MB total
- Startup time <2s
- All existing functionality preserved
- Cache hit rate >70% for repeated requests

Please implement these optimizations while maintaining system stability.
