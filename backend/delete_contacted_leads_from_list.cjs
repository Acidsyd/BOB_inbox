const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const LEAD_LIST_ID = 'f9ed0ba1-4ca1-4e42-8e99-4bcf863d4439';

async function fetchAllLeads(leadListId) {
  let allLeads = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, email, first_name, last_name')
      .eq('lead_list_id', leadListId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allLeads.push(...data);
    page++;

    if (data.length < pageSize) break;
  }

  return allLeads;
}

async function findContactedLeads(leadIds) {
  let contactedLeadIds = new Set();
  const batchSize = 100; // Smaller batch size to avoid Supabase limits

  // Query in batches since we might have many lead IDs
  for (let i = 0; i < leadIds.length; i += batchSize) {
    const batch = leadIds.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('scheduled_emails')
      .select('lead_id')
      .in('lead_id', batch)
      .eq('status', 'sent');

    if (error) {
      console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      data.forEach(row => contactedLeadIds.add(row.lead_id));
    }

    console.log(`  Checked batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leadIds.length / batchSize)}: Found ${contactedLeadIds.size} contacted leads so far`);
  }

  return Array.from(contactedLeadIds);
}

async function deleteContactedLeadsFromList() {
  try {
    console.log(`\n🔍 Analyzing lead list: ${LEAD_LIST_ID}\n`);

    // Step 1: Get all leads from the list
    console.log('Step 1: Fetching all leads from the list...');
    const allLeads = await fetchAllLeads(LEAD_LIST_ID);
    console.log(`✓ Found ${allLeads.length} total leads in the list\n`);

    if (allLeads.length === 0) {
      console.log('No leads found in the list. Exiting.');
      return;
    }

    // Step 2: Find which leads have been contacted
    console.log('Step 2: Checking which leads have been contacted...');
    const leadIds = allLeads.map(lead => lead.id);
    const contactedLeadIds = await findContactedLeads(leadIds);
    console.log(`✓ Found ${contactedLeadIds.length} leads that have been contacted\n`);

    if (contactedLeadIds.length === 0) {
      console.log('✓ No contacted leads to delete. All leads are pristine!');
      return;
    }

    // Show some examples
    const contactedLeads = allLeads.filter(lead => contactedLeadIds.includes(lead.id));
    console.log('Examples of contacted leads to delete:');
    contactedLeads.slice(0, 5).forEach(lead => {
      console.log(`  - ${lead.email} (${lead.first_name || 'N/A'} ${lead.last_name || 'N/A'})`);
    });
    if (contactedLeads.length > 5) {
      console.log(`  ... and ${contactedLeads.length - 5} more`);
    }
    console.log('');

    // Step 3: Delete contacted leads in batches
    console.log('Step 3: Deleting contacted leads...');
    const batchSize = 50;
    let deletedCount = 0;

    for (let i = 0; i < contactedLeadIds.length; i += batchSize) {
      const batch = contactedLeadIds.slice(i, i + batchSize);

      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, error);
        throw error;
      }

      deletedCount += batch.length;
      console.log(`  Deleted batch ${i / batchSize + 1}: ${batch.length} leads (Total: ${deletedCount}/${contactedLeadIds.length})`);
    }

    console.log(`\n✓ Successfully deleted ${deletedCount} contacted leads from the database\n`);

    // Step 4: Verify results
    console.log('Step 4: Verification...');
    const remainingLeads = await fetchAllLeads(LEAD_LIST_ID);
    const neverContacted = remainingLeads.length;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 FINAL RESULTS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Original leads:        ${allLeads.length}`);
    console.log(`Contacted (deleted):   ${deletedCount}`);
    console.log(`Never contacted (kept): ${neverContacted}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log('✓ Lead list now contains only leads that have NEVER been contacted');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

deleteContactedLeadsFromList();
