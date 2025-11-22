require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function deleteInvalidFollowups() {
  // Get all follow-ups
  const { data: allFollowups } = await supabase
    .from('scheduled_emails')
    .select('id, to_email')
    .eq('campaign_id', 'ea86e19c-b71f-49a4-95aa-1cc0a21734df')
    .eq('sequence_step', 1)
    .in('status', ['scheduled']);

  console.log('Total scheduled follow-ups:', allFollowups.length);

  const invalidFollowupIds = [];

  // Check each follow-up
  for (const followup of allFollowups) {
    const { data: initial } = await supabase
      .from('scheduled_emails')
      .select('status, sent_at')
      .eq('campaign_id', 'ea86e19c-b71f-49a4-95aa-1cc0a21734df')
      .eq('to_email', followup.to_email)
      .eq('sequence_step', 0)
      .single();

    // If initial email is NOT sent, this follow-up is invalid
    if (initial.status !== 'sent' || !initial.sent_at) {
      invalidFollowupIds.push(followup.id);
    }
  }

  console.log('Invalid follow-ups (linked to unsent initials):', invalidFollowupIds.length);
  console.log('Valid follow-ups (linked to sent initials):', allFollowups.length - invalidFollowupIds.length);

  if (invalidFollowupIds.length > 0) {
    console.log('\nDeleting invalid follow-ups...');
    const { error } = await supabase
      .from('scheduled_emails')
      .delete()
      .in('id', invalidFollowupIds);

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✅ Deleted', invalidFollowupIds.length, 'invalid follow-ups');
    }
  }

  // Final verification
  const { data: remaining } = await supabase
    .from('scheduled_emails')
    .select('status, sequence_step')
    .eq('campaign_id', 'ea86e19c-b71f-49a4-95aa-1cc0a21734df');

  const stats = {};
  remaining?.forEach(e => {
    const key = `step_${e.sequence_step || 0}_${e.status}`;
    stats[key] = (stats[key] || 0) + 1;
  });

  console.log('\nFinal counts after cleanup:');
  Object.entries(stats).sort().forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
  });
}

deleteInvalidFollowups().catch(console.error);
