require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function checkBounces() {
  console.log('🔍 Checking bounces for campaign:', campaignId);

  // Check for bounced status
  const { data: bouncedEmails, count: bouncedCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .eq('status', 'bounced');

  console.log(`\n📊 Emails with status='bounced': ${bouncedCount}`);

  // Check for failed status with bounce-related error messages
  const { data: failedEmails, count: failedCount } = await supabase
    .from('scheduled_emails')
    .select('status, error_message', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .eq('status', 'failed');

  console.log(`\n📊 Emails with status='failed': ${failedCount}`);

  if (failedEmails && failedEmails.length > 0) {
    console.log('\n📧 Sample failed emails:');
    failedEmails.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. Error: ${e.error_message}`);
    });

    // Count bounce-related errors
    const bounceRelatedErrors = failedEmails.filter(e => {
      const msg = (e.error_message || '').toLowerCase();
      return msg.includes('bounce') ||
             msg.includes('domain') ||
             msg.includes('nxdomain') ||
             msg.includes('mailbox') ||
             msg.includes('recipient');
    });
    console.log(`\n📊 Failed emails with bounce-related errors: ${bounceRelatedErrors.length}`);
  }

  // Check email_bounces table
  const { data: bounceRecords, count: bounceRecordsCount } = await supabase
    .from('email_bounces')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaignId);

  console.log(`\n📊 Records in email_bounces table: ${bounceRecordsCount}`);

  if (bounceRecords && bounceRecords.length > 0) {
    console.log('\n📧 Sample bounce records:');
    bounceRecords.slice(0, 5).forEach((b, i) => {
      console.log(`  ${i + 1}. Type: ${b.bounce_type}, Email: ${b.to_email}`);
    });
  }
}

checkBounces().catch(console.error);
