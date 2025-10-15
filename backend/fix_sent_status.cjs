const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

async function fixSentStatus() {
  console.log('\n🔧 FIXING SENT EMAIL STATUS\n');
  console.log(`Campaign ID: ${campaignId}\n`);

  // Step 1: Get all sent messages from conversation_messages
  let allSentMessages = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: messagesPage } = await supabase
      .from('conversation_messages')
      .select('to_email, sent_at, message_id_header')
      .eq('direction', 'sent')
      .eq('campaign_id', campaignId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!messagesPage || messagesPage.length === 0) break;
    allSentMessages = allSentMessages.concat(messagesPage);
    if (messagesPage.length < pageSize) break;
    page++;
  }

  console.log(`📨 Found ${allSentMessages.length} sent messages in conversation_messages\n`);

  if (allSentMessages.length === 0) {
    console.log('⚠️ No sent messages found. Nothing to fix.\n');
    return;
  }

  // Step 2: Get all scheduled_emails for this campaign
  let allScheduledEmails = [];
  page = 0;

  while (true) {
    const { data: emailsPage } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, status, message_id_header')
      .eq('campaign_id', campaignId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!emailsPage || emailsPage.length === 0) break;
    allScheduledEmails = allScheduledEmails.concat(emailsPage);
    if (emailsPage.length < pageSize) break;
    page++;
  }

  console.log(`📧 Total scheduled_emails: ${allScheduledEmails.length}\n`);

  // Step 3: Create lookup maps
  const messageIdToSentAt = new Map();
  const emailToSentAt = new Map();

  allSentMessages.forEach(msg => {
    if (msg.message_id_header) {
      messageIdToSentAt.set(msg.message_id_header, msg.sent_at);
    }
    emailToSentAt.set(msg.to_email.toLowerCase(), msg.sent_at);
  });

  // Step 4: Find scheduled_emails that should be marked as 'sent'
  const emailsToUpdate = [];

  allScheduledEmails.forEach(email => {
    // Check if this email was actually sent
    let sentAt = null;

    if (email.message_id_header && messageIdToSentAt.has(email.message_id_header)) {
      sentAt = messageIdToSentAt.get(email.message_id_header);
    } else if (emailToSentAt.has(email.to_email.toLowerCase())) {
      sentAt = emailToSentAt.get(email.to_email.toLowerCase());
    }

    if (sentAt && email.status !== 'sent') {
      emailsToUpdate.push({ id: email.id, to_email: email.to_email, sent_at: sentAt });
    }
  });

  console.log(`🔄 Emails to update from 'scheduled' to 'sent': ${emailsToUpdate.length}\n`);

  if (emailsToUpdate.length === 0) {
    console.log('✅ All sent emails already have correct status!\n');
    return;
  }

  // Step 5: Update in batches
  const batchSize = 50;
  let totalUpdated = 0;

  for (let i = 0; i < emailsToUpdate.length; i += batchSize) {
    const batch = emailsToUpdate.slice(i, i + batchSize);

    for (const email of batch) {
      const { error } = await supabase
        .from('scheduled_emails')
        .update({
          status: 'sent',
          sent_at: email.sent_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', email.id);

      if (error) {
        console.error(`❌ Error updating ${email.to_email}:`, error.message);
      } else {
        totalUpdated++;
      }
    }

    console.log(`✅ Updated ${totalUpdated}/${emailsToUpdate.length} emails...`);
  }

  // Step 6: Verify final counts
  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'sent');

  const { count: scheduledCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'scheduled');

  const { count: total } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  console.log('\n' + '='.repeat(60));
  console.log('✅ STATUS FIX COMPLETE');
  console.log('='.repeat(60));
  console.log(`📨 Sent messages in conversations: ${allSentMessages.length}`);
  console.log(`✉️ Emails marked as 'sent': ${sentCount}`);
  console.log(`📅 Emails marked as 'scheduled': ${scheduledCount}`);
  console.log(`📊 Total scheduled_emails: ${total}`);
  console.log(`🔄 Updated: ${totalUpdated} emails`);
  console.log('='.repeat(60) + '\n');
}

fixSentStatus().catch(console.error);
