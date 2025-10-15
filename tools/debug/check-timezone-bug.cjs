const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeCampaignTimezone() {
  console.log('🔍 Analyzing Campaign Timezone Configuration Bug');
  console.log('=================================================');
  
  try {
    // Get all active campaigns with their timezone settings
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, status, config, created_at')
      .in('status', ['active', 'paused']);
      
    if (error) throw error;
    
    console.log(`\n📋 Found ${campaigns.length} campaigns:`);
    
    for (const campaign of campaigns) {
      console.log(`\n🎯 Campaign: ${campaign.name} (${campaign.status})`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Created: ${campaign.created_at}`);
      
      const config = campaign.config || {};
      console.log(`   Timezone: ${config.timezone || 'NOT SET'}`);
      console.log(`   Sending Hours: ${config.sendingHours?.start || 'NOT SET'}-${config.sendingHours?.end || 'NOT SET'}`);
      
      // Get current time in different timezones
      const now = new Date();
      const utcTime = now.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
      const cestTime = now.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false });
      
      console.log(`   Current UTC: ${utcTime}`);
      console.log(`   Current CEST: ${cestTime}`);
      
      // Check what hour it would be in campaign timezone
      const campaignTz = config.timezone || 'UTC';
      const campaignTime = now.toLocaleString('en-US', { timeZone: campaignTz, hour12: false });
      console.log(`   Current Campaign TZ (${campaignTz}): ${campaignTime}`);
      
      // Parse current hour in campaign timezone
      const currentHour = parseInt(now.toLocaleString('en-US', {
        timeZone: campaignTz,
        hour12: false,
        hour: 'numeric'
      }));
      
      const sendingStart = config.sendingHours?.start || 9;
      const sendingEnd = config.sendingHours?.end || 17;
      
      console.log(`   Current Hour in Campaign TZ: ${currentHour}`);
      console.log(`   Sending Window: ${sendingStart}-${sendingEnd}`);
      console.log(`   Can Send Now: ${currentHour >= sendingStart && currentHour < sendingEnd ? '✅ YES' : '❌ NO'}`);
      
      // Check scheduled emails for this campaign
      const { data: scheduledEmails, error: emailError } = await supabase
        .from('scheduled_emails')
        .select('id, status, send_at, campaign_id')
        .eq('campaign_id', campaign.id)
        .eq('status', 'scheduled')
        .order('send_at', { ascending: true })
        .limit(5);
        
      if (!emailError && scheduledEmails.length > 0) {
        console.log(`   📬 Next scheduled emails:`);
        scheduledEmails.forEach((email, i) => {
          const sendTime = new Date(email.send_at);
          const sendTimeUTC = sendTime.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
          const sendTimeCEST = sendTime.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false });
          console.log(`     ${i+1}. ${email.send_at} (UTC: ${sendTimeUTC}, CEST: ${sendTimeCEST})`);
        });
      } else {
        console.log(`   📭 No scheduled emails found`);
      }
    }
    
    console.log('\n🔍 ANALYSIS SUMMARY:');
    console.log('====================');
    console.log('If user sets campaign for "9 AM CEST" but system treats as "9 AM UTC":');
    console.log('- User expects: emails at 9:00 CEST');  
    console.log('- System sends: emails at 9:00 UTC = 11:00 CEST');
    console.log('- Time difference: 2 hours late');
    console.log('');
    console.log('Root cause could be:');
    console.log('1. Frontend not converting user local time to UTC when saving');
    console.log('2. Campaign config storing absolute hours instead of timezone-relative');
    console.log('3. User timezone not being captured/stored in campaign config');
    
  } catch (error) {
    console.error('❌ Error analyzing campaigns:', error);
  }
}

analyzeCampaignTimezone();
