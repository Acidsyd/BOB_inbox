require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Analyze Database Size Script
 *
 * This script analyzes the storage usage of your Supabase PostgreSQL database.
 * It shows the size of each table and helps identify what's consuming the most space.
 *
 * Usage:
 *   npm run db:size:analyze
 */

async function analyzeDatabaseSize() {
  console.log('🔍 Analyzing Database Storage Usage...\n');

  try {
    // Query to get table sizes
    const { data: tableSizes, error: tableSizesError } = await supabase.rpc('get_table_sizes');

    if (tableSizesError) {
      // If the RPC function doesn't exist, we'll create it via instructions
      console.log('⚠️  Database function not found. Run this SQL in Supabase SQL Editor:\n');
      console.log(`
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name text,
  total_size bigint,
  table_size bigint,
  indexes_size bigint,
  row_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ('"' || table_schema || '"."' || t.table_name || '"')::text as table_name,
    pg_total_relation_size(('"' || table_schema || '"."' || t.table_name || '"')::regclass) as total_size,
    pg_relation_size(('"' || table_schema || '"."' || t.table_name || '"')::regclass) as table_size,
    pg_indexes_size(('"' || table_schema || '"."' || t.table_name || '"')::regclass) as indexes_size,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = t.table_schema AND table_name = t.table_name) as row_count
  FROM information_schema.tables t
  WHERE table_schema = 'public'
  ORDER BY pg_total_relation_size(('"' || table_schema || '"."' || t.table_name || '"')::regclass) DESC;
END;
$$ LANGUAGE plpgsql;
      `);
      console.log('\n✅ After creating the function, run this script again.\n');
      process.exit(1);
    }

    if (!tableSizes || tableSizes.length === 0) {
      console.log('❌ No table size data returned. Check database permissions.\n');
      process.exit(1);
    }

    // Calculate total database size
    const totalSize = tableSizes.reduce((sum, table) => sum + parseInt(table.total_size || 0), 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

    console.log('📊 DATABASE SIZE SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Database Size: ${totalSizeMB} MB`);
    console.log('═'.repeat(80));
    console.log('\n');

    // Display table sizes
    console.log('📋 STORAGE BY TABLE');
    console.log('─'.repeat(80));
    console.log(
      'Table'.padEnd(35) +
      'Total'.padEnd(12) +
      'Data'.padEnd(12) +
      'Indexes'.padEnd(12) +
      'Rows'
    );
    console.log('─'.repeat(80));

    tableSizes.forEach(table => {
      const totalMB = (parseInt(table.total_size || 0) / 1024 / 1024).toFixed(2);
      const dataMB = (parseInt(table.table_size || 0) / 1024 / 1024).toFixed(2);
      const indexesMB = (parseInt(table.indexes_size || 0) / 1024 / 1024).toFixed(2);
      const percentage = ((parseInt(table.total_size || 0) / totalSize) * 100).toFixed(1);

      const tableName = table.table_name.replace(/"public"\."/, '').replace(/"$/, '');

      console.log(
        `${tableName.padEnd(35)}` +
        `${(totalMB + ' MB').padEnd(12)}` +
        `${(dataMB + ' MB').padEnd(12)}` +
        `${(indexesMB + ' MB').padEnd(12)}` +
        `${table.row_count || 'N/A'} (${percentage}%)`
      );
    });

    console.log('─'.repeat(80));
    console.log('\n');

    // Get specific counts for cleanup targets
    console.log('🎯 CLEANUP OPPORTUNITIES');
    console.log('─'.repeat(80));

    // Old tracking events
    const { count: oldTrackingCount } = await supabase
      .from('email_tracking_events')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`📊 Tracking events older than 90 days: ${oldTrackingCount || 0} rows`);

    // Failed/cancelled emails
    const { count: failedEmailsCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .in('status', ['failed', 'cancelled', 'skipped'])
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`❌ Failed/cancelled emails older than 30 days: ${failedEmailsCount || 0} rows`);

    // Old webhook events (if table exists)
    const { count: oldWebhooksCount } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .then(result => result)
      .catch(() => ({ count: null }));

    if (oldWebhooksCount !== null) {
      console.log(`🔗 Webhook events older than 90 days: ${oldWebhooksCount} rows`);
    }

    // Completed campaigns with redundant config
    const { count: oldCampaignsCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .in('status', ['completed', 'stopped', 'paused'])
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`📧 Completed campaigns older than 30 days: ${oldCampaignsCount || 0} campaigns`);

    console.log('─'.repeat(80));
    console.log('\n');

    // Estimate cleanup savings
    const trackingSize = tableSizes.find(t => t.table_name.includes('email_tracking_events'));
    const scheduledEmailsSize = tableSizes.find(t => t.table_name.includes('scheduled_emails'));

    let estimatedSavings = 0;

    if (trackingSize && oldTrackingCount) {
      const avgRowSize = parseInt(trackingSize.table_size) / (trackingSize.row_count || 1);
      estimatedSavings += (avgRowSize * oldTrackingCount) / 1024 / 1024;
    }

    if (scheduledEmailsSize && failedEmailsCount) {
      const avgRowSize = parseInt(scheduledEmailsSize.table_size) / (scheduledEmailsSize.row_count || 1);
      estimatedSavings += (avgRowSize * failedEmailsCount) / 1024 / 1024;
    }

    console.log('💾 ESTIMATED CLEANUP SAVINGS');
    console.log('─'.repeat(80));
    console.log(`Estimated space that can be freed: ~${estimatedSavings.toFixed(0)}-${(estimatedSavings * 1.5).toFixed(0)} MB`);
    console.log(`Projected database size after cleanup: ~${(parseFloat(totalSizeMB) - estimatedSavings).toFixed(0)} MB`);
    console.log('─'.repeat(80));
    console.log('\n');

    console.log('💡 NEXT STEPS');
    console.log('─'.repeat(80));
    console.log('1. Review the tables consuming the most space');
    console.log('2. Run cleanup script to free up space:');
    console.log('   npm run db:cleanup:emergency           (preview mode)');
    console.log('   npm run db:cleanup:emergency --confirm (execute cleanup)');
    console.log('─'.repeat(80));
    console.log('\n');

  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the analysis
analyzeDatabaseSize();
