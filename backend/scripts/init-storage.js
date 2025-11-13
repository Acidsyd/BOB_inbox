require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const EmailArchiveService = require('../src/services/EmailArchiveService');

/**
 * Initialize Supabase Storage for Email Archiving
 *
 * This script creates the storage bucket needed for email archiving.
 * Run this once before migrating emails to storage.
 */

async function initStorage() {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('🪣 INITIALIZE SUPABASE STORAGE');
  console.log('═'.repeat(70));
  console.log('\n');

  const archiveService = new EmailArchiveService();

  try {
    console.log('Creating storage bucket...');
    const result = await archiveService.initializeBucket();

    if (result.error) {
      console.error('❌ Error:', result.error.message);
      console.log('\n💡 Note: If the bucket already exists, this is fine.');
      process.exit(1);
    }

    console.log('\n✅ Storage initialized successfully!');
    console.log(`   Bucket name: ${archiveService.bucketName}`);
    console.log(`   Storage type: Private (requires authentication)`);
    console.log(`   Max file size: 10 MB`);

    // Get stats
    const stats = await archiveService.getStorageStats();

    if (!stats.error) {
      console.log('\n📊 Storage Stats:');
      console.log(`   Files: ${stats.fileCount}`);
      console.log(`   Total size: ${stats.totalSize}`);
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Run database migration to add storage columns:');
    console.log('      (Copy SQL from config/migrations/20250113_add_storage_columns.sql)');
    console.log('');
    console.log('   2. Preview migration:');
    console.log('      npm run db:storage:migrate');
    console.log('');
    console.log('   3. Execute migration:');
    console.log('      npm run db:storage:migrate -- --confirm --age=180');

    console.log('\n═'.repeat(70));
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

initStorage();
