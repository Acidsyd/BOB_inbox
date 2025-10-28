const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function removeSentFailedLeads() {
  try {
    const leadListId = 'f9ed0ba1-4ca1-4e42-8e99-4bcf863d4439';
    const campaignId = '006fcfbc-37b6-4c0e-af47-5eabb00d7b58';

    console.log('\n🗑️  REMOVING SENT & FAILED LEADS\n');
    console.log('='.repeat(70));

    // Step 1: Current stats
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', leadListId)
      .eq('status', 'active');

    console.log(`\n📊 Current Lead List:`);
    console.log(`   Total active leads: ${totalLeads}`);

    // Step 2: Find leads with sent or failed emails
    console.log('\n🔍 Finding leads with sent/failed emails...');

    const { data: sentFailedEmails } = await supabase
      .from('scheduled_emails')
      .select('lead_id, status')
      .eq('campaign_id', campaignId)
      .in('status', ['sent', 'failed'])
      .eq('is_follow_up', false); // Only check initial emails

    if (!sentFailedEmails || sentFailedEmails.length === 0) {
      console.log('\n✅ No sent/failed emails found. Nothing to remove.\n');
      return;
    }

    // Get unique lead IDs
    const leadIdsToDelete = [...new Set(sentFailedEmails.map(e => e.lead_id))];

    const sentCount = sentFailedEmails.filter(e => e.status === 'sent').length;
    const failedCount = sentFailedEmails.filter(e => e.status === 'failed').length;

    console.log(`   Sent emails: ${sentCount}`);
    console.log(`   Failed emails: ${failedCount}`);
    console.log(`   Unique leads to delete: ${leadIdsToDelete.length}`);

    // Step 3: Calculate impact
    const remainingLeads = totalLeads - leadIdsToDelete.length;

    console.log(`\n📊 Impact Analysis:`);
    console.log(`   Leads to DELETE: ${leadIdsToDelete.length}`);
    console.log(`   Leads to KEEP: ${remainingLeads}`);
    console.log(`   Percentage removed: ${Math.round((leadIdsToDelete.length / totalLeads) * 100)}%`);

    // Step 4: Get sample
    const { data: sampleLeads } = await supabase
      .from('leads')
      .select('email, first_name, last_name, company')
      .in('id', leadIdsToDelete.slice(0, 5));

    if (sampleLeads && sampleLeads.length > 0) {
      console.log(`\n📋 Sample leads to be removed (first 5):\n`);
      sampleLeads.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.email}`);
        console.log(`   Name: ${lead.first_name} ${lead.last_name}`);
        console.log(`   Company: ${lead.company || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n⚠️  CONFIRMATION REQUIRED\n');
    console.log(`This will DELETE ${leadIdsToDelete.length} leads from the database.`);
    console.log('This action CANNOT be undone.\n');
    console.log('To proceed, run this script with --confirm flag:\n');
    console.log('  node remove-sent-failed-leads.js --confirm\n');

    // Check for confirmation
    const isConfirmed = process.argv.includes('--confirm');

    if (!isConfirmed) {
      console.log('❌ Deletion aborted (no --confirm flag)\n');
      return;
    }

    console.log('\n🗑️  DELETING leads with sent/failed emails...\n');

    // Step 5: First, delete bounce records for these emails
    console.log('Step 1: Deleting bounce records...');

    const { data: emailIds } = await supabase
      .from('scheduled_emails')
      .select('id')
      .in('lead_id', leadIdsToDelete);

    if (emailIds && emailIds.length > 0) {
      const { error: bounceError } = await supabase
        .from('email_bounces')
        .delete()
        .in('scheduled_email_id', emailIds.map(e => e.id));

      if (bounceError) {
        console.log(`   ⚠️  Bounce deletion error: ${bounceError.message}`);
      } else {
        console.log(`   ✅ Deleted bounce records`);
      }
    }

    // Step 6: Delete scheduled_emails for these leads
    console.log('\nStep 2: Deleting scheduled_emails...');

    const { error: emailsError } = await supabase
      .from('scheduled_emails')
      .delete()
      .in('lead_id', leadIdsToDelete);

    if (emailsError) {
      console.log(`   ⚠️  Error: ${emailsError.message}`);
    } else {
      console.log(`   ✅ Deleted scheduled_emails`);
    }

    // Step 7: Delete leads in batches
    console.log('\nStep 3: Deleting leads...\n');

    const BATCH_SIZE = 100;
    let totalDeleted = 0;

    for (let i = 0; i < leadIdsToDelete.length; i += BATCH_SIZE) {
      const batch = leadIdsToDelete.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(leadIdsToDelete.length / BATCH_SIZE);

      console.log(`📦 Batch ${batchNum}/${totalBatches}: Deleting ${batch.length} leads...`);

      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        totalDeleted += batch.length;
        console.log(`   ✅ Deleted ${totalDeleted}/${leadIdsToDelete.length} leads`);
      }
    }

    // Verify
    const { count: finalLeadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', leadListId)
      .eq('status', 'active');

    const { count: finalEmailCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ DELETION COMPLETE!\n');
    console.log(`   Deleted leads: ${totalDeleted}`);
    console.log(`   Remaining leads: ${finalLeadCount}`);
    console.log(`   Remaining scheduled_emails: ${finalEmailCount}`);
    console.log(`   Original leads: ${totalLeads}\n`);

    console.log('📊 Final Stats:\n');

    // Get email breakdown
    const statuses = ['scheduled', 'sent', 'failed', 'skipped'];

    console.log('Initial emails:');
    for (const status of statuses) {
      const { count } = await supabase
        .from('scheduled_emails')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('is_follow_up', false)
        .eq('status', status);
      if (count > 0) console.log(`   ${status}: ${count}`);
    }

    console.log('\n✅ Clean lead list ready for fresh campaign!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

removeSentFailedLeads();
