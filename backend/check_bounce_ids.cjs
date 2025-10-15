require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function checkBounceIds() {
  console.log('🔍 Checking bounce IDs...\n');

  const { data: bounces } = await supabase
    .from('email_bounces')
    .select('id, recipient_email')
    .eq('campaign_id', campaignId);

  console.log(`📧 Found ${bounces?.length || 0} bounces:\n`);

  if (bounces && bounces.length > 0) {
    bounces.forEach((b, i) => {
      console.log(`${i + 1}. Email: ${b.recipient_email}`);
      console.log(`   Bounce ID: ${b.id}`);
      console.log(`   Pseudo-conversation ID: bounce_${b.id}\n`);
    });
  }
}

checkBounceIds().catch(console.error);
