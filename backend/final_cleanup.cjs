const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';

async function finalCleanup() {
  console.log('\n🔄 FINAL CLEANUP - Removing remaining 77 duplicates\n');

  // Get campaign config to find lead list
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('config')
    .eq('id', campaignId)
    .single();

  const leadListId = campaign.config.leadListId;

  // Get ALL valid leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, email')
    .eq('lead_list_id', leadListId);

  console.log(`📋 Valid leads: ${leads.length}`);

  // Get ALL scheduled_emails with pagination
  let allEmails = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('scheduled_emails')
      .select('id, lead_id, status, from_email, created_at, to_email')
      .eq('campaign_id', campaignId)
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (!data || data.length === 0) break;
    allEmails = allEmails.concat(data);
    if (data.length < 1000) break;
    page++;
  }

  console.log(`📧 Current scheduled_emails: ${allEmails.length}\n`);

  // Create lead_id set for validation
  const validLeadIds = new Set(leads.map(l => l.id));

  // Filter orphaned records
  const validEmails = allEmails.filter(e => validLeadIds.has(e.lead_id));
  const orphaned = allEmails.length - validEmails.length;

  if (orphaned > 0) {
    console.log(`⚠️ Found ${orphaned} orphaned emails (invalid lead_id)`);
  }

  // Group by lead_id
  const byLead = {};
  validEmails.forEach(email => {
    if (!byLead[email.lead_id]) byLead[email.lead_id] = [];
    byLead[email.lead_id].push(email);
  });

  // Find duplicates with enhanced priority
  const toDelete = [];
  const priority = { sent: 3, scheduled: 2, skipped: 1, failed: 0 };

  Object.entries(byLead).forEach(([leadId, emails]) => {
    if (emails.length === 1) return; // No duplicates

    // Sort by multiple criteria:
    // 1. Status priority (sent > scheduled > skipped > failed)
    // 2. Has from_email (prefer records with from_email)
    // 3. Most recent created_at
    emails.sort((a, b) => {
      // Status priority
      const statusDiff = priority[b.status] - priority[a.status];
      if (statusDiff !== 0) return statusDiff;

      // Has from_email
      if (a.from_email && !b.from_email) return -1;
      if (!a.from_email && b.from_email) return 1;

      // Most recent
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Keep first, delete rest
    const duplicates = emails.slice(1);
    toDelete.push(...duplicates.map(e => e.id));

    if (duplicates.length > 0) {
      const shortId = leadId.substring(0, 8);
      console.log(`Lead ${shortId}: ${emails.length} emails → keeping ${emails[0].status}`);
    }
  });

  console.log(`\n🗑️ Duplicates to delete: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found - data is clean!\n');
    return;
  }

  // Delete in batches
  const batchSize = 500;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error } = await supabase
      .from('scheduled_emails')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`❌ Error deleting batch:`, error.message);
    } else {
      deleted += batch.length;
      console.log(`Progress: ${deleted}/${toDelete.length}`);
    }
  }

  // Final verification
  const { count: finalCount } = await supabase
    .from('scheduled_emails')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  console.log('\n' + '='.repeat(50));
  console.log('✅ FINAL CLEANUP COMPLETE');
  console.log('='.repeat(50));
  console.log(`Deleted: ${deleted}`);
  console.log(`Final count: ${finalCount}`);
  console.log(`Expected: ${leads.length}`);
  console.log(`Match: ${finalCount === leads.length ? '✅ PERFECT' : `⚠️ Difference: ${finalCount - leads.length}`}`);
  console.log('='.repeat(50) + '\n');
}

finalCleanup().catch(console.error);
