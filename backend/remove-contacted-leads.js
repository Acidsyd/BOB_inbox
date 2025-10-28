const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function removeContactedLeads() {
  try {
    const leadListId = 'f9ed0ba1-4ca1-4e42-8e99-4bcf863d4439';
    const campaignId = '006fcfbc-37b6-4c0e-af47-5eabb00d7b58'; // WISE 3

    console.log('\n🗑️  REMOVING CONTACTED LEADS FROM LEAD LIST\n');
    console.log('='.repeat(70));

    // Step 1: Get total leads in list
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', leadListId)
      .eq('status', 'active');

    console.log(`\n📊 Lead List Stats:`);
    console.log(`   Total active leads: ${totalLeads}`);

    // Step 2: Find all contacted lead IDs (sent, failed, bounced emails)
    console.log('\n🔍 Finding contacted leads...');

    const { data: contactedEmails } = await supabase
      .from('scheduled_emails')
      .select('lead_id')
      .eq('campaign_id', campaignId)
      .in('status', ['sent', 'failed', 'bounced'])
      .eq('is_follow_up', false); // Only check initial emails

    if (!contactedEmails || contactedEmails.length === 0) {
      console.log('\n✅ No contacted leads found. Nothing to remove.\n');
      return;
    }

    // Get unique lead IDs
    const contactedLeadIds = [...new Set(contactedEmails.map(e => e.lead_id))];

    console.log(`   Found ${contactedLeadIds.length} unique contacted leads`);

    // Step 3: Count how many will remain
    const remainingLeads = totalLeads - contactedLeadIds.length;

    console.log(`\n📊 Impact Analysis:`);
    console.log(`   Leads to DELETE: ${contactedLeadIds.length}`);
    console.log(`   Leads to KEEP: ${remainingLeads}`);
    console.log(`   Percentage removed: ${Math.round((contactedLeadIds.length / totalLeads) * 100)}%`);

    // Step 4: Get sample of leads to be deleted
    const { data: sampleLeads } = await supabase
      .from('leads')
      .select('email, first_name, last_name, company')
      .in('id', contactedLeadIds.slice(0, 5));

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
    console.log(`This will DELETE ${contactedLeadIds.length} leads from the database.`);
    console.log('This action CANNOT be undone.\n');
    console.log('To proceed, run this script with --confirm flag:\n');
    console.log('  node remove-contacted-leads.js --confirm\n');

    // Check for confirmation flag
    const isConfirmed = process.argv.includes('--confirm');

    if (!isConfirmed) {
      console.log('❌ Deletion aborted (no --confirm flag)\n');
      return;
    }

    // Step 5: DELETE contacted leads
    console.log('\n🗑️  DELETING contacted leads...\n');

    // Delete in batches to avoid timeout
    const BATCH_SIZE = 100;
    let totalDeleted = 0;

    for (let i = 0; i < contactedLeadIds.length; i += BATCH_SIZE) {
      const batch = contactedLeadIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(contactedLeadIds.length / BATCH_SIZE);

      console.log(`📦 Batch ${batchNum}/${totalBatches}: Deleting ${batch.length} leads...`);

      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`   ❌ Error deleting batch ${batchNum}:`, error.message);
      } else {
        totalDeleted += batch.length;
        console.log(`   ✅ Deleted ${totalDeleted}/${contactedLeadIds.length} leads`);
      }
    }

    // Verify
    const { count: remainingCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('lead_list_id', leadListId)
      .eq('status', 'active');

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ DELETION COMPLETE!\n');
    console.log(`   Deleted: ${totalDeleted} leads`);
    console.log(`   Remaining: ${remainingCount} leads`);
    console.log(`   Original: ${totalLeads} leads\n`);

    console.log('⚠️  IMPORTANT NEXT STEPS:\n');
    console.log('1. The WISE 3 campaign still has scheduled_emails for deleted leads');
    console.log('2. You should STOP and RESTART the campaign to rebuild the schedule');
    console.log('3. Or manually delete scheduled_emails for contacted leads\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

removeContactedLeads();
