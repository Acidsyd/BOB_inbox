/**
 * Debug script to check campaign configuration values
 * and identify the source of far-future timestamp generation
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugCampaignConfig() {
  console.log('🔍 Checking campaign configuration for timestamp calculation errors...\n');
  
  try {
    // Get the active campaign with scheduled emails
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, config, status, created_at')
      .eq('id', 'b230ec50-63c4-4b4c-bed5-8e48e2ffd306')
      .single();

    if (error) {
      console.error('❌ Failed to fetch campaign:', error);
      return;
    }

    if (!campaign) {
      console.log('📭 Campaign not found');
      return;
    }

    console.log(`📋 Campaign ${campaign.id.substring(0, 8)}... (${campaign.status})`);
    console.log(`   Created: ${campaign.created_at}`);
    console.log(`\n🛠️ Configuration Analysis:`);
    
    const config = campaign.config || {};
    
    // Check all timing-related values
    console.log(`   sendingInterval: ${config.sendingInterval} (expected: minutes)`);
    console.log(`   emailsPerDay: ${config.emailsPerDay}`);
    console.log(`   emailsPerHour: ${config.emailsPerHour}`);
    console.log(`   timezone: ${config.timezone || 'not set'}`);
    console.log(`   sendingHours: ${JSON.stringify(config.sendingHours || 'not set')}`);
    console.log(`   activeDays: ${JSON.stringify(config.activeDays || 'not set')}`);
    console.log(`   enableJitter: ${config.enableJitter}`);
    console.log(`   jitterMinutes: ${config.jitterMinutes}`);
    
    // Calculate expected intervals based on emailsPerHour
    if (config.emailsPerHour) {
      const minIntervalFromHourlyLimit = Math.ceil(60 / config.emailsPerHour);
      console.log(`\n📊 Calculated min interval from hourly limit: ${minIntervalFromHourlyLimit} minutes`);
      console.log(`   (60 minutes ÷ ${config.emailsPerHour} emails/hour = ${minIntervalFromHourlyLimit} min)`);
      
      if (config.sendingInterval) {
        const actualInterval = Math.max(config.sendingInterval, minIntervalFromHourlyLimit);
        console.log(`   Actual interval used: max(${config.sendingInterval}, ${minIntervalFromHourlyLimit}) = ${actualInterval} minutes`);
        
        // Test calculation
        const testMs = actualInterval * 60 * 1000;
        const testTime = new Date();
        const futureTime = new Date(testTime.getTime() + testMs);
        console.log(`\n🧮 Test Calculation:`);
        console.log(`   ${actualInterval} minutes * 60 * 1000 = ${testMs}ms`);
        console.log(`   Current time: ${testTime.toISOString()}`);
        console.log(`   + ${actualInterval} min: ${futureTime.toISOString()}`);
        console.log(`   Difference: ${(futureTime.getTime() - testTime.getTime()) / 1000 / 60} minutes`);
      }
    }
    
    // Check email sequence follow-up delays
    const emailSequence = config.emailSequence || [];
    if (emailSequence.length > 0) {
      console.log(`\n📧 Email Sequence (${emailSequence.length} follow-ups):`);
      emailSequence.forEach((email, index) => {
        console.log(`   Follow-up ${index + 1}: delay = ${email.delay} days`);
        
        if (email.delay) {
          const followUpDelayMs = email.delay * 24 * 60 * 60 * 1000;
          const testTime = new Date();
          const followUpTime = new Date(testTime.getTime() + followUpDelayMs);
          console.log(`     Calculation: ${email.delay} * 24 * 60 * 60 * 1000 = ${followUpDelayMs}ms`);
          console.log(`     Future time: ${followUpTime.toISOString()}`);
          console.log(`     Days ahead: ${followUpDelayMs / (24 * 60 * 60 * 1000)} days`);
        }
      });
    }

    // Check for any unusual values that might cause calculation errors
    console.log(`\n⚠️ Suspicious Value Checks:`);
    
    // Check if sendingInterval is accidentally in seconds instead of minutes
    if (config.sendingInterval > 1440) { // More than 24 hours
      console.log(`   🚨 sendingInterval (${config.sendingInterval}) seems too large for minutes!`);
    }
    
    // Check if any values are strings that should be numbers
    Object.keys(config).forEach(key => {
      if (['sendingInterval', 'emailsPerDay', 'emailsPerHour', 'jitterMinutes'].includes(key)) {
        const value = config[key];
        const type = typeof value;
        console.log(`   ${key}: ${value} (type: ${type})`);
        if (type === 'string' && !isNaN(Number(value))) {
          console.log(`     ⚠️ String number detected: "${value}" should be ${Number(value)}`);
        }
      }
    });

    // Raw config dump for analysis
    console.log(`\n📄 Raw Configuration:`);
    console.log(JSON.stringify(config, null, 2));
    
  } catch (error) {
    console.error('❌ Error debugging campaign config:', error);
  }
}

// Run the debug function
debugCampaignConfig()
  .then(() => {
    console.log('\n✅ Campaign configuration debug complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });