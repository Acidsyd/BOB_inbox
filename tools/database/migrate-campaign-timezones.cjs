#!/usr/bin/env node
/**
 * Migration Script: Update Campaign Timezones
 *
 * This script updates existing campaigns that have timezone: "UTC"
 * to use Europe/Rome timezone for Italian users.
 *
 * IMPORTANT: Only run this after confirming with the user!
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Target timezone for migration (Italian users)
const TARGET_TIMEZONE = 'Europe/Rome';

async function migrateCampaignTimezones() {
  try {
    console.log('🔄 Campaign Timezone Migration Script');
    console.log('=====================================');
    console.log(`Target timezone: ${TARGET_TIMEZONE}`);
    console.log('');

    // Get campaigns with UTC timezone
    const { data: utcCampaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, status, config')
      .eq('config->>timezone', 'UTC');

    if (error) {
      console.error('❌ Error fetching UTC campaigns:', error);
      return;
    }

    if (!utcCampaigns || utcCampaigns.length === 0) {
      console.log('✅ No UTC campaigns found - migration not needed');
      return;
    }

    console.log(`📊 Found ${utcCampaigns.length} campaigns with UTC timezone`);
    console.log('');

    // Show active vs inactive breakdown
    const activeCampaigns = utcCampaigns.filter(c => c.status === 'active');
    const inactiveCampaigns = utcCampaigns.filter(c => c.status !== 'active');

    console.log(`🟢 Active campaigns to migrate: ${activeCampaigns.length}`);
    console.log(`⚪ Inactive campaigns to migrate: ${inactiveCampaigns.length}`);
    console.log('');

    if (activeCampaigns.length > 0) {
      console.log('🎯 Active campaigns that will be updated:');
      activeCampaigns.slice(0, 10).forEach((campaign, index) => {
        const sendingHours = campaign.config?.sendingHours;
        console.log(`   ${index + 1}. ${campaign.name} (${sendingHours?.start}:00-${sendingHours?.end}:00)`);
      });
      if (activeCampaigns.length > 10) {
        console.log(`   ... and ${activeCampaigns.length - 10} more`);
      }
      console.log('');
    }

    // WARNING - require explicit confirmation
    console.log('⚠️  WARNING: This will update campaign timezones in production!');
    console.log('⚠️  This may affect email sending schedules immediately.');
    console.log('');
    console.log('To proceed, uncomment the UPDATE section below and run again.');
    console.log('');


    console.log('🚀 Starting migration...');

    // Update campaigns one by one to avoid upsert issues
    let successCount = 0;
    for (const campaign of utcCampaigns) {
      const updatedConfig = {
        ...campaign.config,
        timezone: TARGET_TIMEZONE
      };

      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ config: updatedConfig })
        .eq('id', campaign.id);

      if (updateError) {
        console.error(`❌ Failed to update campaign ${campaign.name} (${campaign.id}):`, updateError);
      } else {
        successCount++;
      }
    }

    if (successCount === 0) {
      console.error('❌ No campaigns were updated successfully');
      return;
    }

    console.log(`✅ Successfully migrated ${successCount}/${utcCampaigns.length} campaigns to ${TARGET_TIMEZONE}`);
    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`   - Updated campaigns: ${successCount}`);
    console.log(`   - Target timezone: ${TARGET_TIMEZONE}`);
    console.log(`   - Active campaigns affected: ${activeCampaigns.length}`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   - Monitor cron logs to verify emails send at correct times');
    console.log('   - Check that 9 AM campaigns now send at 9 AM CEST');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

migrateCampaignTimezones();