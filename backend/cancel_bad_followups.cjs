#!/usr/bin/env node

/**
 * CRITICAL CLEANUP SCRIPT
 *
 * Cancel all scheduled follow-up emails that have unprocessed spintax.
 * These were scheduled before the spintax processing fix was deployed.
 *
 * This prevents sending unprofessional emails with raw {option1|option2} syntax.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Pattern to detect unprocessed spintax: {text|text}
const SPINTAX_PATTERN = /\{[^{}]+\|[^{}]+\}/;

async function cancelBadFollowups() {
  console.log('🔍 Starting cleanup of follow-ups with unprocessed spintax...\n');

  try {
    // Fetch all scheduled follow-up emails
    console.log('📥 Fetching all scheduled follow-up emails...');

    const { data: followups, error: fetchError, count } = await supabase
      .from('scheduled_emails')
      .select('id, subject, content, to_email, send_at, campaign_id', { count: 'exact' })
      .eq('is_follow_up', true)
      .eq('status', 'scheduled')
      .order('send_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch follow-ups: ${fetchError.message}`);
    }

    console.log(`✅ Found ${count} scheduled follow-up emails\n`);

    // Filter emails with unprocessed spintax
    const badFollowups = followups.filter(email => {
      const hasSpintaxInSubject = SPINTAX_PATTERN.test(email.subject || '');
      const hasSpintaxInContent = SPINTAX_PATTERN.test(email.content || '');
      return hasSpintaxInSubject || hasSpintaxInContent;
    });

    if (badFollowups.length === 0) {
      console.log('✅ No follow-ups with unprocessed spintax found. All good!');
      return;
    }

    console.log(`🚨 Found ${badFollowups.length} follow-ups with unprocessed spintax:\n`);

    // Show sample of what will be cancelled
    console.log('📋 Sample of emails to be cancelled:');
    badFollowups.slice(0, 5).forEach((email, idx) => {
      const subjectPreview = (email.subject || '').substring(0, 60);
      const contentPreview = (email.content || '').substring(0, 80);
      console.log(`\n${idx + 1}. To: ${email.to_email}`);
      console.log(`   Subject: ${subjectPreview}...`);
      console.log(`   Content: ${contentPreview}...`);
      console.log(`   Send at: ${email.send_at}`);
    });

    if (badFollowups.length > 5) {
      console.log(`\n   ... and ${badFollowups.length - 5} more`);
    }

    // Confirm before proceeding
    console.log(`\n⚠️  Ready to cancel ${badFollowups.length} follow-ups with unprocessed spintax`);
    console.log('Press Ctrl+C to abort, or wait 5 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete the bad follow-ups (cleaner than trying to cancel)
    console.log('🔧 Deleting follow-ups with unprocessed spintax...');

    const emailIds = badFollowups.map(e => e.id);

    // Delete in batches of 100
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < emailIds.length; i += batchSize) {
      const batch = emailIds.slice(i, i + batchSize);

      const { error: deleteError } = await supabase
        .from('scheduled_emails')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError.message);
      } else {
        deletedCount += batch.length;
        console.log(`✅ Deleted batch ${i / batchSize + 1}: ${batch.length} emails`);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total scheduled follow-ups: ${count}`);
    console.log(`Follow-ups with bad spintax: ${badFollowups.length}`);
    console.log(`Successfully deleted: ${deletedCount}`);
    console.log(`\n💡 New follow-ups created after the fix will have proper spintax processing.`);

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cancelBadFollowups()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
