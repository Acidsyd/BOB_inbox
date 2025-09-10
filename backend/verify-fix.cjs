require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const campaignId = '82ebcf15-7a68-4091-bbf8-3e599c91ed3f';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyFixStatus() {
  console.log('🔍 Verifying current campaign status after fix...');
  
  // Get current state
  const { data: emails, error } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📧 Total scheduled emails: ${emails.length}`);
  
  // Group by status
  const statusCounts = {};
  emails.forEach(email => {
    if (!statusCounts[email.status]) statusCounts[email.status] = 0;
    statusCounts[email.status]++;
  });
  
  console.log('\n📊 Status breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  
  // Group by creation time to see waves
  const waves = {};
  emails.forEach(email => {
    const time = email.created_at.split('T')[1].slice(0,8);
    if (!waves[time]) waves[time] = { total: 0, byStatus: {} };
    waves[time].total++;
    if (!waves[time].byStatus[email.status]) waves[time].byStatus[email.status] = 0;
    waves[time].byStatus[email.status]++;
  });
  
  console.log('\n⏰ Creation waves:');
  Object.entries(waves).forEach(([time, data]) => {
    console.log(`   ${time}: ${data.total} emails`);
    Object.entries(data.byStatus).forEach(([status, count]) => {
      console.log(`      ${status}: ${count}`);
    });
  });
  
  // Check for duplicates
  const emailGroups = {};
  emails.forEach(email => {
    if (!emailGroups[email.to_email]) emailGroups[email.to_email] = [];
    emailGroups[email.to_email].push(email);
  });
  
  const duplicates = Object.entries(emailGroups).filter(([addr, list]) => list.length > 1);
  console.log(`\n🔄 Duplicate recipients: ${duplicates.length} out of ${Object.keys(emailGroups).length} unique`);
  
  // Current fix effectiveness
  console.log(`\n📈 Fix Status:`);
  console.log(`   Expected emails per lead: 1`);
  console.log(`   Actual emails per lead: ${(emails.length / 22).toFixed(1)}`);
  console.log(`   Total excess emails: ${emails.length - 22}`);
  
  // Check campaign status and last updated
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('status, updated_at')
    .eq('id', campaignId)
    .single();
    
  if (campaign) {
    console.log(`\n🏷️ Campaign status: ${campaign.status}`);
    console.log(`📅 Last updated: ${campaign.updated_at}`);
    
    const lastUpdate = new Date(campaign.updated_at);
    const now = new Date();
    const timeDiff = (now - lastUpdate) / 1000;
    console.log(`⏱️ Time since last update: ${timeDiff.toFixed(1)} seconds`);
    
    if (timeDiff < 30) {
      console.log('⚠️ Campaign updated very recently - race condition protection would trigger');
    }
  }
  
  console.log('\n✅ Analysis complete');
}

verifyFixStatus().catch(console.error);