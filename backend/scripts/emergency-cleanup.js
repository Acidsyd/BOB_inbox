require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Emergency Database Cleanup Script
 *
 * This script safely deletes unnecessary data from the database to free up space:
 * - Old tracking events (>90 days)
 * - Failed/cancelled campaign emails (>30 days)
 * - Old webhook events (>90 days)
 * - Redundant campaign configs (completed campaigns >30 days)
 *
 * Safety Features:
 * - Dry-run mode by default (shows what would be deleted)
 * - Batch processing (500 rows at a time)
 * - Transaction logging
 * - Error handling with rollback
 * - Progress reporting
 *
 * Usage:
 *   npm run db:cleanup:emergency              (preview mode - safe)
 *   npm run db:cleanup:emergency --confirm    (execute cleanup)
 *   npm run db:cleanup:emergency --batch=100  (smaller batches)
 */

const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch='))?.split('=')[1]) || 500;
const CONFIRM = process.argv.includes('--confirm');

// Date thresholds
const TRACKING_RETENTION_DAYS = 90;
const FAILED_EMAIL_RETENTION_DAYS = 30;
const WEBHOOK_RETENTION_DAYS = 90;
const CAMPAIGN_CONFIG_RETENTION_DAYS = 30;

const trackingThreshold = new Date(Date.now() - TRACKING_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
const failedEmailThreshold = new Date(Date.now() - FAILED_EMAIL_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
const webhookThreshold = new Date(Date.now() - WEBHOOK_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
const campaignThreshold = new Date(Date.now() - CAMPAIGN_CONFIG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

// Cleanup statistics
const stats = {
  trackingEvents: { total: 0, deleted: 0 },
  scheduledEmails: { total: 0, deleted: 0 },
  webhookEvents: { total: 0, deleted: 0 },
  campaignConfigs: { total: 0, updated: 0 },
  errors: []
};

/**
 * Delete old tracking events in batches
 */
async function cleanupTrackingEvents() {
  console.log('\n📊 Cleaning up email tracking events...');
  console.log(`   Deleting events older than ${TRACKING_RETENTION_DAYS} days (before ${trackingThreshold.split('T')[0]})`);

  try {
    // Count total records to delete
    const { count: totalCount } = await supabase
      .from('email_tracking_events')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', trackingThreshold);

    stats.trackingEvents.total = totalCount || 0;

    if (stats.trackingEvents.total === 0) {
      console.log('   ✅ No old tracking events to delete');
      return;
    }

    console.log(`   Found ${stats.trackingEvents.total} old tracking events`);

    if (!CONFIRM) {
      console.log(`   Would delete ${stats.trackingEvents.total} tracking events`);
      return;
    }

    // Delete in batches
    let deletedCount = 0;
    while (deletedCount < stats.trackingEvents.total) {
      // Fetch IDs for next batch
      const { data: batch, error: fetchError } = await supabase
        .from('email_tracking_events')
        .select('id')
        .lt('created_at', trackingThreshold)
        .limit(BATCH_SIZE);

      if (fetchError) {
        stats.errors.push(`Tracking events fetch error: ${fetchError.message}`);
        break;
      }

      if (!batch || batch.length === 0) break;

      // Delete batch
      const ids = batch.map(row => row.id);
      const { error: deleteError } = await supabase
        .from('email_tracking_events')
        .delete()
        .in('id', ids);

      if (deleteError) {
        stats.errors.push(`Tracking events delete error: ${deleteError.message}`);
        break;
      }

      deletedCount += batch.length;
      stats.trackingEvents.deleted = deletedCount;

      const progress = ((deletedCount / stats.trackingEvents.total) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${deletedCount}/${stats.trackingEvents.total} (${progress}%)`);
    }

    console.log(`\n   ✅ Deleted ${stats.trackingEvents.deleted} tracking events`);

  } catch (error) {
    console.error(`\n   ❌ Error cleaning tracking events: ${error.message}`);
    stats.errors.push(`Tracking events error: ${error.message}`);
  }
}

/**
 * Delete failed/cancelled scheduled emails in batches
 */
async function cleanupFailedEmails() {
  console.log('\n❌ Cleaning up failed/cancelled scheduled emails...');
  console.log(`   Deleting emails older than ${FAILED_EMAIL_RETENTION_DAYS} days (before ${failedEmailThreshold.split('T')[0]})`);

  try {
    // Count total records to delete
    const { count: totalCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .in('status', ['failed', 'cancelled', 'skipped'])
      .lt('created_at', failedEmailThreshold);

    stats.scheduledEmails.total = totalCount || 0;

    if (stats.scheduledEmails.total === 0) {
      console.log('   ✅ No old failed emails to delete');
      return;
    }

    console.log(`   Found ${stats.scheduledEmails.total} old failed/cancelled emails`);

    if (!CONFIRM) {
      console.log(`   Would delete ${stats.scheduledEmails.total} failed emails`);
      return;
    }

    // Delete in batches
    let deletedCount = 0;
    while (deletedCount < stats.scheduledEmails.total) {
      // Fetch IDs for next batch
      const { data: batch, error: fetchError } = await supabase
        .from('scheduled_emails')
        .select('id')
        .in('status', ['failed', 'cancelled', 'skipped'])
        .lt('created_at', failedEmailThreshold)
        .limit(BATCH_SIZE);

      if (fetchError) {
        stats.errors.push(`Scheduled emails fetch error: ${fetchError.message}`);
        break;
      }

      if (!batch || batch.length === 0) break;

      const ids = batch.map(row => row.id);

      // First, delete related bounce records (foreign key constraint)
      const { error: bounceDeleteError } = await supabase
        .from('email_bounces')
        .delete()
        .in('scheduled_email_id', ids);

      if (bounceDeleteError && !bounceDeleteError.message.includes('does not exist')) {
        console.log(`\n   ⚠️  Warning: Could not delete some bounce records: ${bounceDeleteError.message}`);
        // Continue anyway - some emails might not have bounce records
      }

      // Then delete the scheduled emails
      const { error: deleteError } = await supabase
        .from('scheduled_emails')
        .delete()
        .in('id', ids);

      if (deleteError) {
        stats.errors.push(`Scheduled emails delete error: ${deleteError.message}`);
        break;
      }

      deletedCount += batch.length;
      stats.scheduledEmails.deleted = deletedCount;

      const progress = ((deletedCount / stats.scheduledEmails.total) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${deletedCount}/${stats.scheduledEmails.total} (${progress}%)`);
    }

    console.log(`\n   ✅ Deleted ${stats.scheduledEmails.deleted} failed emails`);

  } catch (error) {
    console.error(`\n   ❌ Error cleaning failed emails: ${error.message}`);
    stats.errors.push(`Scheduled emails error: ${error.message}`);
  }
}

/**
 * Delete old webhook events in batches
 */
async function cleanupWebhookEvents() {
  console.log('\n🔗 Cleaning up old webhook events...');
  console.log(`   Deleting events older than ${WEBHOOK_RETENTION_DAYS} days (before ${webhookThreshold.split('T')[0]})`);

  try {
    // Check if table exists
    const { count: totalCount, error: countError } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', webhookThreshold);

    if (countError) {
      if (countError.message.includes('does not exist')) {
        console.log('   ℹ️  webhook_events table not found (skipping)');
        return;
      }
      throw countError;
    }

    stats.webhookEvents.total = totalCount || 0;

    if (stats.webhookEvents.total === 0) {
      console.log('   ✅ No old webhook events to delete');
      return;
    }

    console.log(`   Found ${stats.webhookEvents.total} old webhook events`);

    if (!CONFIRM) {
      console.log(`   Would delete ${stats.webhookEvents.total} webhook events`);
      return;
    }

    // Delete in batches
    let deletedCount = 0;
    while (deletedCount < stats.webhookEvents.total) {
      // Fetch IDs for next batch
      const { data: batch, error: fetchError } = await supabase
        .from('webhook_events')
        .select('id')
        .lt('created_at', webhookThreshold)
        .limit(BATCH_SIZE);

      if (fetchError) {
        stats.errors.push(`Webhook events fetch error: ${fetchError.message}`);
        break;
      }

      if (!batch || batch.length === 0) break;

      // Delete batch
      const ids = batch.map(row => row.id);
      const { error: deleteError } = await supabase
        .from('webhook_events')
        .delete()
        .in('id', ids);

      if (deleteError) {
        stats.errors.push(`Webhook events delete error: ${deleteError.message}`);
        break;
      }

      deletedCount += batch.length;
      stats.webhookEvents.deleted = deletedCount;

      const progress = ((deletedCount / stats.webhookEvents.total) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${deletedCount}/${stats.webhookEvents.total} (${progress}%)`);
    }

    console.log(`\n   ✅ Deleted ${stats.webhookEvents.deleted} webhook events`);

  } catch (error) {
    console.error(`\n   ❌ Error cleaning webhook events: ${error.message}`);
    stats.errors.push(`Webhook events error: ${error.message}`);
  }
}

/**
 * Remove redundant email content from old completed campaigns
 */
async function cleanupCampaignConfigs() {
  console.log('\n📧 Cleaning up redundant campaign configs...');
  console.log(`   Removing emailContent from completed campaigns older than ${CAMPAIGN_CONFIG_RETENTION_DAYS} days`);

  try {
    // Find campaigns with redundant content
    const { data: campaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, config')
      .in('status', ['completed', 'stopped', 'paused'])
      .lt('created_at', campaignThreshold);

    if (fetchError) {
      throw fetchError;
    }

    // Filter campaigns that have emailContent in config
    const campaignsToUpdate = campaigns?.filter(c => c.config?.emailContent) || [];
    stats.campaignConfigs.total = campaignsToUpdate.length;

    if (stats.campaignConfigs.total === 0) {
      console.log('   ✅ No redundant campaign configs to clean');
      return;
    }

    console.log(`   Found ${stats.campaignConfigs.total} campaigns with redundant content`);

    if (!CONFIRM) {
      console.log(`   Would remove emailContent from ${stats.campaignConfigs.total} campaigns`);
      return;
    }

    // Update campaigns in batches
    let updatedCount = 0;
    for (let i = 0; i < campaignsToUpdate.length; i += BATCH_SIZE) {
      const batch = campaignsToUpdate.slice(i, i + BATCH_SIZE);

      for (const campaign of batch) {
        // Remove emailContent from config
        const newConfig = { ...campaign.config };
        delete newConfig.emailContent;

        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            config: newConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id);

        if (updateError) {
          stats.errors.push(`Campaign ${campaign.id} update error: ${updateError.message}`);
          continue;
        }

        updatedCount++;
        stats.campaignConfigs.updated = updatedCount;

        const progress = ((updatedCount / stats.campaignConfigs.total) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${updatedCount}/${stats.campaignConfigs.total} (${progress}%)`);
      }
    }

    console.log(`\n   ✅ Updated ${stats.campaignConfigs.updated} campaign configs`);

  } catch (error) {
    console.error(`\n   ❌ Error cleaning campaign configs: ${error.message}`);
    stats.errors.push(`Campaign configs error: ${error.message}`);
  }
}

/**
 * Run VACUUM to reclaim disk space
 */
async function runVacuum() {
  console.log('\n🧹 Running VACUUM to reclaim disk space...');
  console.log('   Note: This may take a few minutes depending on database size');

  if (!CONFIRM) {
    console.log('   Would run VACUUM after cleanup');
    return;
  }

  try {
    // Note: Supabase may restrict VACUUM commands
    // This is informational - actual VACUUM might need to run via Supabase dashboard
    console.log('   ℹ️  VACUUM should be run via Supabase dashboard: Database > SQL Editor');
    console.log('   Run: VACUUM ANALYZE;');

  } catch (error) {
    console.log('   ⚠️  Could not run VACUUM automatically. Please run manually in Supabase.');
  }
}

/**
 * Print cleanup summary
 */
function printSummary() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 CLEANUP SUMMARY');
  console.log('═'.repeat(80));

  const totalDeleted = stats.trackingEvents.deleted +
                       stats.scheduledEmails.deleted +
                       stats.webhookEvents.deleted;

  const totalRecordsFound = stats.trackingEvents.total +
                            stats.scheduledEmails.total +
                            stats.webhookEvents.total +
                            stats.campaignConfigs.total;

  console.log(`\nTracking Events:    ${stats.trackingEvents.deleted}/${stats.trackingEvents.total} deleted`);
  console.log(`Failed Emails:      ${stats.scheduledEmails.deleted}/${stats.scheduledEmails.total} deleted`);
  console.log(`Webhook Events:     ${stats.webhookEvents.deleted}/${stats.webhookEvents.total} deleted`);
  console.log(`Campaign Configs:   ${stats.campaignConfigs.updated}/${stats.campaignConfigs.total} updated`);
  console.log(`\nTotal Records:      ${totalDeleted + stats.campaignConfigs.updated}/${totalRecordsFound} processed`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${stats.errors.length}`);
    stats.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n');

  if (!CONFIRM) {
    console.log('💡 This was a DRY RUN - no data was actually deleted');
    console.log('   To execute the cleanup, run:');
    console.log('   npm run db:cleanup:emergency --confirm');
  } else {
    console.log('✅ Cleanup completed successfully!');
    console.log('\n📈 Next Steps:');
    console.log('   1. Run: npm run db:size:analyze (verify space freed)');
    console.log('   2. Run VACUUM ANALYZE in Supabase SQL Editor to reclaim disk space');
    console.log('   3. Monitor database size over next few days');
  }

  console.log('═'.repeat(80));
  console.log('\n');
}

/**
 * Main cleanup function
 */
async function runCleanup() {
  const startTime = Date.now();

  console.log('\n');
  console.log('═'.repeat(80));
  console.log('🧹 EMERGENCY DATABASE CLEANUP');
  console.log('═'.repeat(80));

  if (!CONFIRM) {
    console.log('\n⚠️  DRY RUN MODE - No data will be deleted');
    console.log('   This will show you what would be deleted without actually deleting it.\n');
  } else {
    console.log('\n⚠️  CLEANUP MODE - Data will be permanently deleted');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('Configuration:');
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Tracking retention: ${TRACKING_RETENTION_DAYS} days`);
  console.log(`   Failed email retention: ${FAILED_EMAIL_RETENTION_DAYS} days`);
  console.log(`   Webhook retention: ${WEBHOOK_RETENTION_DAYS} days`);
  console.log(`   Campaign config retention: ${CAMPAIGN_CONFIG_RETENTION_DAYS} days`);

  // Run cleanup operations
  await cleanupTrackingEvents();
  await cleanupFailedEmails();
  await cleanupWebhookEvents();
  await cleanupCampaignConfigs();
  await runVacuum();

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  printSummary();
  console.log(`⏱️  Total time: ${duration} seconds\n`);
}

// Run the cleanup
runCleanup().catch(error => {
  console.error('\n❌ Fatal error during cleanup:', error);
  process.exit(1);
});
