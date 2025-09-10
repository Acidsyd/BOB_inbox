// Check campaign status
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

async function checkCampaigns() {
  try {
    console.log('📋 Checking campaigns...\n');
    
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching campaigns:', error.message);
      return;
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('📭 No campaigns found');
      console.log('Create and start a campaign to send emails');
    } else {
      console.log(`✅ Found ${campaigns.length} campaigns:\n`);
      campaigns.forEach(campaign => {
        console.log(`Name: ${campaign.name}`);
        console.log(`Status: ${campaign.status}`);
        console.log(`ID: ${campaign.id}`);
        console.log(`Created: ${campaign.created_at}`);
        console.log('---');
      });
      
      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      if (activeCampaigns.length === 0) {
        console.log('\n⚠️  No active campaigns');
        console.log('Start a campaign to begin sending emails');
      } else {
        console.log(`\n✅ ${activeCampaigns.length} active campaigns`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCampaigns();