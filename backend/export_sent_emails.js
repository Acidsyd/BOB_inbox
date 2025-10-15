const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function exportSentEmails() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

  console.log('\n=== Exporting Sent Emails from Campaign ===\n');

  // Get campaign details
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, organization_id')
    .eq('id', campaignId)
    .single();

  console.log('Campaign:', campaign.name);
  console.log('Organization ID:', campaign.organization_id);

  // Get all sent emails with lead details
  const { data: sentEmails } = await supabase
    .from('scheduled_emails')
    .select(`
      id,
      lead_id,
      status,
      sent_at,
      sequence_step,
      message_id,
      leads (
        email,
        first_name,
        last_name,
        company
      )
    `)
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: true });

  console.log(`\nFound ${sentEmails.length} sent emails\n`);

  if (sentEmails.length === 0) {
    console.log('No sent emails found.');
    return;
  }

  // Get conversation messages for these emails
  const messageIds = sentEmails.map(e => e.message_id).filter(Boolean);

  let conversationData = [];
  if (messageIds.length > 0) {
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select(`
        message_id_header,
        subject,
        body_preview,
        sent_at,
        conversations (
          id,
          participants
        )
      `)
      .in('message_id_header', messageIds);

    conversationData = messages || [];
  }

  // Create CSV content
  const csvRows = [];
  csvRows.push('Email,First Name,Last Name,Company,Sent At,Sequence Step,Subject,Message ID,Conversation ID');

  sentEmails.forEach(email => {
    const lead = email.leads;
    const conversationMsg = conversationData.find(m => m.message_id_header === email.message_id);

    const row = [
      lead?.email || '',
      lead?.first_name || '',
      lead?.last_name || '',
      lead?.company || '',
      email.sent_at || '',
      email.sequence_step,
      conversationMsg?.subject ? `"${conversationMsg.subject.replace(/"/g, '""')}"` : '',
      email.message_id || '',
      conversationMsg?.conversations?.id || ''
    ];

    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');

  // Save to file
  const filename = `sent_emails_${campaignId}_${Date.now()}.csv`;
  fs.writeFileSync(filename, csvContent);

  console.log(`✅ Exported ${sentEmails.length} sent emails to: ${filename}`);
  console.log('\nBreakdown by sequence step:');

  const byStep = {};
  sentEmails.forEach(e => {
    const step = e.sequence_step || 0;
    byStep[step] = (byStep[step] || 0) + 1;
  });

  Object.keys(byStep).sort((a,b) => a-b).forEach(step => {
    const label = step == 0 ? 'Initial emails' : `Follow-up ${step}`;
    console.log(`  ${label}: ${byStep[step]}`);
  });

  console.log(`\nCSV file saved at: ${__dirname}/${filename}`);
}

exportSentEmails().catch(console.error);
