require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CAMPAIGN_ID = 'c0f9d471-ac96-400f-a942-9c55487a8a53';

async function findOrphanFollowups() {
  console.log('\n🔍 Finding Orphan Follow-ups\n');
  console.log('='.repeat(60));

  // Get ALL initial emails (any status)
  const { data: allInitials } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, to_email, status, sent_at, send_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('sequence_step', 0);

  console.log(`📧 All initial emails (any status):`);
  const initialsByStatus = {};
  allInitials.forEach(email => {
    initialsByStatus[email.status] = (initialsByStatus[email.status] || 0) + 1;
  });
  Object.entries(initialsByStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  console.log(`   Total: ${allInitials.length}\n`);

  // Get ALL follow-ups
  const { data: allFollowups } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, to_email, status, sent_at, send_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('sequence_step', 1);

  console.log(`📧 All follow-ups (any status):`);
  const followupsByStatus = {};
  allFollowups.forEach(email => {
    followupsByStatus[email.status] = (followupsByStatus[email.status] || 0) + 1;
  });
  Object.entries(followupsByStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  console.log(`   Total: ${allFollowups.length}\n`);

  // Find follow-ups with NO corresponding initial
  const initialLeadIds = new Set(allInitials.map(e => e.lead_id));
  const orphanFollowups = allFollowups.filter(f => !initialLeadIds.has(f.lead_id));

  console.log(`👻 Orphan follow-ups (no initial email): ${orphanFollowups.length}`);

  if (orphanFollowups.length > 0) {
    console.log(`\nSample orphans:`);
    orphanFollowups.slice(0, 10).forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.to_email} [${f.status}] ${f.send_at || f.sent_at}`);
    });
    console.log('');
  }

  // Count by initial status
  console.log(`📊 Follow-ups grouped by initial email status:\n`);

  const sentInitialLeads = new Set(
    allInitials.filter(e => e.status === 'sent').map(e => e.lead_id)
  );
  const scheduledInitialLeads = new Set(
    allInitials.filter(e => e.status === 'scheduled').map(e => e.lead_id)
  );
  const skippedInitialLeads = new Set(
    allInitials.filter(e => e.status === 'skipped').map(e => e.lead_id)
  );

  const followupsForSent = allFollowups.filter(f => sentInitialLeads.has(f.lead_id));
  const followupsForScheduled = allFollowups.filter(f => scheduledInitialLeads.has(f.lead_id));
  const followupsForSkipped = allFollowups.filter(f => skippedInitialLeads.has(f.lead_id));

  console.log(`For sent initials (${sentInitialLeads.size}): ${followupsForSent.length} follow-ups`);
  console.log(`For scheduled initials (${scheduledInitialLeads.size}): ${followupsForScheduled.length} follow-ups`);
  console.log(`For skipped initials (${skippedInitialLeads.size}): ${followupsForSkipped.length} follow-ups`);
  console.log(`Orphans (no initial): ${orphanFollowups.length} follow-ups`);
  console.log('');

  // The real question: How many follow-ups should exist for SENT initials?
  console.log(`🎯 Correct state:`);
  console.log(`   Sent initials: ${sentInitialLeads.size}`);
  console.log(`   Should have follow-ups: ${sentInitialLeads.size}`);
  console.log(`   Actually have: ${followupsForSent.length}`);
  console.log(`   Missing: ${Math.max(0, sentInitialLeads.size - followupsForSent.length)}`);
  console.log(`   Extra: ${Math.max(0, followupsForSent.length - sentInitialLeads.size)}`);
}

findOrphanFollowups();
