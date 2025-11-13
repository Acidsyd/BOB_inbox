require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Delete ALL Campaigns
 *
 * This will delete ALL campaigns including active ones.
 * This is IRREVERSIBLE and will stop all email sending.
 */

const BATCH_SIZE = 500;

async function deleteAllCampaigns() {
  const startTime = Date.now();

  console.log('\n');
  console.log('═'.repeat(80));
  console.log('🗑️  DELETE ALL CAMPAIGNS');
  console.log('═'.repeat(80));
  console.log('\n⚠️  WARNING: This will delete ALL campaigns and stop all email sending');
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  const stats = {
    campaigns: { total: 0, deleted: 0 },
    scheduledEmails: { total: 0, deleted: 0 },
    errors: []
  };

  try {
    // Step 1: Get all campaigns
    console.log('📊 Counting campaigns...');
    const { count: campaignCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    stats.campaigns.total = campaignCount || 0;
    console.log(`   Found ${stats.campaigns.total} campaigns\n`);

    // Step 2: Count scheduled emails
    console.log('📧 Counting scheduled emails...');
    const { count: emailCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true });

    stats.scheduledEmails.total = emailCount || 0;
    console.log(`   Found ${stats.scheduledEmails.total} scheduled emails\n`);

    // Step 3: Delete all scheduled_emails first (foreign key)
    console.log('🗑️  Deleting scheduled emails...');
    let deletedEmails = 0;

    while (deletedEmails < stats.scheduledEmails.total) {
      const { data: batch, error: fetchError } = await supabase
        .from('scheduled_emails')
        .select('id')
        .limit(BATCH_SIZE);

      if (fetchError) {
        stats.errors.push(`Fetch error: ${fetchError.message}`);
        break;
      }

      if (!batch || batch.length === 0) break;

      const ids = batch.map(row => row.id);

      // Delete related bounces first
      await supabase
        .from('email_bounces')
        .delete()
        .in('scheduled_email_id', ids);

      // Delete scheduled emails
      const { error: deleteError } = await supabase
        .from('scheduled_emails')
        .delete()
        .in('id', ids);

      if (deleteError) {
        stats.errors.push(`Delete error: ${deleteError.message}`);
        break;
      }

      deletedEmails += batch.length;
      stats.scheduledEmails.deleted = deletedEmails;

      const progress = ((deletedEmails / stats.scheduledEmails.total) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${deletedEmails}/${stats.scheduledEmails.total} (${progress}%)`);
    }

    console.log(`\n   ✅ Deleted ${stats.scheduledEmails.deleted} scheduled emails\n`);

    // Step 4: Delete all campaigns
    console.log('🗑️  Deleting campaigns...');
    let deletedCampaigns = 0;

    while (deletedCampaigns < stats.campaigns.total) {
      const { data: batch, error: fetchError } = await supabase
        .from('campaigns')
        .select('id')
        .limit(BATCH_SIZE);

      if (fetchError) {
        stats.errors.push(`Campaign fetch error: ${fetchError.message}`);
        break;
      }

      if (!batch || batch.length === 0) break;

      const ids = batch.map(row => row.id);

      const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .in('id', ids);

      if (deleteError) {
        stats.errors.push(`Campaign delete error: ${deleteError.message}`);
        break;
      }

      deletedCampaigns += batch.length;
      stats.campaigns.deleted = deletedCampaigns;

      const progress = ((deletedCampaigns / stats.campaigns.total) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${deletedCampaigns}/${stats.campaigns.total} (${progress}%)`);
    }

    console.log(`\n   ✅ Deleted ${stats.campaigns.deleted} campaigns\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    stats.errors.push(`Fatal error: ${error.message}`);
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('═'.repeat(80));
  console.log('📊 DELETION SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nScheduled Emails: ${stats.scheduledEmails.deleted}/${stats.scheduledEmails.total} deleted`);
  console.log(`Campaigns:        ${stats.campaigns.deleted}/${stats.campaigns.total} deleted`);
  console.log(`\nTotal Time:       ${duration} seconds`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${stats.errors.length}`);
    stats.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n✅ All campaigns and scheduled emails have been deleted');
  console.log('💡 Next step: Run VACUUM FULL in Supabase to reclaim disk space');
  console.log('═'.repeat(80));
  console.log('\n');
}

deleteAllCampaigns();
