require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function finalCountCheck() {
  // Sent initials
  const { data: sentInitials } = await supabase
    .from('scheduled_emails')
    .select('lead_id')
    .eq('campaign_id', 'c0f9d471-ac96-400f-a942-9c55487a8a53')
    .eq('sequence_step', 0)
    .eq('status', 'sent');

  // Follow-ups for those sent initials
  const sentInitialLeadIds = sentInitials.map(e => e.lead_id);

  const { data: followupsForSent } = await supabase
    .from('scheduled_emails')
    .select('lead_id, status')
    .eq('campaign_id', 'c0f9d471-ac96-400f-a942-9c55487a8a53')
    .eq('sequence_step', 1)
    .in('lead_id', sentInitialLeadIds);

  const sentFollowups = followupsForSent.filter(f => f.status === 'sent');
  const scheduledFollowups = followupsForSent.filter(f => f.status === 'scheduled');

  const totalInitials = sentInitials.length;
  const totalFollowups = followupsForSent.length;
  const missing = totalInitials - totalFollowups;

  console.log(`\n📊 FOR SENT INITIALS ONLY:\n`);
  console.log(`Sent initials: ${totalInitials}`);
  console.log(`Follow-ups sent: ${sentFollowups.length}`);
  console.log(`Follow-ups scheduled: ${scheduledFollowups.length}`);
  console.log(`Total follow-ups: ${totalFollowups}`);
  console.log(`\nMissing: ${missing}`);
}

finalCountCheck();
