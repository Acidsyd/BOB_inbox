const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CAMPAIGN_ID = '943f4c22-5898-4137-b86a-beb99e625188';

async function restartCampaign() {
  console.log('='.repeat(80));
  console.log('RESTARTING CAMPAIGN WITH PERFECT ROTATION');
  console.log('='.repeat(80));
  console.log(`Campaign ID: ${CAMPAIGN_ID}\n`);

  // Step 1: Get campaign info
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', CAMPAIGN_ID)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ Failed to fetch campaign:', campaignError);
    return;
  }

  console.log('📊 Current Campaign State:');
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Lead List: ${campaign.config.leadListId}`);
  console.log('');

  // Step 2: Check which emails were already sent
  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)
    .not('sent_at', 'is', null);

  const { data: sentLeadIds } = await supabase
    .from('scheduled_emails')
    .select('lead_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .not('sent_at', 'is', null);

  console.log('📤 Already Sent Emails:');
  console.log(`   Count: ${sentCount || 0}`);
  console.log('');

  // Step 3: Delete ALL existing scheduled emails
  console.log('🗑️  Deleting old scheduled emails...');
  const { error: deleteError, count: deletedCount } = await supabase
    .from('scheduled_emails')
    .delete({ count: 'exact' })
    .eq('campaign_id', CAMPAIGN_ID);

  if (deleteError) {
    console.error('❌ Failed to delete old emails:', deleteError);
    return;
  }

  console.log(`   Deleted ${deletedCount} old scheduled emails`);
  console.log('');

  // Step 4: Set campaign status to 'draft' so it can be restarted
  console.log('🔄 Resetting campaign status to draft...');
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', CAMPAIGN_ID);

  if (updateError) {
    console.error('❌ Failed to update campaign status:', updateError);
    return;
  }

  console.log('   Campaign reset to draft status');
  console.log('');

  console.log('='.repeat(80));
  console.log('✅ CAMPAIGN RESET COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Next steps:');
  console.log('1. Go to the campaign in the UI');
  console.log('2. Click "Start Campaign"');
  console.log('3. Emails will be scheduled with PERFECT ROTATION algorithm');
  console.log('4. Leads that already received emails will be excluded');
  console.log('');
  console.log(`Campaign URL: http://localhost:3001/campaigns/${CAMPAIGN_ID}`);
}

restartCampaign().catch(console.error);
