const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const LEAD_LIST_ID = 'f9ed0ba1-4ca1-4e42-8e99-4bcf863d4439';

async function removeContactedLeads() {
  console.log('='.repeat(80));
  console.log('REMOVING CONTACTED LEADS FROM LIST');
  console.log('='.repeat(80));
  console.log(`Lead List ID: ${LEAD_LIST_ID}\n`);

  // Step 1: Get all leads in this list
  const { data: allLeads, error: leadsError } = await supabase
    .from('leads')
    .select('id, email, first_name, last_name')
    .eq('lead_list_id', LEAD_LIST_ID);

  if (leadsError) {
    console.error('❌ Failed to fetch leads:', leadsError);
    return;
  }

  console.log(`📊 Total leads in list: ${allLeads.length}\n`);

  // Step 2: Find which leads have been contacted (have sent/delivered emails)
  const contactedLeads = [];
  const uncontactedLeads = [];

  console.log('🔍 Checking contact status for each lead...\n');

  for (const lead of allLeads) {
    const { count: sentCount } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('lead_id', lead.id)
      .in('status', ['sent', 'delivered']);

    if (sentCount > 0) {
      contactedLeads.push(lead);
    } else {
      uncontactedLeads.push(lead);
    }
  }

  console.log('📧 CONTACT STATUS SUMMARY:');
  console.log(`   Contacted leads: ${contactedLeads.length}`);
  console.log(`   Uncontacted leads: ${uncontactedLeads.length}\n`);

  if (contactedLeads.length === 0) {
    console.log('✅ No contacted leads found - nothing to delete!');
    return;
  }

  // Step 3: Show which leads will be deleted
  console.log('🗑️  LEADS TO BE DELETED (first 20):');
  contactedLeads.slice(0, 20).forEach((lead, i) => {
    console.log(`   ${i + 1}. ${lead.email} (${lead.first_name} ${lead.last_name})`);
  });

  if (contactedLeads.length > 20) {
    console.log(`   ... and ${contactedLeads.length - 20} more\n`);
  } else {
    console.log('');
  }

  // Step 4: Delete contacted leads
  console.log('⏳ Deleting contacted leads...');

  const leadIds = contactedLeads.map(l => l.id);

  // Delete in batches of 100 to avoid query size limits
  let totalDeleted = 0;
  const batchSize = 100;

  for (let i = 0; i < leadIds.length; i += batchSize) {
    const batch = leadIds.slice(i, i + batchSize);

    const { error: deleteError, count } = await supabase
      .from('leads')
      .delete({ count: 'exact' })
      .in('id', batch);

    if (deleteError) {
      console.error(`❌ Failed to delete batch ${Math.floor(i / batchSize) + 1}:`, deleteError);
    } else {
      totalDeleted += count;
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Deleted ${count} leads`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ CLEANUP COMPLETE');
  console.log('='.repeat(80));
  console.log(`   Deleted: ${totalDeleted} contacted leads`);
  console.log(`   Remaining: ${uncontactedLeads.length} uncontacted leads`);
  console.log('');
  console.log(`View updated list: http://localhost:3001/leads/lists/${LEAD_LIST_ID}`);
}

removeContactedLeads().catch(console.error);
