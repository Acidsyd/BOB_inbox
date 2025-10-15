const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deleteOrphanedFollowups() {
  const campaignId = 'eb5d10e4-1a5b-4979-acd6-ae9d8252933e';
  
  console.log('\n=== Deleting Orphaned Follow-up Emails ===\n');
  
  // First, get count
  const { data: beforeData, error: countError } = await supabase
    .from('scheduled_emails')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 1);
  
  if (countError) {
    console.error('Error counting follow-ups:', countError.message);
    return;
  }
  
  console.log(`Found ${beforeData.length} orphaned follow-up emails to delete`);
  console.log('Campaign ID:', campaignId);
  console.log('Sequence step: 1 (follow-ups only, initial emails will NOT be deleted)\n');
  
  // Delete
  const { error: deleteError } = await supabase
    .from('scheduled_emails')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('sequence_step', 1);
  
  if (deleteError) {
    console.error('❌ Error deleting follow-ups:', deleteError.message);
    return;
  }
  
  console.log(`✅ Successfully deleted ${beforeData.length} orphaned follow-up emails`);
  
  // Verify deletion
  const { data: afterData } = await supabase
    .from('scheduled_emails')
    .select('sequence_step')
    .eq('campaign_id', campaignId);
  
  const remaining = afterData.filter(e => e.sequence_step === 1).length;
  const initial = afterData.filter(e => e.sequence_step === 0).length;
  
  console.log('\n=== Verification ===');
  console.log(`Initial emails (sequence_step=0): ${initial} (preserved)`);
  console.log(`Follow-up emails (sequence_step=1): ${remaining} (should be 0)`);
  console.log('\n✅ New follow-ups will be created automatically when initial emails are sent!');
}

deleteOrphanedFollowups().catch(console.error);
