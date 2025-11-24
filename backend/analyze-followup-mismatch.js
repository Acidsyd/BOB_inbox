require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CAMPAIGN_ID = 'c0f9d471-ac96-400f-a942-9c55487a8a53';

async function analyzeFollowupMismatch() {
  console.log('\n🔍 Analyzing Follow-up Mismatch\n');
  console.log('='.repeat(60));

  // Get sent initial emails
  const { data: sentInitials } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, to_email, sent_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('sequence_step', 0)
    .eq('status', 'sent')
    .order('sent_at');

  console.log(`📧 Sent initial emails: ${sentInitials.length}`);

  // Get ALL follow-ups (sent + scheduled)
  const { data: allFollowups } = await supabase
    .from('scheduled_emails')
    .select('id, lead_id, to_email, status, send_at, sent_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('sequence_step', 1);

  const sentFollowups = allFollowups.filter(f => f.status === 'sent');
  const scheduledFollowups = allFollowups.filter(f => f.status === 'scheduled');

  console.log(`📧 Follow-ups breakdown:`);
  console.log(`   - Sent: ${sentFollowups.length}`);
  console.log(`   - Scheduled: ${scheduledFollowups.length}`);
  console.log(`   - Total: ${allFollowups.length}`);
  console.log('');

  // Check for leads with sent initials but no follow-ups at all
  const followupLeadIds = new Set(allFollowups.map(f => f.lead_id));
  const leadsWithoutFollowups = sentInitials.filter(email => !followupLeadIds.has(email.lead_id));

  console.log(`❌ Sent initials WITHOUT any follow-up: ${leadsWithoutFollowups.length}`);

  if (leadsWithoutFollowups.length > 0) {
    console.log(`\nLeads missing follow-ups:`);
    leadsWithoutFollowups.slice(0, 10).forEach((email, idx) => {
      console.log(`  ${idx + 1}. ${email.to_email} (sent: ${email.sent_at})`);
    });
  }
  console.log('');

  // Check for leads with sent initials but only scheduled follow-ups (no sent)
  const sentFollowupLeadIds = new Set(sentFollowups.map(f => f.lead_id));
  const leadsWithOnlyScheduledFollowups = sentInitials.filter(email =>
    followupLeadIds.has(email.lead_id) && !sentFollowupLeadIds.has(email.lead_id)
  );

  console.log(`📅 Sent initials with ONLY scheduled follow-ups: ${leadsWithOnlyScheduledFollowups.length}`);

  if (leadsWithOnlyScheduledFollowups.length > 0) {
    console.log(`\nSample (next to be sent):`);
    // Get their scheduled follow-ups
    const scheduledForThese = scheduledFollowups.filter(f =>
      leadsWithOnlyScheduledFollowups.map(e => e.lead_id).includes(f.lead_id)
    ).sort((a, b) => new Date(a.send_at) - new Date(b.send_at));

    scheduledForThese.slice(0, 10).forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.to_email} → ${f.send_at}`);
    });
  }
  console.log('');

  // The math check
  console.log(`📊 Expected follow-ups:`);
  console.log(`   Sent initials: ${sentInitials.length}`);
  console.log(`   Should have follow-ups: ${sentInitials.length}`);
  console.log(`   Actually have (sent + scheduled): ${allFollowups.length}`);
  console.log(`   Difference: ${allFollowups.length - sentInitials.length}`);
  console.log('');

  // Check for duplicate follow-ups (multiple follow-ups for same lead)
  const followupsByLead = {};
  allFollowups.forEach(f => {
    if (!followupsByLead[f.lead_id]) followupsByLead[f.lead_id] = [];
    followupsByLead[f.lead_id].push(f);
  });

  const duplicates = Object.entries(followupsByLead).filter(([_, arr]) => arr.length > 1);

  if (duplicates.length > 0) {
    console.log(`⚠️  DUPLICATES FOUND: ${duplicates.length} leads have multiple follow-ups`);
    console.log(`   This explains the extra ${allFollowups.length - sentInitials.length} follow-ups!\n`);

    console.log(`Examples:`);
    duplicates.slice(0, 5).forEach(([leadId, followupArr]) => {
      console.log(`  Lead: ${followupArr[0].to_email}`);
      followupArr.forEach((f, idx) => {
        console.log(`    ${idx + 1}. [${f.status}] ${f.send_at || f.sent_at}`);
      });
    });
  }
}

analyzeFollowupMismatch();
