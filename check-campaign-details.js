// Check detailed campaign info including scheduled emails
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('./backend/.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, value] = line.split('=');
    envVars[key.trim()] = value.trim();
  }
});

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_KEY);

async function checkCampaignDetails() {
  try {
    // Check the first active campaign
    const campaignId = 'fddb667c-e572-42b6-844e-e76680873631'; // header test campaign
    
    console.log(`📋 Checking campaign: ${campaignId}\n`);
    
    // Get campaign details
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (campError) {
      console.error('❌ Error fetching campaign:', campError.message);
      return;
    }
    
    console.log('Campaign Name:', campaign.name);
    console.log('Status:', campaign.status);
    console.log('Config:', JSON.stringify(campaign.config, null, 2));
    
    // Check scheduled emails for this campaign
    console.log('\n📧 Checking scheduled emails for this campaign...\n');
    
    const { data: emails, error: emailError } = await supabase
      .from('scheduled_emails')
      .select('id, status, to_email, send_at, sent_at, error_message')
      .eq('campaign_id', campaignId)
      .limit(10);
    
    if (emailError) {
      console.error('❌ Error fetching emails:', emailError.message);
      return;
    }
    
    if (!emails || emails.length === 0) {
      console.log('❌ No scheduled emails found for this campaign');
      console.log('\nPossible issues:');
      console.log('1. Campaign was started but emails were not created');
      console.log('2. Lead list might be empty');
      console.log('3. Email accounts might not be properly configured in campaign');
    } else {
      console.log(`Found ${emails.length} emails:`);
      emails.forEach(email => {
        console.log(`- ${email.to_email} | Status: ${email.status} | Send at: ${email.send_at}`);
        if (email.error_message) {
          console.log(`  Error: ${email.error_message}`);
        }
      });
    }
    
    // Check total count
    const { count } = await supabase
      .from('scheduled_emails')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId);
      
    console.log(`\nTotal emails for this campaign: ${count || 0}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCampaignDetails();