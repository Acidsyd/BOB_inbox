const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const campaignId = '3afa6a78-2101-404c-a911-13e36eeb5298';

async function testCount() {
  console.log('Testing COUNT query...');

  const result1 = await supabase.from('scheduled_emails').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'sent');
  console.log('Sent emails:', result1.count);

  const result2 = await supabase.from('scheduled_emails').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'bounced');
  console.log('Bounced emails:', result2.count);
  console.log('Total sent:', result1.count + result2.count);
}

testCount().then(() => process.exit(0));
