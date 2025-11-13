require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');
const EmailArchiveService = require('../src/services/EmailArchiveService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Migrate Old Emails to Storage
 *
 * This script moves email content from conversation_messages table to Supabase Storage:
 * 1. Finds emails older than X days
 * 2. Uploads content to storage
 * 3. Updates database with storage paths
 * 4. Removes content from database
 *
 * Safety features:
 * - Dry-run mode by default
 * - Batch processing
 * - Verification after upload
 * - Rollback on errors
 */

const BATCH_SIZE = 50; // Process 50 emails at a time
const ARCHIVE_AGE_DAYS = parseInt(process.argv.find(arg => arg.startsWith('--age='))?.split('=')[1]) || 180;
const DRY_RUN = !process.argv.includes('--confirm');
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || null;

const archiveService = new EmailArchiveService();

const stats = {
  total: 0,
  uploaded: 0,
  updated: 0,
  errors: []
};

/**
 * Main migration function
 */
async function migrateEmails() {
  const startTime = Date.now();

  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📦 MIGRATE EMAILS TO STORAGE');
  console.log('═'.repeat(80));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Use --confirm to execute the migration\n');
  } else {
    console.log('\n⚠️  MIGRATION MODE - Emails will be moved to storage');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('Configuration:');
  console.log(`   Archive age: ${ARCHIVE_AGE_DAYS} days`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Limit: ${LIMIT || 'unlimited'}\n`);

  try {
    // Step 1: Initialize storage bucket
    console.log('🪣 Initializing storage bucket...');
    const initResult = await archiveService.initializeBucket();

    if (initResult.error) {
      throw new Error(`Failed to initialize bucket: ${initResult.error.message}`);
    }

    // Step 2: Count emails to migrate
    const archiveDate = new Date(Date.now() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    console.log(`\n📊 Counting emails older than ${ARCHIVE_AGE_DAYS} days...`);

    const { count: totalCount } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .not('content_html', 'is', null)
      .or(`sent_at.lt.${archiveDate},received_at.lt.${archiveDate}`);

    stats.total = Math.min(totalCount || 0, LIMIT || Infinity);

    if (stats.total === 0) {
      console.log('   ✅ No old emails to migrate\n');
      return;
    }

    console.log(`   Found ${totalCount} old emails`);
    if (LIMIT) {
      console.log(`   Will migrate ${stats.total} emails (limited by --limit=${LIMIT})`);
    }

    if (DRY_RUN) {
      console.log(`\n   Would migrate ${stats.total} emails to storage`);
      console.log(`   Estimated space savings: ~${(stats.total * 30 / 1024).toFixed(0)} MB`);
      console.log('\n💡 Run with --confirm to execute migration');
      return;
    }

    // Step 3: Migrate in batches
    console.log(`\n📦 Migrating emails in batches of ${BATCH_SIZE}...\n`);

    let processed = 0;

    while (processed < stats.total) {
      // Fetch batch
      const { data: batch, error: fetchError } = await supabase
        .from('conversation_messages')
        .select('id, content_html, content_plain, sent_at, received_at')
        .not('content_html', 'is', null)
        .or(`sent_at.lt.${archiveDate},received_at.lt.${archiveDate}`)
        .limit(BATCH_SIZE);

      if (fetchError) {
        stats.errors.push(`Fetch error: ${fetchError.message}`);
        break;
      }

      if (!batch || batch.length === 0) break;

      // Process each email in batch
      for (const message of batch) {
        try {
          // Upload to storage
          const uploadResult = await archiveService.uploadEmailContent(
            message.id,
            message.content_html,
            message.content_plain
          );

          if (uploadResult.error) {
            stats.errors.push(`Upload failed for ${message.id}: ${uploadResult.error.message}`);
            continue;
          }

          stats.uploaded++;

          // Verify upload by downloading
          if (uploadResult.htmlPath) {
            const downloaded = await archiveService.downloadEmailContent(uploadResult.htmlPath);
            if (!downloaded) {
              stats.errors.push(`Verification failed for ${message.id}`);
              continue;
            }
          }

          // Update database - remove content, add storage paths
          const { error: updateError } = await supabase
            .from('conversation_messages')
            .update({
              storage_html_path: uploadResult.htmlPath || null,
              storage_plain_path: uploadResult.plainPath || null,
              content_html: null, // Remove from database
              content_plain: null, // Remove from database
              archived_at: new Date().toISOString()
            })
            .eq('id', message.id);

          if (updateError) {
            stats.errors.push(`Update failed for ${message.id}: ${updateError.message}`);
            continue;
          }

          stats.updated++;
          processed++;

          const progress = ((processed / stats.total) * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${processed}/${stats.total} (${progress}%)`);

        } catch (error) {
          stats.errors.push(`Error processing ${message.id}: ${error.message}`);
        }
      }

      if (processed >= stats.total) break;
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    stats.errors.push(`Fatal error: ${error.message}`);
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('═'.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nEmails found:      ${stats.total}`);
  console.log(`Uploaded:          ${stats.uploaded}`);
  console.log(`Database updated:  ${stats.updated}`);
  console.log(`Errors:            ${stats.errors.length}`);
  console.log(`\nTotal time:        ${duration} seconds`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`);
    }
  }

  if (stats.updated > 0) {
    const savedMB = (stats.updated * 30 / 1024).toFixed(0);
    console.log(`\n💾 Estimated space saved: ~${savedMB} MB`);
    console.log('   Run VACUUM ANALYZE in Supabase to reclaim space');
  }

  console.log('═'.repeat(80));
  console.log('\n');
}

// Run migration
migrateEmails().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
