const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

async function restoreSentEmails() {
  console.log('\n🔄 RESTORING SENT EMAILS FOR CAMPAIGN\n');
  console.log(`Campaign ID: ${campaignId}\n`);

  // Step 1: Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Campaign not found:', campaignError);
    return;
  }

  console.log(`📋 Campaign: ${campaign.name}`);
  console.log(`🏢 Organization: ${campaign.organization_id}`);
  console.log(`📧 Lead List: ${campaign.config.leadListId}\n`);

  // Step 2: Find sent emails in conversation_messages that don't have scheduled_emails
  console.log('🔍 Searching for sent emails in conversation_messages...\n');

  // Get all conversation messages that were SENT from this campaign
  let allSentMessages = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: messagesPage, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('direction', 'sent')
      .eq('campaign_id', campaignId)
      .eq('organization_id', campaign.organization_id)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('❌ Error fetching messages:', error);
      break;
    }

    if (!messagesPage || messagesPage.length === 0) break;
    allSentMessages = allSentMessages.concat(messagesPage);
    if (messagesPage.length < pageSize) break;
    page++;
  }

  console.log(`📨 Found ${allSentMessages.length} sent messages in conversations\n`);

  if (allSentMessages.length === 0) {
    console.log('⚠️ No sent messages found in conversations. Nothing to restore.\n');
    return;
  }

  // Step 3: Get all existing scheduled_emails for this campaign
  let allScheduledEmails = [];
  page = 0;

  while (true) {
    const { data: emailsPage } = await supabase
      .from('scheduled_emails')
      .select('id, to_email, message_id_header, status')
      .eq('campaign_id', campaignId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!emailsPage || emailsPage.length === 0) break;
    allScheduledEmails = allScheduledEmails.concat(emailsPage);
    if (emailsPage.length < pageSize) break;
    page++;
  }

  console.log(`📧 Current scheduled_emails: ${allScheduledEmails.length}`);

  // Create a Set of message_id_headers that already exist in scheduled_emails
  const existingMessageIds = new Set(
    allScheduledEmails
      .filter(e => e.message_id_header)
      .map(e => e.message_id_header)
  );

  const existingToEmails = new Set(
    allScheduledEmails.map(e => e.to_email.toLowerCase())
  );

  console.log(`📌 Existing message IDs: ${existingMessageIds.size}`);
  console.log(`📌 Existing recipient emails: ${existingToEmails.size}\n`);

  // Step 4: Find sent messages that don't have corresponding scheduled_emails
  const missingEmails = allSentMessages.filter(msg => {
    // Check if this message_id already exists
    if (msg.message_id_header && existingMessageIds.has(msg.message_id_header)) {
      return false;
    }
    // Check if we already have a scheduled_email to this recipient
    if (existingToEmails.has(msg.to_email.toLowerCase())) {
      return false;
    }
    return true;
  });

  console.log(`⚠️ Missing scheduled_emails: ${missingEmails.length}\n`);

  if (missingEmails.length === 0) {
    console.log('✅ All sent messages already have scheduled_emails! Nothing to restore.\n');
    return;
  }

  // Step 5: Get leads to map to_email -> lead_id
  let allLeads = [];
  page = 0;

  while (true) {
    const { data: leadsPage } = await supabase
      .from('leads')
      .select('id, email, organization_id')
      .eq('lead_list_id', campaign.config.leadListId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!leadsPage || leadsPage.length === 0) break;
    allLeads = allLeads.concat(leadsPage);
    if (leadsPage.length < pageSize) break;
    page++;
  }

  const emailToLeadMap = new Map(
    allLeads.map(lead => [lead.email.toLowerCase(), lead])
  );

  console.log(`📋 Total leads in list: ${allLeads.length}\n`);

  // Step 6: Get email accounts to find email_account_id
  const { data: emailAccounts } = await supabase
    .from('oauth2_tokens')
    .select('id, email')
    .eq('organization_id', campaign.organization_id)
    .eq('status', 'linked_to_account');

  const fromEmailToAccountMap = new Map(
    emailAccounts.map(acc => [acc.email.toLowerCase(), acc.id])
  );

  console.log(`📧 Available email accounts: ${emailAccounts.length}\n`);

  // Step 7: Create scheduled_emails for missing sent messages
  console.log('💾 Creating missing scheduled_emails...\n');

  const recordsToInsert = [];

  for (const msg of missingEmails) {
    const lead = emailToLeadMap.get(msg.to_email.toLowerCase());
    const emailAccountId = fromEmailToAccountMap.get(msg.from_email.toLowerCase());

    if (!lead) {
      console.log(`⚠️ Skipping - Lead not found for: ${msg.to_email}`);
      continue;
    }

    if (!emailAccountId) {
      console.log(`⚠️ Skipping - Email account not found for: ${msg.from_email}`);
      continue;
    }

    recordsToInsert.push({
      campaign_id: campaignId,
      lead_id: lead.id,
      organization_id: campaign.organization_id,
      to_email: msg.to_email,
      from_email: msg.from_email,
      email_account_id: emailAccountId,
      subject: msg.subject || campaign.config.emailSubject,
      content: msg.content_html || msg.content_plain || campaign.config.emailContent,
      status: 'sent',  // CRITICAL: Mark as 'sent' to preserve conversation history
      message_id_header: msg.message_id_header,
      send_at: msg.sent_at,
      sent_at: msg.sent_at,
      created_at: msg.sent_at,
      updated_at: new Date().toISOString(),
      sequence_step: 0  // Assume main email for now
    });
  }

  console.log(`📝 Records to restore: ${recordsToInsert.length}\n`);

  if (recordsToInsert.length === 0) {
    console.log('⚠️ No valid records to restore (all missing leads or email accounts)\n');
    return;
  }

  // Insert in batches
  const batchSize = 100;
  let totalRestored = 0;

  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);

    const { error: insertError } = await supabase
      .from('scheduled_emails')
      .insert(batch);

    if (insertError) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError.message);
    } else {
      totalRestored += batch.length;
      console.log(`✅ Restored batch ${Math.floor(i / batchSize) + 1}: ${batch.length} emails (${totalRestored} total)`);
    }
  }

  // Final verification
  const { count: finalCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'sent');

  console.log('\n' + '='.repeat(60));
  console.log('✅ RESTORATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`📨 Sent messages found in conversations: ${allSentMessages.length}`);
  console.log(`📧 Scheduled emails before restoration: ${allScheduledEmails.length}`);
  console.log(`➕ Emails restored: ${totalRestored}`);
  console.log(`📊 Total scheduled_emails now: ${finalCount}`);
  console.log(`✉️ Emails with 'sent' status: ${sentCount}`);
  console.log('='.repeat(60) + '\n');
}

restoreSentEmails().catch(console.error);
