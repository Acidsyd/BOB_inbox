require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCampaignDuplicates() {
  const campaignId = '82ebcf15-7a68-4091-bbf8-3e599c91ed3f';
  
  console.log('🔍 Investigating campaign duplicate emails...');
  console.log(`Campaign ID: ${campaignId}`);
  
  // 1. Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
    
  if (campaignError) {
    console.error('❌ Error fetching campaign:', campaignError);
    return;
  }
  
  console.log(`📋 Campaign: ${campaign.name}, Status: ${campaign.status}`);
  
  // 2. Get all scheduled emails for this campaign
  const { data: scheduledEmails, error: emailsError } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, to_email, status, created_at, send_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });
    
  if (emailsError) {
    console.error('❌ Error fetching scheduled emails:', emailsError);
    return;
  }
  
  console.log(`📧 Total scheduled emails: ${scheduledEmails.length}`);
  
  // 3. Get all leads for this campaign
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('lead_id, email, first_name, last_name')
    .eq('lead_list_id', campaign.config.leadListId);
    
  if (leadsError) {
    console.error('❌ Error fetching leads:', leadsError);
    return;
  }
  
  console.log(`👥 Total leads: ${leads.length}`);
  
  // 4. Analyze duplicates by email address
  const emailGroups = {};
  scheduledEmails.forEach(email => {
    if (!emailGroups[email.to_email]) {
      emailGroups[email.to_email] = [];
    }
    emailGroups[email.to_email].push(email);
  });
  
  // 5. Find duplicates
  const duplicateEmails = Object.entries(emailGroups).filter(([email, emails]) => emails.length > 1);
  
  console.log(`\n🚨 DUPLICATE ANALYSIS:`);
  console.log(`Unique email addresses: ${Object.keys(emailGroups).length}`);
  console.log(`Duplicate email addresses: ${duplicateEmails.length}`);
  
  if (duplicateEmails.length > 0) {
    console.log(`\n📊 DUPLICATES FOUND:`);
    duplicateEmails.forEach(([email, emails]) => {
      console.log(`\n📧 ${email} (${emails.length} copies):`);
      emails.forEach((scheduledEmail, index) => {
        console.log(`  ${index + 1}. ID: ${scheduledEmail.id}, Status: ${scheduledEmail.status}, Created: ${scheduledEmail.created_at}`);
      });
    });
  }
  
  // 6. Check for emails sent multiple times
  const sentEmails = scheduledEmails.filter(email => email.status === 'sent');
  const sentEmailGroups = {};
  sentEmails.forEach(email => {
    if (!sentEmailGroups[email.to_email]) {
      sentEmailGroups[email.to_email] = [];
    }
    sentEmailGroups[email.to_email].push(email);
  });
  
  const sentDuplicates = Object.entries(sentEmailGroups).filter(([email, emails]) => emails.length > 1);
  
  console.log(`\n📤 SENT EMAILS ANALYSIS:`);
  console.log(`Total sent emails: ${sentEmails.length}`);
  console.log(`Unique recipients that received emails: ${Object.keys(sentEmailGroups).length}`);
  console.log(`Recipients that received multiple emails: ${sentDuplicates.length}`);
  
  if (sentDuplicates.length > 0) {
    console.log(`\n🔥 MULTIPLE SENDS TO SAME RECIPIENT:`);
    sentDuplicates.forEach(([email, emails]) => {
      console.log(`\n📧 ${email} received ${emails.length} emails:`);
      emails.forEach((scheduledEmail, index) => {
        console.log(`  ${index + 1}. Sent at: ${scheduledEmail.send_at}, Created: ${scheduledEmail.created_at}`);
      });
    });
  }
  
  // 7. Timeline analysis
  console.log(`\n⏰ TIMELINE ANALYSIS:`);
  const creationTimes = {};
  scheduledEmails.forEach(email => {
    const date = email.created_at.split('T')[0]; // Get date part
    if (!creationTimes[date]) {
      creationTimes[date] = 0;
    }
    creationTimes[date]++;
  });
  
  Object.entries(creationTimes).forEach(([date, count]) => {
    console.log(`${date}: ${count} emails created`);
  });
  
  console.log(`\n✅ Investigation complete`);
}

checkCampaignDuplicates().catch(console.error);