/**
 * Test to determine if the timestamp issue is:
 * 1. Historical corrupted data, OR  
 * 2. Current ongoing bug
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

async function analyzeDataCorruption() {
  console.log('🔍 Analyzing timestamp corruption: Historical vs Current...\n');
  
  try {
    // Step 1: Analyze existing scheduled_emails by creation time
    console.log('📅 Step 1: Analyzing existing scheduled emails...');
    
    const { data: existingEmails, error } = await supabase
      .from('scheduled_emails')
      .select('id, created_at, send_at, campaign_id')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Failed to fetch emails:', error);
      return;
    }

    if (!existingEmails || existingEmails.length === 0) {
      console.log('📭 No scheduled emails found');
      return;
    }

    console.log(`📧 Found ${existingEmails.length} scheduled emails`);
    
    // Group by creation time to identify batches
    const creationBatches = {};
    const now = new Date();
    
    existingEmails.forEach(email => {
      const createdAt = new Date(email.created_at);
      const sendAt = new Date(email.send_at);
      const batchKey = createdAt.toISOString().slice(0, 19); // Group by minute
      
      if (!creationBatches[batchKey]) {
        creationBatches[batchKey] = {
          createdAt: createdAt,
          emails: [],
          minSendAt: sendAt,
          maxSendAt: sendAt
        };
      }
      
      creationBatches[batchKey].emails.push(email);
      if (sendAt < creationBatches[batchKey].minSendAt) creationBatches[batchKey].minSendAt = sendAt;
      if (sendAt > creationBatches[batchKey].maxSendAt) creationBatches[batchKey].maxSendAt = sendAt;
    });

    console.log('\n🕒 Creation batches analysis:');
    Object.keys(creationBatches).forEach((batchKey, index) => {
      const batch = creationBatches[batchKey];
      const timeSpanMs = batch.maxSendAt.getTime() - batch.minSendAt.getTime();
      const timeSpanYears = timeSpanMs / (365 * 24 * 60 * 60 * 1000);
      const ageHours = (now.getTime() - batch.createdAt.getTime()) / (60 * 60 * 1000);
      
      console.log(`   Batch ${index + 1}: ${batch.emails.length} emails`);
      console.log(`     Created: ${batch.createdAt.toISOString()} (${ageHours.toFixed(1)} hours ago)`);
      console.log(`     Send time span: ${timeSpanYears.toFixed(2)} years`);
      console.log(`     Min send: ${batch.minSendAt.toISOString()}`);
      console.log(`     Max send: ${batch.maxSendAt.toISOString()}`);
      
      if (timeSpanYears > 0.1) {
        console.log(`     🚨 CORRUPTED BATCH DETECTED!`);
      }
      console.log('');
    });
    
    // Step 2: Check if campaigns are currently active and creating new corrupted data
    console.log('📋 Step 2: Checking active campaigns...');
    
    const { data: activeCampaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, status, created_at')
      .eq('status', 'active');

    if (campaignError) {
      console.error('❌ Failed to fetch campaigns:', campaignError);
      return;
    }

    console.log(`📊 Found ${activeCampaigns?.length || 0} active campaigns`);
    
    if (activeCampaigns && activeCampaigns.length > 0) {
      activeCampaigns.forEach(campaign => {
        console.log(`   Campaign ${campaign.id.substring(0, 8)}... (active since ${campaign.created_at})`);
      });
    }
    
    // Step 3: Check if there's a pattern in the corruption
    console.log('\n🔍 Step 3: Analyzing corruption patterns...');
    
    const corruptedEmails = existingEmails.filter(email => {
      const sendAt = new Date(email.send_at);
      const yearsFromNow = (sendAt.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000);
      return yearsFromNow > 0.1; // More than ~1 month in future
    });
    
    console.log(`📈 Corruption Statistics:`);
    console.log(`   Total emails: ${existingEmails.length}`);
    console.log(`   Corrupted emails: ${corruptedEmails.length}`);
    console.log(`   Corruption rate: ${((corruptedEmails.length / existingEmails.length) * 100).toFixed(1)}%`);
    
    if (corruptedEmails.length > 0) {
      const avgCorruptionYears = corruptedEmails.reduce((sum, email) => {
        const sendAt = new Date(email.send_at);
        const yearsFromNow = (sendAt.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000);
        return sum + yearsFromNow;
      }, 0) / corruptedEmails.length;
      
      console.log(`   Average corruption: ${avgCorruptionYears.toFixed(2)} years in future`);
    }
    
    // Step 4: Determine if this is historical or ongoing
    const mostRecentCorrupted = corruptedEmails.reduce((latest, email) => {
      const createdAt = new Date(email.created_at);
      const latestAt = new Date(latest ? latest.created_at : 0);
      return createdAt > latestAt ? email : latest;
    }, null);
    
    console.log('\n🎯 CONCLUSION:');
    
    if (mostRecentCorrupted) {
      const mostRecentCorruptedTime = new Date(mostRecentCorrupted.created_at);
      const hoursAgo = (now.getTime() - mostRecentCorruptedTime.getTime()) / (60 * 60 * 1000);
      
      console.log(`   Most recent corrupted email: ${hoursAgo.toFixed(1)} hours ago`);
      
      if (hoursAgo < 1) {
        console.log('   🚨 ACTIVE BUG: Corruption occurred within the last hour');
        console.log('   📝 Action needed: The current code is still generating corrupted timestamps');
      } else if (hoursAgo < 24) {
        console.log('   ⚠️ RECENT BUG: Corruption occurred within 24 hours');
        console.log('   📝 Action needed: Check if bug was recently fixed or is still active');
      } else {
        console.log('   ✅ HISTORICAL DATA: Corruption is older than 24 hours');
        console.log('   📝 Action needed: Clean up corrupted data, current code appears fixed');
      }
    } else {
      console.log('   📊 No corrupted data found (this would be unusual given the debug output)');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error);
  }
}

analyzeDataCorruption()
  .then(() => {
    console.log('\n✅ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });