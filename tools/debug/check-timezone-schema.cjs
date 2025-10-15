#!/usr/bin/env node

/**
 * Check Timezone Schema - Verify existing timezone columns in database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking existing timezone schema...\n');

  try {
    // Check organizations table structure
    console.log('📊 Organizations table:');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (orgError) {
      console.error('❌ Error querying organizations:', orgError.message);
    } else {
      const orgColumns = orgs[0] ? Object.keys(orgs[0]) : [];
      console.log('   Columns:', orgColumns.join(', '));

      const hasTimezone = orgColumns.includes('default_timezone');
      const hasAutoDetect = orgColumns.includes('auto_detect_timezone');
      console.log(`   ✅ Has default_timezone: ${hasTimezone}`);
      console.log(`   ✅ Has auto_detect_timezone: ${hasAutoDetect}`);
    }

    console.log('\n📊 Campaigns table:');
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);

    if (campaignError) {
      console.error('❌ Error querying campaigns:', campaignError.message);
    } else {
      const campaignColumns = campaigns[0] ? Object.keys(campaigns[0]) : [];
      console.log('   Columns:', campaignColumns.join(', '));

      const hasUserTimezone = campaignColumns.includes('user_timezone');
      const hasTimezoneDetected = campaignColumns.includes('timezone_detected');
      console.log(`   ✅ Has user_timezone: ${hasUserTimezone}`);
      console.log(`   ✅ Has timezone_detected: ${hasTimezoneDetected}`);
    }

    // Check if campaigns already have timezone values
    console.log('\n📊 Sample campaign data:');
    const { data: sampleCampaigns, error: sampleError } = await supabase
      .from('campaigns')
      .select('id, user_timezone, timezone_detected')
      .limit(3);

    if (!sampleError && sampleCampaigns) {
      sampleCampaigns.forEach((campaign, i) => {
        console.log(`   Campaign ${i + 1}: timezone=${campaign.user_timezone}, detected=${campaign.timezone_detected}`);
      });
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema();