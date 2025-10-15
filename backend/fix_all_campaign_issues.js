const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '6e2a8bda-00a7-4615-a4db-289c29a86afb';

async function fixAllCampaignIssues() {
  console.log('='.repeat(80));
  console.log('FIX ALL CAMPAIGN ISSUES');
  console.log('='.repeat(80));
  console.log('');

  // Step 1: Fix skipped emails
  console.log('📧 Step 1: Checking for skipped emails...');

  const { data: skippedEmails, count: skippedCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact' })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'skipped');

  console.log(`Found ${skippedCount} skipped emails`);

  if (skippedCount > 0) {
    console.log(`Updating ${skippedCount} skipped emails to scheduled status...`);

    const { error } = await supabase
      .from('scheduled_emails')
      .update({
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('status', 'skipped');

    if (error) {
      console.error('❌ Failed to update skipped emails:', error);
    } else {
      console.log(`✅ Updated ${skippedCount} emails from skipped to scheduled`);
    }
  }
  console.log('');

  // Step 2: Check what we have now
  console.log('📊 Step 2: Checking current state...');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', CAMPAIGN_ID)
    .single();

  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', campaign.config.leadListId);

  const { data: allEmails, count: totalEmails } = await supabase
    .from('scheduled_emails')
    .select('id, status, lead_id', { count: 'exact' })
    .eq('campaign_id', CAMPAIGN_ID);

  const hasFollowUp = campaign.config.emailSequence && campaign.config.emailSequence.length > 0;
  const followUpCount = hasFollowUp ? campaign.config.emailSequence.length : 0;
  const expectedTotal = totalLeads * (1 + followUpCount);

  console.log(`   Total leads: ${totalLeads}`);
  console.log(`   Follow-ups per lead: ${followUpCount}`);
  console.log(`   Expected emails: ${expectedTotal}`);
  console.log(`   Current emails: ${totalEmails}`);
  console.log(`   Missing: ${expectedTotal - totalEmails}`);
  console.log('');

  // Step 3: Check if we need to create missing emails
  if (totalEmails < expectedTotal) {
    console.log('⚠️  Step 3: Missing emails detected!');
    console.log(`   ${expectedTotal - totalEmails} emails were never created.`);
    console.log('');
    console.log('💡 RECOMMENDATION:');
    console.log('   The campaign needs to be restarted to create all missing emails.');
    console.log('   This usually happens if:');
    console.log('   - Campaign was started with fewer leads initially');
    console.log('   - Leads were added to the list after campaign start');
    console.log('   - Campaign creation was interrupted');
    console.log('');
    console.log('   To fix this, you should STOP and START the campaign again.');
    console.log('   The backend will create all missing scheduled_emails on start.');
  } else {
    console.log('✅ Step 3: All emails exist in database');
  }
  console.log('');

  // Step 4: Count current status breakdown
  console.log('📊 Step 4: Current status breakdown:');
  const statusCounts = {};
  allEmails.forEach(e => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  });

  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  console.log('');

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Current state: ${statusCounts['scheduled'] || 0} scheduled, ${statusCounts['sent'] || 0} sent`);

  if (skippedCount > 0) {
    console.log(`✅ Fixed ${skippedCount} skipped emails`);
  }

  if (totalEmails < expectedTotal) {
    console.log(`⚠️  ${expectedTotal - totalEmails} emails still need to be created`);
    console.log('   👉 Action required: Stop and restart the campaign to create missing emails');
  } else {
    console.log('✅ All emails created');
  }
  console.log('='.repeat(80));
}

fixAllCampaignIssues().catch(console.error);
