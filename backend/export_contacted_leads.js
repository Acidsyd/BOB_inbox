const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function exportContactedLeads() {
  const campaignId = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

  console.log('📊 Fetching contacted leads for campaign...');

  // Get all sent emails with lead information
  const { data: sentEmails, error } = await supabase
    .from('scheduled_emails')
    .select(`
      id,
      to_email,
      from_email,
      subject,
      sent_at,
      status,
      lead_id,
      is_follow_up,
      message_id_header
    `)
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching sent emails:', error);
    return;
  }

  if (!sentEmails || sentEmails.length === 0) {
    console.log('📭 No sent emails found for this campaign');
    return;
  }

  console.log(`✅ Found ${sentEmails.length} sent emails`);

  // Get lead details for all contacted leads
  const leadIds = [...new Set(sentEmails.map(e => e.lead_id).filter(Boolean))];

  let leadsMap = {};
  if (leadIds.length > 0) {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name, company, title')
      .in('id', leadIds);

    if (leads && !leadsError) {
      leads.forEach(lead => {
        leadsMap[lead.id] = lead;
      });
      console.log(`✅ Fetched details for ${leads.length} leads`);
    }
  }

  // Prepare CSV data
  const csvRows = [];

  // CSV Header
  csvRows.push([
    'Lead Email',
    'First Name',
    'Last Name',
    'Company',
    'Title',
    'Sent From',
    'Subject',
    'Sent At',
    'Is Follow-up',
    'Message ID',
    'Lead ID'
  ].join(','));

  // CSV Data rows
  sentEmails.forEach(email => {
    const lead = leadsMap[email.lead_id] || {};

    const row = [
      `"${email.to_email || ''}"`,
      `"${lead.first_name || ''}"`,
      `"${lead.last_name || ''}"`,
      `"${lead.company || ''}"`,
      `"${lead.title || ''}"`,
      `"${email.from_email || ''}"`,
      `"${(email.subject || '').replace(/"/g, '""')}"`, // Escape quotes in subject
      `"${email.sent_at || ''}"`,
      `"${email.is_follow_up ? 'Yes' : 'No'}"`,
      `"${email.message_id_header || ''}"`,
      `"${email.lead_id || ''}"`
    ].join(',');

    csvRows.push(row);
  });

  // Create CSV content
  const csvContent = csvRows.join('\n');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `contacted_leads_${campaignId.substring(0, 8)}_${timestamp}.csv`;
  const filepath = path.join(__dirname, filename);

  // Write to file
  fs.writeFileSync(filepath, csvContent, 'utf8');

  console.log(`\n✅ CSV exported successfully!`);
  console.log(`📄 File: ${filename}`);
  console.log(`📍 Path: ${filepath}`);
  console.log(`📊 Total records: ${sentEmails.length}`);

  // Show summary
  const uniqueLeads = new Set(sentEmails.map(e => e.to_email)).size;
  const followUps = sentEmails.filter(e => e.is_follow_up).length;
  const initialEmails = sentEmails.length - followUps;

  console.log(`\n📈 Summary:`);
  console.log(`   Unique leads contacted: ${uniqueLeads}`);
  console.log(`   Initial emails: ${initialEmails}`);
  console.log(`   Follow-up emails: ${followUps}`);
}

exportContactedLeads().catch(console.error);
