const { createClient } = require('@supabase/supabase-js');
const { fetchAllWithPagination } = require('./src/utils/supabaseHelpers');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '943f4c22-5898-4137-b86a-beb99e625188';

async function checkAllEmails() {
  console.log('🔍 FETCHING ALL CAMPAIGN EMAILS WITH PAGINATION\n');

  // Use pagination helper to get ALL emails
  const { data: allEmails, count: totalCount } = await fetchAllWithPagination(supabase, 'scheduled_emails', {
    select: 'status, sent_at, send_at',
    filters: [
      { column: 'campaign_id', value: CAMPAIGN_ID }
    ]
  });

  console.log(`📊 TOTAL EMAILS: ${totalCount}`);
  console.log(`   Fetched: ${allEmails?.length || 0}\n`);

  // Count by status
  const statusCounts = {};
  allEmails?.forEach(email => {
    statusCounts[email.status] = (statusCounts[email.status] || 0) + 1;
  });

  console.log('📊 STATUS BREAKDOWN:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  console.log('');

  // Count emails with sent_at
  const emailsWithSentAt = allEmails?.filter(e => e.sent_at !== null) || [];
  console.log(`📤 EMAILS WITH sent_at TIMESTAMP: ${emailsWithSentAt.length}`);

  if (emailsWithSentAt.length > 0) {
    console.log('   First 10:');
    emailsWithSentAt.slice(0, 10).forEach((email, i) => {
      console.log(`   ${i + 1}. Status: ${email.status}, Sent: ${email.sent_at}`);
    });
  }
  console.log('');

  // Check timing of scheduled emails (to see if timing got messed up)
  const skippedEmails = allEmails?.filter(e => e.status === 'skipped' && e.sent_at === null) || [];
  console.log(`⏰ TIMING ANALYSIS FOR SKIPPED (NOT YET SENT) EMAILS:`);
  console.log(`   Total skipped without sent_at: ${skippedEmails.length}\n`);

  if (skippedEmails.length > 0) {
    // Sort by send_at
    skippedEmails.sort((a, b) => new Date(a.send_at) - new Date(b.send_at));

    console.log('   First 10 scheduled times:');
    skippedEmails.slice(0, 10).forEach((email, i) => {
      console.log(`   ${i + 1}. ${email.send_at}`);
    });

    // Check timing gaps
    console.log('\n   Timing gaps between first 10:');
    for (let i = 1; i < Math.min(10, skippedEmails.length); i++) {
      const prev = new Date(skippedEmails[i - 1].send_at);
      const curr = new Date(skippedEmails[i].send_at);
      const minutesDiff = Math.round((curr - prev) / (1000 * 60));
      console.log(`   Gap ${i}: ${minutesDiff} minutes`);
    }
  }
}

checkAllEmails().catch(console.error);
