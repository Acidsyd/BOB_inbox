/**
 * Find the actual campaign ID from scheduled emails
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

async function findCampaignId() {
  console.log('🔍 Finding campaign ID from scheduled emails...\n');
  
  try {
    const { data: emails, error } = await supabase
      .from('scheduled_emails')
      .select('campaign_id, created_at, send_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !emails || emails.length === 0) {
      console.log('❌ No scheduled emails found');
      return;
    }

    const campaignId = emails[0].campaign_id;
    console.log(`📧 Found campaign ID: ${campaignId}`);
    
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, config, status, created_at')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('❌ Failed to fetch campaign:', campaignError);
      return;
    }

    console.log(`📋 Campaign ${campaign.id} (${campaign.status})`);
    console.log(`   Created: ${campaign.created_at}`);
    
    const config = campaign.config || {};
    console.log('\n🛠️ Configuration:');
    console.log(`   sendingInterval: ${config.sendingInterval} minutes`);
    console.log(`   emailsPerHour: ${config.emailsPerHour}`);
    console.log(`   emailsPerDay: ${config.emailsPerDay}`);
    
    // Show sample scheduled email times
    console.log('\n📅 Recent scheduled emails:');
    emails.forEach((email, index) => {
      const sendAt = new Date(email.send_at);
      const createdAt = new Date(email.created_at);
      const diffYears = (sendAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365);
      
      console.log(`   ${index + 1}. Created: ${createdAt.toISOString()}`);
      console.log(`      Send at: ${sendAt.toISOString()} (${diffYears.toFixed(1)} years from now)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findCampaignId()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });