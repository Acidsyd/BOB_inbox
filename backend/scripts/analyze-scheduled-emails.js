require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Analyze Scheduled Emails Table
 * Check what's consuming space in scheduled_emails
 */

async function analyzeScheduledEmails() {
  console.log('🔍 Analyzing scheduled_emails table...\n');

  try {
    // Count by status
    console.log('📊 EMAILS BY STATUS');
    console.log('─'.repeat(60));

    const statuses = ['scheduled', 'sending', 'sent', 'failed', 'cancelled', 'skipped', 'bounced'];

    for (const status of statuses) {
      const { count } = await supabase
        .from('scheduled_emails')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      console.log(`${status.padEnd(15)}: ${(count || 0).toLocaleString()} emails`);
    }

    // Total count
    const { count: totalCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true });

    console.log('─'.repeat(60));
    console.log(`${'TOTAL'.padEnd(15)}: ${(totalCount || 0).toLocaleString()} emails`);
    console.log('\n');

    // Check old sent emails (could be cleaned)
    const oldSentDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { count: oldSentCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .lt('sent_at', oldSentDate);

    console.log('💡 CLEANUP OPPORTUNITIES');
    console.log('─'.repeat(60));
    console.log(`Sent emails older than 90 days: ${(oldSentCount || 0).toLocaleString()}`);
    console.log('');
    console.log('⚠️  These are SENT emails with full content stored.');
    console.log('   Conversation history is preserved in conversation_messages.');
    console.log('   You could delete these to save ~100-200 MB.\n');

    // Sample a few records to see content size
    const { data: samples } = await supabase
      .from('scheduled_emails')
      .select('status, content, subject, sent_at, created_at')
      .limit(5);

    if (samples && samples.length > 0) {
      console.log('📝 SAMPLE RECORDS (checking content size)');
      console.log('─'.repeat(60));

      samples.forEach((email, i) => {
        const contentSize = email.content ? (email.content.length / 1024).toFixed(2) : 0;
        console.log(`${i + 1}. Status: ${email.status}, Content: ${contentSize} KB`);
      });
      console.log('');
    }

    // Estimate space usage
    console.log('💾 ESTIMATED SPACE BREAKDOWN');
    console.log('─'.repeat(60));

    const avgContentSize = 5; // KB average per email
    const sentCount = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .then(r => r.count || 0);

    const scheduledCount = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .then(r => r.count || 0);

    const estimatedSentSize = (sentCount * avgContentSize / 1024).toFixed(0);
    const estimatedScheduledSize = (scheduledCount * avgContentSize / 1024).toFixed(0);

    console.log(`Sent emails:      ~${estimatedSentSize} MB (${sentCount.toLocaleString()} emails)`);
    console.log(`Scheduled emails: ~${estimatedScheduledSize} MB (${scheduledCount.toLocaleString()} emails)`);
    console.log('─'.repeat(60));
    console.log('\n');

    console.log('💡 RECOMMENDATIONS');
    console.log('─'.repeat(60));
    console.log('1. Sent emails are the main space consumer');
    console.log('2. Consider removing email content from old sent emails (>90 days)');
    console.log('3. Keep metadata but remove content field');
    console.log('4. This would save ~100-200 MB');
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeScheduledEmails();
