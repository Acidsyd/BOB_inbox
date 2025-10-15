#!/usr/bin/env node

/**
 * Database Timestamp Migration Script
 *
 * Purpose: Convert old local timestamps (Europe/Rome) to proper UTC
 *
 * Background:
 * - Old code used toLocalTimestamp() which stored local Rome time without 'Z'
 * - New code uses .toISOString() which stores UTC with 'Z'
 * - Frontend now treats all timestamps as UTC by adding 'Z' suffix
 * - This causes old timestamps to display +2h incorrectly
 *
 * Solution:
 * - Find timestamps matching format YYYY-MM-DDTHH:mm:ss (no Z, no milliseconds)
 * - Subtract 2 hours (CEST offset) to convert Rome time → UTC
 * - Update with .toISOString() format
 *
 * Safety:
 * - Dry run by default (set DRY_RUN=false to apply)
 * - Only updates timestamps matching old format
 * - Logs all changes for verification
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = process.env.DRY_RUN !== 'false';
const ROME_OFFSET_HOURS = 2; // CEST (Central European Summer Time) = UTC+2

// Tables and their timestamp columns to migrate
const TABLES_TO_MIGRATE = [
  {
    table: 'conversation_messages',
    columns: ['sent_at', 'received_at', 'created_at']
  },
  {
    table: 'conversations',
    columns: ['last_activity', 'created_at', 'updated_at']
  },
  {
    table: 'scheduled_emails',
    columns: ['send_at', 'sent_at', 'created_at', 'updated_at']
  },
  {
    table: 'campaigns',
    columns: ['created_at', 'updated_at', 'started_at', 'paused_at', 'stopped_at']
  },
  {
    table: 'oauth2_tokens',
    columns: ['created_at', 'updated_at']
  },
  {
    table: 'email_accounts',
    columns: ['created_at', 'updated_at']
  },
  {
    table: 'system_health',
    columns: ['last_heartbeat', 'created_at', 'updated_at']
  }
];

/**
 * Check if timestamp needs migration (old local format)
 */
function needsMigration(timestamp) {
  if (!timestamp) return false;

  // Old format: YYYY-MM-DDTHH:mm:ss (no Z, no milliseconds)
  // This regex matches timestamps WITHOUT timezone suffix
  const oldFormatRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

  return oldFormatRegex.test(timestamp);
}

/**
 * Convert Rome local time to UTC
 *
 * IMPORTANT: This is ONLY for OLD timestamps (before Oct 1, 2025) that were
 * created with the old toLocalTimestamp() function.
 *
 * Recent timestamps (Oct 1, 2025+) were created with toLocaleString('sv-SE')
 * which returns SERVER time (UTC), so they should NOT be converted!
 */
function convertRomeToUTC(localTimestamp) {
  const date = new Date(localTimestamp);

  // Check if this is a recent timestamp (Oct 1, 2025 or later)
  // These were created with toLocaleString('sv-SE') which returns UTC
  if (date >= new Date('2025-10-01T00:00:00Z')) {
    console.log(`   ⚠️  Skipping recent timestamp (already UTC): ${localTimestamp}`);
    return localTimestamp; // Return as-is, already UTC
  }

  // Only convert OLD timestamps (before Oct 1, 2025)
  // These were created with toLocalTimestamp() and need conversion
  const utcDate = new Date(date.getTime() - (ROME_OFFSET_HOURS * 60 * 60 * 1000));
  return utcDate.toISOString();
}

/**
 * Migrate timestamps for a single table
 */
async function migrateTable(tableName, columns) {
  console.log(`\n📋 Processing table: ${tableName}`);
  console.log(`   Columns: ${columns.join(', ')}`);

  try {
    // Fetch all rows
    const { data: rows, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`❌ Error fetching ${tableName}:`, error.message);
      return { migrated: 0, skipped: 0, errors: 0 };
    }

    if (!rows || rows.length === 0) {
      console.log(`   ℹ️  No rows found in ${tableName}`);
      return { migrated: 0, skipped: 0, errors: 0 };
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      let needsUpdate = false;
      const updates = {};

      // Check each timestamp column
      for (const column of columns) {
        const timestamp = row[column];

        if (needsMigration(timestamp)) {
          const utcTimestamp = convertRomeToUTC(timestamp);
          updates[column] = utcTimestamp;
          needsUpdate = true;

          console.log(`   🔄 Row ${row.id?.substring(0, 8) || 'N/A'}... ${column}:`);
          console.log(`      Old: ${timestamp}`);
          console.log(`      New: ${utcTimestamp}`);
        }
      }

      if (needsUpdate) {
        if (DRY_RUN) {
          console.log(`   🔍 DRY RUN - Would update row ${row.id?.substring(0, 8) || 'N/A'}...`);
          migratedCount++;
        } else {
          // Apply update
          const { error: updateError } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', row.id);

          if (updateError) {
            console.error(`   ❌ Error updating row ${row.id}:`, updateError.message);
            errorCount++;
          } else {
            console.log(`   ✅ Updated row ${row.id?.substring(0, 8) || 'N/A'}...`);
            migratedCount++;
          }
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`   📊 ${tableName} summary: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);

    return { migrated: migratedCount, skipped: skippedCount, errors: errorCount };

  } catch (error) {
    console.error(`❌ Fatal error processing ${tableName}:`, error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Timestamp Migration');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (applying changes)'}`);
  console.log(`   Rome offset: UTC+${ROME_OFFSET_HOURS}`);
  console.log(`   Tables: ${TABLES_TO_MIGRATE.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Set DRY_RUN=false to apply changes\n');
  }

  const totalStats = {
    migrated: 0,
    skipped: 0,
    errors: 0
  };

  for (const { table, columns } of TABLES_TO_MIGRATE) {
    const stats = await migrateTable(table, columns);
    totalStats.migrated += stats.migrated;
    totalStats.skipped += stats.skipped;
    totalStats.errors += stats.errors;
  }

  console.log('\n✅ Migration Complete');
  console.log(`   Total migrated: ${totalStats.migrated}`);
  console.log(`   Total skipped: ${totalStats.skipped}`);
  console.log(`   Total errors: ${totalStats.errors}`);

  if (DRY_RUN) {
    console.log('\n💡 To apply changes, run: DRY_RUN=false node scripts/migrate-timestamps-to-utc.cjs');
  }
}

// Run migration
runMigration().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
