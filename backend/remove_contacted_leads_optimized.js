const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const LEAD_LIST_ID = 'f9ed0ba1-4ca1-4e42-8e99-4bcf863d4439';

async function removeContactedLeads() {
  console.log('='.repeat(80));
  console.log('REMOVING CONTACTED LEADS FROM LIST');
  console.log('='.repeat(80));
  console.log(`Lead List ID: ${LEAD_LIST_ID}\n`);

  // Step 1: Get total count of leads
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('lead_list_id', LEAD_LIST_ID);

  console.log(`📊 Total leads in list: ${totalLeads}\n`);

  // Step 2: Find all lead IDs that have been contacted (more efficient query)
  console.log('🔍 Finding contacted leads...');

  const { data: contactedEmails, error: emailsError } = await supabase
    .from('scheduled_emails')
    .select('lead_id')
    .in('status', ['sent', 'delivered'])
    .not('lead_id', 'is', null);

  if (emailsError) {
    console.error('❌ Failed to fetch contacted leads:', emailsError);
    return;
  }

  // Get unique lead IDs
  const contactedLeadIds = [...new Set(contactedEmails.map(e => e.lead_id))];

  console.log(`   Found ${contactedLeadIds.length} unique contacted leads\n`);

  if (contactedLeadIds.length === 0) {
    console.log('✅ No contacted leads found - nothing to delete!');
    return;
  }

  // Step 3: Get details of contacted leads that are in THIS list
  const { data: contactedLeadsInList, error: leadsError } = await supabase
    .from('leads')
    .select('id, email, first_name, last_name')
    .eq('lead_list_id', LEAD_LIST_ID)
    .in('id', contactedLeadIds);

  if (leadsError) {
    console.error('❌ Failed to fetch lead details:', leadsError);
    return;
  }

  console.log('📧 CONTACT STATUS SUMMARY:');
  console.log(`   Contacted leads in this list: ${contactedLeadsInList.length}`);
  console.log(`   Uncontacted leads: ${totalLeads - contactedLeadsInList.length}\n`);

  if (contactedLeadsInList.length === 0) {
    console.log('✅ No contacted leads found in this list - nothing to delete!');
    return;
  }

  // Step 4: Show which leads will be deleted
  console.log('🗑️  LEADS TO BE DELETED (first 20):');
  contactedLeadsInList.slice(0, 20).forEach((lead, i) => {
    console.log(`   ${i + 1}. ${lead.email} (${lead.first_name || ''} ${lead.last_name || ''})`);
  });

  if (contactedLeadsInList.length > 20) {
    console.log(`   ... and ${contactedLeadsInList.length - 20} more\n`);
  } else {
    console.log('');
  }

  // Step 5: Delete contacted leads in batches
  console.log('⏳ Deleting contacted leads...');

  const leadIdsToDelete = contactedLeadsInList.map(l => l.id);

  // Delete in batches of 100 to avoid query size limits
  let totalDeleted = 0;
  const batchSize = 100;

  for (let i = 0; i < leadIdsToDelete.length; i += batchSize) {
    const batch = leadIdsToDelete.slice(i, i + batchSize);

    const { error: deleteError, count } = await supabase
      .from('leads')
      .delete({ count: 'exact' })
      .in('id', batch);

    if (deleteError) {
      console.error(`❌ Failed to delete batch ${Math.floor(i / batchSize) + 1}:`, deleteError);
    } else {
      totalDeleted += count || 0;
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Deleted ${count || 0} leads`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ CLEANUP COMPLETE');
  console.log('='.repeat(80));
  console.log(`   Deleted: ${totalDeleted} contacted leads`);
  console.log(`   Remaining: ${totalLeads - totalDeleted} uncontacted leads`);
  console.log('');
  console.log(`View updated list: http://localhost:3001/leads/lists/${LEAD_LIST_ID}`);
}

removeContactedLeads().catch(console.error);
