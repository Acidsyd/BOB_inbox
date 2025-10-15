const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

async function deleteOrphaned() {
  console.log('\n🗑️ DELETING ORPHANED SCHEDULED_EMAILS\n');

  // Get campaign config
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', campaignId)
    .single();

  const leadListId = campaign.config.leadListId;

  // Get ALL valid lead IDs
  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .eq('lead_list_id', leadListId);

  const validLeadIds = new Set(leads.map(l => l.id));
  console.log(`📋 Valid leads in list: ${leads.length}`);

  // Get ALL scheduled_emails
  let allEmails = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('scheduled_emails')
      .select('id, lead_id')
      .eq('campaign_id', campaignId)
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (!data || data.length === 0) break;
    allEmails = allEmails.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`📧 Total scheduled_emails: ${allEmails.length}`);

  // Find orphaned (lead_id not in valid list)
  const orphaned = allEmails.filter(e => !validLeadIds.has(e.lead_id));
  console.log(`⚠️ Orphaned emails: ${orphaned.length}\n`);

  if (orphaned.length === 0) {
    console.log('✅ No orphaned emails found!\n');
    return;
  }

  console.log('⏳ Deleting orphaned emails...');

  // Delete in batches
  const orphanedIds = orphaned.map(e => e.id);
  const batchSize = 500;
  let deleted = 0;

  for (let i = 0; i < orphanedIds.length; i += batchSize) {
    const batch = orphanedIds.slice(i, i + batchSize);
    const { error } = await supabase
      .from('scheduled_emails')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`❌ Error:`, error.message);
    } else {
      deleted += batch.length;
      console.log(`Progress: ${deleted}/${orphanedIds.length}`);
    }
  }

  // Verify
  const { count: finalCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  console.log('\n' + '='.repeat(50));
  console.log('✅ ORPHANED CLEANUP COMPLETE');
  console.log('='.repeat(50));
  console.log(`Deleted: ${deleted}`);
  console.log(`Remaining: ${finalCount}`);
  console.log(`Expected: ${leads.length}`);
  console.log(`Match: ${finalCount === leads.length ? '✅ PERFECT' : `⚠️ Difference: ${finalCount - leads.length}`}`);
  console.log('='.repeat(50) + '\n');
}

deleteOrphaned().catch(console.error);
