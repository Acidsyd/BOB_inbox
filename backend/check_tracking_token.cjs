require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function checkTrackingTokens() {
  console.log('🔍 Checking tracking tokens in scheduled_emails table\n');

  // Get 5 sample emails
  const { data: emails } = await supabase
    .from('scheduled_emails')
    .select('id, to_email, status, tracking_token, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!emails || emails.length === 0) {
    console.log('❌ No emails found');
    return;
  }

  console.log(`📧 Found ${emails.length} emails:\n`);
  
  emails.forEach((email, i) => {
    console.log(`${i + 1}. ${email.to_email} (${email.status})`);
    console.log(`   Tracking Token: ${email.tracking_token || '❌ MISSING'}`);
    console.log(`   Created: ${email.created_at}`);
    console.log('');
  });

  // Check if all emails have tracking tokens
  const withoutToken = emails.filter(e => !e.tracking_token);
  const withToken = emails.filter(e => e.tracking_token);

  console.log(`\n📊 Summary:`);
  console.log(`✅ With tracking token: ${withToken.length}`);
  console.log(`❌ Without tracking token: ${withoutToken.length}`);

  if (withoutToken.length > 0) {
    console.log('\n⚠️ Some emails are missing tracking tokens!');
    console.log('This indicates tracking tokens were not generated during email creation.');
  }
}

checkTrackingTokens().catch(console.error);
