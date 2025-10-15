#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCampaignTimezones() {
  try {
    console.log('🔍 Checking current campaign timezones...\n');

    // Get active campaigns with their timezones
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, status, config')
      .eq('status', 'active');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('📭 No active campaigns found');
      return;
    }

    console.log(`📊 Found ${campaigns.length} active campaigns:\n`);

    campaigns.forEach((campaign, index) => {
      const timezone = campaign.config?.timezone || 'NOT SET';
      const sendingHours = campaign.config?.sendingHours || 'NOT SET';

      console.log(`${index + 1}. Campaign: ${campaign.name}`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Timezone: ${timezone}`);
      console.log(`   Sending Hours: ${JSON.stringify(sendingHours)}`);

      if (timezone === 'UTC') {
        console.log('   ⚠️  ISSUE: Campaign still uses UTC timezone!');
      } else if (timezone.includes('Europe/')) {
        console.log('   ✅ Campaign uses European timezone');
      }
      console.log('');
    });

    // Check current time in different timezones
    const now = new Date();
    console.log('🕐 Current time comparison:');
    console.log(`   UTC: ${now.getUTCHours()}:${now.getUTCMinutes().toString().padStart(2, '0')}`);
    console.log(`   Europe/Rome: ${now.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false })}`);
    console.log(`   Europe/Berlin: ${now.toLocaleString('en-US', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false })}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkCampaignTimezones();