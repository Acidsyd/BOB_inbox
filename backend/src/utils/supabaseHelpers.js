/**
 * Supabase Helper Utilities
 * Reusable functions for common Supabase operations
 */

/**
 * Fetch all rows from a Supabase query using pagination
 * Handles automatic pagination to avoid 1000-row default limit
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name to query
 * @param {Object} options - Query options
 * @param {string} options.select - Columns to select (default: '*')
 * @param {Array<{column: string, value: any}>} options.filters - Array of eq filters
 * @param {Object} options.order - Sort order {column: string, ascending: boolean}
 * @param {number} options.pageSize - Rows per page (default 1000)
 * @returns {Promise<{data: Array, count: number}>} All rows and total count
 *
 * @example
 * const result = await fetchAllWithPagination(supabase, 'scheduled_emails', {
 *   select: 'id, email, send_at',
 *   filters: [
 *     { column: 'campaign_id', value: campaignId },
 *     { column: 'status', value: 'scheduled' }
 *   ],
 *   order: { column: 'send_at', ascending: true },
 *   pageSize: 1000
 * });
 */
async function fetchAllWithPagination(supabase, table, options = {}) {
  const {
    select = '*',
    filters = [],
    order = null,
    pageSize = 1000
  } = options;

  // First, get the total count
  let countQuery = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  // Apply filters to count query
  filters.forEach(({ column, value }) => {
    countQuery = countQuery.eq(column, value);
  });

  const { count: totalCount, error: countError } = await countQuery;

  if (countError) {
    throw new Error(`Failed to count rows: ${countError.message}`);
  }

  if (!totalCount || totalCount === 0) {
    return { data: [], count: 0 };
  }

  // Fetch all rows with pagination
  let allRows = [];
  let page = 0;

  while (allRows.length < totalCount) {
    let pageQuery = supabase
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    // Apply filters
    filters.forEach(({ column, value }) => {
      pageQuery = pageQuery.eq(column, value);
    });

    // Apply ordering
    if (order) {
      pageQuery = pageQuery.order(order.column, { ascending: order.ascending });
    }

    const { data: pageRows, error: pageError } = await pageQuery;

    if (pageError) {
      throw new Error(`Failed to fetch page ${page + 1}: ${pageError.message}`);
    }

    if (!pageRows || pageRows.length === 0) {
      break;
    }

    allRows = allRows.concat(pageRows);
    page++;
  }

  return { data: allRows, count: totalCount };
}

/**
 * Fetch count only (efficient for large tables)
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name to query
 * @param {Array<{column: string, value: any}>} filters - Array of eq filters
 * @returns {Promise<number>} Total count
 *
 * @example
 * const count = await fetchCount(supabase, 'scheduled_emails', [
 *   { column: 'campaign_id', value: campaignId },
 *   { column: 'status', value: 'scheduled' }
 * ]);
 */
async function fetchCount(supabase, table, filters = []) {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  filters.forEach(({ column, value }) => {
    query = query.eq(column, value);
  });

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count rows: ${error.message}`);
  }

  return count || 0;
}

/**
 * Batch update rows (handles large updates efficiently)
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name
 * @param {Array<{id: string, updates: Object}>} rows - Array of rows to update
 * @param {number} batchSize - Updates per batch (default 50)
 * @returns {Promise<{success: number, failed: number}>} Update results
 *
 * @example
 * const results = await batchUpdate(supabase, 'scheduled_emails', [
 *   { id: 'uuid1', updates: { send_at: '2025-10-15T09:00:00Z' } },
 *   { id: 'uuid2', updates: { send_at: '2025-10-15T09:05:00Z' } }
 * ]);
 */
async function batchUpdate(supabase, table, rows, batchSize = 50) {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, Math.min(i + batchSize, rows.length));

    for (const row of batch) {
      const { error } = await supabase
        .from(table)
        .update({
          ...row.updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);

      if (error) {
        console.error(`Failed to update ${row.id}:`, error.message);
        failCount++;
      } else {
        successCount++;
      }
    }
  }

  return { success: successCount, failed: failCount };
}

module.exports = {
  fetchAllWithPagination,
  fetchCount,
  batchUpdate
};
