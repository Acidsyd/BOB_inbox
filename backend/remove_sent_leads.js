const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function removeSentLeads() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';
  const leadListId = 'f9ed0ba1-4ca1-4e42-8e99-4bcf863d4439';

  console.log('\n=== Removing Sent Leads from Lead List ===\n');

  // Get all sent emails with lead_ids
  const { data: sentEmails } = await supabase
    .from('scheduled_emails')
    .select('lead_id, leads(email, first_name, last_name)')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent');

  console.log(`Found ${sentEmails.length} sent emails`);

  if (sentEmails.length === 0) {
    console.log('No sent emails found. Nothing to remove.');
    return;
  }

  const leadIds = sentEmails.map(e => e.lead_id);

  console.log('\nLeads to remove:');
  sentEmails.slice(0, 10).forEach((email, i) => {
    const lead = email.leads;
    console.log(`${i+1}. ${lead.email} - ${lead.first_name} ${lead.last_name}`);
  });
  if (sentEmails.length > 10) {
    console.log(`... and ${sentEmails.length - 10} more`);
  }

  // Verify these leads belong to the specified list
  const { data: verifyLeads } = await supabase
    .from('leads')
    .select('id, email')
    .in('id', leadIds)
    .eq('lead_list_id', leadListId);

  console.log(`\nVerified ${verifyLeads.length} leads belong to list ${leadListId}`);

  if (verifyLeads.length === 0) {
    console.log('⚠️  No leads found in this list. They may have been removed already.');
    return;
  }

  // Check current lead count in list
  const { count: beforeCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('lead_list_id', leadListId);

  console.log(`\nLead list current count: ${beforeCount}`);
  console.log(`Leads to remove: ${verifyLeads.length}`);
  console.log(`Expected count after removal: ${beforeCount - verifyLeads.length}`);

  console.log('\n⚠️  WARNING: This will permanently delete these leads from the list!');
  console.log('Proceeding with deletion...\n');

  // Delete the leads
  const { error: deleteError, data: deletedLeads } = await supabase
    .from('leads')
    .delete()
    .in('id', leadIds)
    .eq('lead_list_id', leadListId)
    .select();

  if (deleteError) {
    console.error('❌ Error deleting leads:', deleteError.message);
    return;
  }

  console.log(`✅ Successfully deleted ${deletedLeads?.length || verifyLeads.length} leads from list`);

  // Verify final count
  const { count: afterCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('lead_list_id', leadListId);

  console.log('\n=== Verification ===');
  console.log(`Before: ${beforeCount} leads`);
  console.log(`Deleted: ${deletedLeads?.length || verifyLeads.length} leads`);
  console.log(`After: ${afterCount} leads`);
  console.log(`\n✅ Lead list now contains only leads that haven't received emails yet`);
}

removeSentLeads().catch(console.error);
