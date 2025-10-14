const { createClient } = require('@supabase/supabase-js');
const { fetchAllWithPagination } = require('./src/utils/supabaseHelpers');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkMissingEmails() {
  const campaignId = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

  console.log('🔍 INVESTIGATING MISSING EMAILS\n');

  // Get campaign info
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, config')
    .eq('id', campaignId)
    .single();

  console.log('📊 Campaign Info:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Lead List ID: ${campaign.config.leadListId}`);
  console.log('');

  // Get total leads in the list
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', campaign.config.leadListId);

  console.log(`📋 Total leads in list: ${totalLeads}`);
  console.log('');

  // Get all scheduled_emails for this campaign (all statuses) with pagination
  const { data: allEmails } = await fetchAllWithPagination(supabase, 'scheduled_emails', {
    select: 'id, status, to_email, is_follow_up',
    filters: [
      { column: 'campaign_id', value: campaignId }
    ]
  });

  console.log(`📧 Total scheduled_emails records: ${allEmails?.length || 0}`);
  console.log('');

  // Count by status
  const statusCounts = {};
  allEmails.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });

  console.log('📊 Breakdown by status:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  console.log('');

  // Count initial vs follow-up
  const initialEmails = allEmails.filter(e => !e.is_follow_up).length;
  const followUpEmails = allEmails.filter(e => e.is_follow_up).length;

  console.log('📊 Breakdown by type:');
  console.log(`   Initial emails: ${initialEmails}`);
  console.log(`   Follow-up emails: ${followUpEmails}`);
  console.log('');

  // Calculate expected
  const hasFollowUps = campaign.config.emailSequence && campaign.config.emailSequence.length > 0;
  const followUpCount = hasFollowUps ? campaign.config.emailSequence.length : 0;
  const expectedTotal = totalLeads * (1 + followUpCount);

  console.log('🧮 Math Check:');
  console.log(`   Total leads: ${totalLeads}`);
  console.log(`   Follow-ups per lead: ${followUpCount}`);
  console.log(`   Expected total emails: ${totalLeads} × ${1 + followUpCount} = ${expectedTotal}`);
  console.log(`   Actual total emails: ${allEmails.length}`);
  console.log(`   Missing: ${expectedTotal - allEmails.length}`);
  console.log('');

  // Current status
  const sent = statusCounts['sent'] || 0;
  const scheduled = statusCounts['scheduled'] || 0;

  console.log('📊 Current Status:');
  console.log(`   Sent: ${sent}`);
  console.log(`   Scheduled: ${scheduled}`);
  console.log(`   Expected remaining: ${expectedTotal - sent} (${expectedTotal} - ${sent} sent)`);
  console.log(`   Actual remaining: ${scheduled}`);
  console.log(`   Discrepancy: ${(expectedTotal - sent) - scheduled} emails`);
  console.log('');

  // Check for emails in other statuses
  const otherStatuses = Object.entries(statusCounts).filter(([status]) =>
    status !== 'sent' && status !== 'scheduled'
  );

  if (otherStatuses.length > 0) {
    console.log('⚠️  Emails in other statuses:');
    otherStatuses.forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log('');
  }

  // If there are missing emails, check if they were never created
  if (allEmails.length < expectedTotal) {
    console.log('🔍 ISSUE: Not all emails were created!');
    console.log(`   Campaign might not have created all scheduled emails on start.`);
    console.log(`   Missing ${expectedTotal - allEmails.length} email records.`);
    console.log('');
  }

  // Get unique lead emails that have been contacted
  const uniqueLeadsContacted = new Set(allEmails.map(e => e.to_email)).size;
  console.log(`👥 Unique leads contacted/scheduled: ${uniqueLeadsContacted}/${totalLeads}`);
  console.log(`   Leads not yet in system: ${totalLeads - uniqueLeadsContacted}`);
}

checkMissingEmails().catch(console.error);
