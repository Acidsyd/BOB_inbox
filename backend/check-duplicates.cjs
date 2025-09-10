require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const campaignId = '82ebcf15-7a68-4091-bbf8-3e599c91ed3f';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkDuplicates() {
  console.log('🔍 Campaign duplicate investigation...');
  console.log('Campaign ID:', campaignId);
  
  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
    
  if (campaignError) {
    console.error('❌ Campaign error:', campaignError);
    return;
  }
  
  console.log(`📋 Campaign: ${campaign.name}, Status: ${campaign.status}`);
  
  // Get scheduled emails for this campaign
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, to_email, status, created_at, send_at')
    .eq('campaign_id', campaignId)
    .order('created_at');
    
  if (error) {
    console.error('❌ Scheduled emails error:', error);
    return;
  }
  
  console.log(`📧 Total scheduled emails: ${emails.length}`);
  
  // Group by email address
  const groups = {};
  emails.forEach(email => {
    if (!groups[email.to_email]) groups[email.to_email] = [];
    groups[email.to_email].push(email);
  });
  
  const duplicates = Object.entries(groups).filter(([addr, list]) => list.length > 1);
  console.log(`👥 Unique recipients: ${Object.keys(groups).length}`);
  console.log(`🔄 Duplicate recipients: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n🚨 DUPLICATES FOUND:');
    duplicates.forEach(([email, list]) => {
      console.log(`\n📧 ${email}: ${list.length} scheduled emails`);
      list.forEach((item, i) => {
        console.log(`  ${i+1}. ID: ${item.id}, Status: ${item.status}, Created: ${item.created_at.slice(0,19)}`);
      });
    });
  }
  
  // Check sent emails
  const sent = emails.filter(e => e.status === 'sent');
  console.log(`\n📤 Sent emails: ${sent.length}`);
  
  const sentGroups = {};
  sent.forEach(email => {
    if (!sentGroups[email.to_email]) sentGroups[email.to_email] = [];
    sentGroups[email.to_email].push(email);
  });
  
  const sentDuplicates = Object.entries(sentGroups).filter(([addr, list]) => list.length > 1);
  console.log(`🔥 Recipients who received multiple emails: ${sentDuplicates.length}`);
  
  if (sentDuplicates.length > 0) {
    console.log('\n🔥 MULTIPLE SENDS TO SAME RECIPIENT:');
    sentDuplicates.forEach(([email, list]) => {
      console.log(`\n📧 ${email}: received ${list.length} emails`);
      list.forEach((item, i) => {
        console.log(`  ${i+1}. Sent at: ${item.send_at}, Created: ${item.created_at.slice(0,19)}`);
      });
    });
  }
  
  // Get leads for comparison
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('lead_id, email, first_name, last_name')
    .eq('lead_list_id', campaign.config.leadListId);
    
  if (!leadsError && leads) {
    console.log(`\n👥 Total leads in list: ${leads.length}`);
    console.log(`📧 Total scheduled emails: ${emails.length}`);
    console.log(`📤 Total sent emails: ${sent.length}`);
    console.log(`🔄 Difference: ${emails.length - leads.length} extra scheduled emails`);
  }
  
  console.log('\n✅ Analysis complete');
}

checkDuplicates().catch(console.error);