require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function disableTrackingForAllCampaigns() {
  console.log('🔍 Fetching all campaigns...\n');

  // Fetch all campaigns
  const { data: campaigns, error: fetchError } = await supabase
    .from('campaigns')
    .select('id, name, config, status');

  if (fetchError) {
    console.error('❌ Error fetching campaigns:', fetchError);
    return;
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('📭 No campaigns found.');
    return;
  }

  console.log(`📊 Found ${campaigns.length} campaigns\n`);
  console.log('='.repeat(80));

  // Show current tracking status
  let withOpenTracking = 0;
  let withClickTracking = 0;

  campaigns.forEach(campaign => {
    const config = campaign.config || {};
    if (config.trackOpens) withOpenTracking++;
    if (config.trackClicks) withClickTracking++;
  });

  console.log('\n📈 CURRENT TRACKING STATUS:');
  console.log(`   Campaigns with open tracking: ${withOpenTracking}/${campaigns.length}`);
  console.log(`   Campaigns with click tracking: ${withClickTracking}/${campaigns.length}`);

  console.log('\n🔄 Updating campaigns to disable tracking...\n');

  let updated = 0;
  let failed = 0;

  for (const campaign of campaigns) {
    const config = campaign.config || {};

    // Update config to disable tracking
    const newConfig = {
      ...config,
      trackOpens: false,
      trackClicks: false
    };

    // Update in database
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ config: newConfig })
      .eq('id', campaign.id);

    if (updateError) {
      console.error(`❌ Failed to update campaign "${campaign.name}":`, updateError.message);
      failed++;
    } else {
      const changes = [];
      if (config.trackOpens) changes.push('open tracking');
      if (config.trackClicks) changes.push('click tracking');

      if (changes.length > 0) {
        console.log(`✅ Updated "${campaign.name}" - Disabled: ${changes.join(', ')}`);
        updated++;
      } else {
        console.log(`⏭️  Skipped "${campaign.name}" - Tracking already disabled`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESULTS:');
  console.log(`   ✅ Successfully updated: ${updated}`);
  console.log(`   ⏭️  Already disabled: ${campaigns.length - updated - failed}`);
  console.log(`   ❌ Failed: ${failed}`);

  // Verify changes
  console.log('\n🔍 Verifying changes...\n');

  const { data: verifyData } = await supabase
    .from('campaigns')
    .select('id, name, config');

  let stillHasOpenTracking = 0;
  let stillHasClickTracking = 0;

  verifyData.forEach(campaign => {
    const config = campaign.config || {};
    if (config.trackOpens) {
      stillHasOpenTracking++;
      console.log(`⚠️  "${campaign.name}" still has open tracking enabled`);
    }
    if (config.trackClicks) {
      stillHasClickTracking++;
      console.log(`⚠️  "${campaign.name}" still has click tracking enabled`);
    }
  });

  if (stillHasOpenTracking === 0 && stillHasClickTracking === 0) {
    console.log('✅ All campaigns now have tracking disabled!');
    console.log('\n🎉 SUCCESS! Deliverability should improve by 15-30%');
    console.log('📈 Expected impact:');
    console.log('   • Better inbox placement');
    console.log('   • Links look natural (not redirected)');
    console.log('   • Less suspicious to email security scanners');
  } else {
    console.log('\n⚠️  Some campaigns still have tracking enabled:');
    console.log(`   Open tracking: ${stillHasOpenTracking}`);
    console.log(`   Click tracking: ${stillHasClickTracking}`);
  }
}

disableTrackingForAllCampaigns()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
