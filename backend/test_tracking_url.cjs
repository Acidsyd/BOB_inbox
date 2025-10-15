require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function testTrackingUrls() {
  console.log('🔍 Testing Tracking URL Configuration\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check current BASE_URL
  const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
  console.log('📡 Current BASE_URL:', baseUrl);

  if (baseUrl.includes('localhost')) {
    console.log('\n⚠️  WARNING: BASE_URL is set to localhost!');
    console.log('   This means tracking pixels will NOT work for external recipients.');
    console.log('   Recipients can only open tracking pixels if they can access localhost:4000');
    console.log('   which is impossible from their email clients.\n');
  } else {
    console.log('\n✅ BASE_URL is set to a public domain. Tracking should work!\n');
  }

  // Check sample sent email
  const { data: email } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, tracking_token, content')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .limit(1)
    .single();

  if (email) {
    console.log('📧 Sample Email Analysis:');
    console.log('   To:', email.to_email);
    console.log('   Tracking Token:', email.tracking_token);

    // Extract tracking pixel URL from content
    const pixelMatch = email.content.match(/src="([^"]*\/api\/track\/open\/[^"]*)"/);
    if (pixelMatch) {
      const pixelUrl = pixelMatch[1];
      console.log('\n   Tracking Pixel URL:', pixelUrl);

      if (pixelUrl.includes('localhost')) {
        console.log('\n   ❌ PROBLEM: Pixel URL contains localhost!');
        console.log('   This email cannot be tracked when opened externally.');
      } else {
        console.log('\n   ✅ Pixel URL is publicly accessible!');
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('\n💡 SOLUTION:\n');
  console.log('For Development Testing with Real Emails:');
  console.log('1. Install ngrok: https://ngrok.com/');
  console.log('2. Run: ngrok http 4000');
  console.log('3. Copy the https URL (e.g., https://abc123.ngrok.io)');
  console.log('4. Update .env: BASE_URL=https://abc123.ngrok.io');
  console.log('5. Restart backend server');
  console.log('6. New emails will have tracking that works externally\n');

  console.log('For Production:');
  console.log('1. Deploy backend to your domain (e.g., api.yourdomain.com)');
  console.log('2. Update .env: BASE_URL=https://api.yourdomain.com');
  console.log('3. Restart backend server');
  console.log('4. All tracking will work in production\n');

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check how many emails were sent with localhost URLs
  const { count: sentCount } = await supabase
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'sent');

  console.log(`📊 Current Status:`);
  console.log(`   ${sentCount} emails sent with localhost tracking URLs`);
  console.log(`   These emails CANNOT be tracked externally`);
  console.log(`   Only opens from localhost (your machine) will be detected\n`);
}

testTrackingUrls().catch(console.error);
