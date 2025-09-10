/**
 * Analyze the exact campaign configurations that caused different behaviors
 * Compare the working campaign vs corrupted campaigns
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeCampaignConfigs() {
  console.log('🔍 Analyzing campaign configurations that behaved differently...\n');
  
  try {
    // Get the specific campaigns from the fix output
    const campaignIds = [
      '066c5246-e8ca-4e63-9f9f-c8397de5a3d4', // WORKING: 298.5 minutes span
      'cd979746-e8e1-4e4d-8b96-5a1234567890', // BROKEN: 1460098.5 minutes span
      'b230ec50-07e3-4445-8c67-029977d9f576'   // BROKEN: 1337699.1 minutes span
    ];

    // Get campaign configurations
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, config, status, created_at')
      .in('id', campaignIds);

    if (error) {
      console.error('❌ Failed to fetch campaigns:', error);
      
      // If specific IDs don't work, get a broader sample
      console.log('🔄 Fetching sample of recent campaigns...');
      const { data: sampleCampaigns, error: sampleError } = await supabase
        .from('campaigns')
        .select('id, config, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (sampleError) {
        console.error('❌ Failed to fetch sample campaigns:', sampleError);
        return;
      }
      
      console.log(`📋 Analyzing ${sampleCampaigns?.length || 0} sample active campaigns:`);
      
      sampleCampaigns?.forEach((campaign, index) => {
        const config = campaign.config || {};
        console.log(`\n${index + 1}. Campaign ${campaign.id.substring(0, 8)}... (${campaign.status})`);
        console.log(`   Created: ${campaign.created_at}`);
        console.log(`   sendingInterval: ${config.sendingInterval || 'not set'}`);
        console.log(`   emailsPerHour: ${config.emailsPerHour || 'not set'}`);
        console.log(`   emailsPerDay: ${config.emailsPerDay || 'not set'}`);
        console.log(`   timezone: ${config.timezone || 'not set'}`);
        console.log(`   sendingHours: ${JSON.stringify(config.sendingHours || 'not set')}`);
        console.log(`   activeDays: ${JSON.stringify(config.activeDays || 'not set')}`);
        console.log(`   enableJitter: ${config.enableJitter}`);
        console.log(`   jitterMinutes: ${config.jitterMinutes || 'not set'}`);
      });
      
      return;
    }

    console.log(`📋 Found ${campaigns?.length || 0} campaigns to analyze:`);
    
    campaigns?.forEach((campaign, index) => {
      const config = campaign.config || {};
      const status = index === 0 ? '✅ WORKING' : '❌ CORRUPTED';
      
      console.log(`\n${index + 1}. ${status} - Campaign ${campaign.id.substring(0, 8)}... (${campaign.status})`);
      console.log(`   Created: ${campaign.created_at}`);
      
      // Detailed config analysis
      console.log('   📋 Configuration:');
      console.log(`     sendingInterval: ${config.sendingInterval || 'DEFAULT'} minutes`);
      console.log(`     emailsPerHour: ${config.emailsPerHour || 'DEFAULT'}`);
      console.log(`     emailsPerDay: ${config.emailsPerDay || 'DEFAULT'}`);
      console.log(`     timezone: ${config.timezone || 'DEFAULT'}`);
      console.log(`     sendingHours: ${JSON.stringify(config.sendingHours) || 'DEFAULT'}`);
      console.log(`     activeDays: ${JSON.stringify(config.activeDays) || 'DEFAULT'}`);
      console.log(`     enableJitter: ${config.enableJitter !== undefined ? config.enableJitter : 'DEFAULT'}`);
      console.log(`     jitterMinutes: ${config.jitterMinutes || 'DEFAULT'}`);
      
      // Check for unusual values
      const suspiciousValues = [];
      
      if (config.sendingInterval && (config.sendingInterval < 1 || config.sendingInterval > 1440)) {
        suspiciousValues.push(`sendingInterval: ${config.sendingInterval} (outside 1-1440 range)`);
      }
      
      if (config.emailsPerHour && (config.emailsPerHour < 1 || config.emailsPerHour > 100)) {
        suspiciousValues.push(`emailsPerHour: ${config.emailsPerHour} (outside 1-100 range)`);
      }
      
      if (config.sendingHours) {
        const { start, end } = config.sendingHours;
        if (start >= end || start < 0 || end > 24) {
          suspiciousValues.push(`sendingHours: ${start}-${end} (invalid range)`);
        }
      }
      
      if (suspiciousValues.length > 0) {
        console.log(`   🚨 Suspicious values: ${suspiciousValues.join(', ')}`);
      } else {
        console.log(`   ✅ Configuration looks normal`);
      }
      
      // Calculate expected vs actual intervals
      if (config.emailsPerHour && config.sendingInterval) {
        const minIntervalFromHourly = Math.ceil(60 / config.emailsPerHour);
        const actualInterval = Math.max(config.sendingInterval, minIntervalFromHourly);
        console.log(`   ⏱️ Intervals: configured=${config.sendingInterval}, hourly=${minIntervalFromHourly}, actual=${actualInterval}`);
        
        if (actualInterval !== config.sendingInterval) {
          console.log(`   ⚠️ Interval adjusted due to hourly limit`);
        }
      }
    });
    
    // Try to identify the pattern
    console.log('\n🔍 Pattern Analysis:');
    if (campaigns && campaigns.length >= 2) {
      const working = campaigns[0].config || {};
      const broken = campaigns[1].config || {};
      
      console.log('Comparing working vs broken configurations:');
      const keys = [...new Set([...Object.keys(working), ...Object.keys(broken)])];
      
      keys.forEach(key => {
        const workingVal = working[key];
        const brokenVal = broken[key];
        
        if (JSON.stringify(workingVal) !== JSON.stringify(brokenVal)) {
          console.log(`   ${key}: working=${JSON.stringify(workingVal)} vs broken=${JSON.stringify(brokenVal)}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing configs:', error);
  }
}

analyzeCampaignConfigs()
  .then(() => {
    console.log('\n✅ Campaign configuration analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });