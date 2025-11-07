const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testBounceDetection() {
  const campaignId = '823de1f6-0d0d-4cfe-8a7e-8ad3fc42acc1';

  console.log('\n=== TESTING BOUNCE DETECTION ===\n');

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, organization_id')
    .eq('id', campaignId)
    .single();

  console.log(`Campaign: ${campaign.name}\n`);

  const organizationId = campaign.organization_id;

  // 1. Find all bounce messages
  console.log('=== FINDING BOUNCE MESSAGES ===\n');

  const { data: allBounces } = await supabase
    .from('conversation_messages')
    .select('from_email, subject, received_at')
    .eq('organization_id', organizationId)
    .eq('direction', 'received')
    .order('received_at', { ascending: false });

  // Filter for bounce messages
  const bounceMessages = allBounces?.filter(msg => {
    const from = msg.from_email.toLowerCase();
    const subject = (msg.subject || '').toLowerCase();

    const isFromBounceAddress = from.includes('mailer-daemon') ||
                                from.includes('postmaster');

    const hasBounceKeywords = subject.includes('undeliverable') ||
                              subject.includes('delivery status notification') ||
                              subject.includes('mail delivery failed') ||
                              subject.includes('returned mail') ||
                              subject.includes('failure notice');

    return isFromBounceAddress && hasBounceKeywords;
  }) || [];

  console.log(`Total bounce messages found: ${bounceMessages.length}\n`);

  if (bounceMessages.length === 0) {
    console.log('✅ No bounce messages found - all emails delivered successfully');
    return;
  }

  console.log('Recent bounce messages:\n');
  bounceMessages.slice(0, 10).forEach((bounce, idx) => {
    console.log(`${idx + 1}. From: ${bounce.from_email}`);
    console.log(`   Subject: ${bounce.subject}`);
    console.log(`   Received: ${bounce.received_at}\n`);
  });

  // 2. Check for recipients with failed emails in scheduled_emails
  console.log('\n=== CHECKING FAILED EMAILS ===\n');

  const { data: failedEmails } = await supabase
    .from('scheduled_emails')
    .select('to_email, error_message, send_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'failed')
    .order('send_at', { ascending: false });

  if (failedEmails && failedEmails.length > 0) {
    console.log(`Found ${failedEmails.length} failed emails:\n`);

    failedEmails.slice(0, 10).forEach((fe, idx) => {
      console.log(`${idx + 1}. ${fe.to_email}`);
      console.log(`   Error: ${fe.error_message || 'Unknown error'}`);
      console.log(`   Attempted: ${fe.send_at}\n`);
    });
  } else {
    console.log('No failed emails found in scheduled_emails');
  }

  // 3. Check for recipients with scheduled follow-ups who have bounced
  console.log('\n=== CHECKING FOR SCHEDULED FOLLOW-UPS TO BOUNCED RECIPIENTS ===\n');

  // Get all sent emails from WISE 4
  let sentEmails = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData } = await supabase
      .from('scheduled_emails')
      .select('to_email, sent_at')
      .eq('campaign_id', campaignId)
      .eq('status', 'sent')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!pageData || pageData.length === 0) {
      hasMore = false;
      break;
    }

    sentEmails.push(...pageData);
    page++;

    if (pageData.length < pageSize) {
      hasMore = false;
    }
  }

  console.log(`Total sent emails: ${sentEmails.length}\n`);

  // Extract domains from bounce messages to find affected recipients
  const bouncedDomains = new Set();
  const bouncedEmails = new Set();

  bounceMessages.forEach(bounce => {
    const subject = (bounce.subject || '').toLowerCase();

    // Try to extract recipient email from subject
    // Common patterns: "Undeliverable: [subject]" or "Delivery to user@domain failed"
    const emailMatch = subject.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/g);
    if (emailMatch) {
      emailMatch.forEach(email => {
        bouncedEmails.add(email.toLowerCase());
        const domain = email.split('@')[1];
        bouncedDomains.add(domain);
      });
    }

    // Also extract domain from bounce sender
    const from = bounce.from_email.toLowerCase();
    const domainMatch = from.match(/@([a-z0-9.-]+\.[a-z]{2,})/);
    if (domainMatch) {
      bouncedDomains.add(domainMatch[1]);
    }
  });

  console.log(`Identified ${bouncedEmails.size} bounced emails`);
  console.log(`Identified ${bouncedDomains.size} domains with bounces\n`);

  // Check for scheduled follow-ups to bounced recipients
  const recipientsWithScheduled = {};

  for (const email of bouncedEmails) {
    const { data: scheduled } = await supabase
      .from('scheduled_emails')
      .select('id, is_follow_up, send_at')
      .eq('campaign_id', campaignId)
      .eq('to_email', email)
      .eq('status', 'scheduled');

    if (scheduled && scheduled.length > 0) {
      recipientsWithScheduled[email] = scheduled;
    }
  }

  const bouncedWithScheduled = Object.keys(recipientsWithScheduled);

  if (bouncedWithScheduled.length > 0) {
    console.log(`🚨 FOUND ${bouncedWithScheduled.length} BOUNCED RECIPIENTS WITH SCHEDULED EMAILS!\n`);

    bouncedWithScheduled.forEach((email, idx) => {
      const scheduled = recipientsWithScheduled[email];
      console.log(`${idx + 1}. ${email}`);
      console.log(`   Scheduled emails: ${scheduled.length}`);
      console.log(`   Follow-ups: ${scheduled.filter(s => s.is_follow_up).length}`);
      console.log(`   Next send: ${scheduled[0].send_at}\n`);
    });

    console.log('✅ After fix deployment, these emails will be automatically skipped\n');
  } else {
    console.log('✅ No scheduled emails for bounced recipients\n');
  }

  // 4. Summary
  console.log('=== SUMMARY ===\n');
  console.log(`Bounce messages detected: ${bounceMessages.length}`);
  console.log(`Failed emails in database: ${failedEmails?.length || 0}`);
  console.log(`Recipients with scheduled emails: ${bouncedWithScheduled.length}`);
  console.log(`Total scheduled emails to be skipped: ${Object.values(recipientsWithScheduled).flat().length}\n`);

  console.log('=== TEST COMPLETE ===\n');
}

testBounceDetection()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
