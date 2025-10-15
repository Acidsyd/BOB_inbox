require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function checkTracking() {
  console.log('🔍 Checking tracking configuration for campaign:', campaignId);

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, name, status, config')
    .eq('id', campaignId)
    .single();

  if (error) {
    console.error('❌ Error fetching campaign:', error);
    return;
  }

  console.log('\n📋 Campaign Details:');
  console.log('Name:', campaign.name);
  console.log('Status:', campaign.status);
  console.log('\n🔧 Config:');
  console.log('trackOpens:', campaign.config?.trackOpens);
  console.log('trackClicks:', campaign.config?.trackClicks);
  console.log('includeUnsubscribe:', campaign.config?.includeUnsubscribe);

  // Check a sample sent email's tracking token
  const { data: sampleEmail } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, tracking_token, content')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .limit(1)
    .single();

  if (sampleEmail) {
    console.log('\n📧 Sample Sent Email:');
    console.log('ID:', sampleEmail.id);
    console.log('To:', sampleEmail.to_email);
    console.log('Tracking Token:', sampleEmail.tracking_token ? '✅ Present' : '❌ Missing');
    
    // Check if content has tracking pixel
    if (sampleEmail.content) {
      const hasTrackingPixel = sampleEmail.content.includes('tracking/open');
      console.log('Has Tracking Pixel in Content:', hasTrackingPixel ? '✅ Yes' : '❌ No');
      
      if (hasTrackingPixel) {
        const pixelMatch = sampleEmail.content.match(/src="([^"]*tracking\/open[^"]*)"/);
        if (pixelMatch) {
          console.log('Tracking Pixel URL:', pixelMatch[1]);
        }
      } else {
        console.log('\n⚠️ Email content does NOT contain tracking pixel!');
        console.log('This means tracking was not added when email was sent.');
      }
    }
  }
}

checkTracking().catch(console.error);
