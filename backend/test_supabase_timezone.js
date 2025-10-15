const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('\n🌍 SYSTEM TIMEZONE INFORMATION');
console.log('='.repeat(80));
console.log(`TZ environment variable: ${process.env.TZ || 'not set'}`);
console.log(`Node.js timezone offset: ${new Date().getTimezoneOffset()} minutes`);
console.log(`System timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testTimezoneHandling() {
  console.log('\n🧪 TESTING SUPABASE TIMESTAMP HANDLING');
  console.log('='.repeat(80));

  // Test 1: Insert a known UTC time
  const testTime = new Date('2025-10-16T07:00:00.000Z'); // 9 AM Rome
  console.log(`\n📍 Test time to insert:`);
  console.log(`   Date object: ${testTime.toISOString()}`);
  console.log(`   In Rome: ${testTime.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);

  // Test 2: Check existing value from database
  console.log(`\n📍 Existing database value:`);
  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('send_at, created_at')
    .eq('campaign_id', '55205d7b-9ebf-414a-84bc-52c8b724dd30')
    .gte('send_at', '2025-10-16T00:00:00')
    .limit(1)
    .single();

  if (error) {
    console.log('   Error:', error.message);
  } else {
    console.log(`   Raw send_at: ${data.send_at} (type: ${typeof data.send_at})`);
    console.log(`   Raw created_at: ${data.created_at} (type: ${typeof data.created_at})`);

    // Parse as Date
    const sendAtDate = new Date(data.send_at);
    const createdAtDate = new Date(data.created_at);

    console.log(`\n   send_at as Date:`);
    console.log(`     toISOString(): ${sendAtDate.toISOString()}`);
    console.log(`     toUTCString(): ${sendAtDate.toUTCString()}`);
    console.log(`     Rome time: ${sendAtDate.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);

    console.log(`\n   created_at as Date:`);
    console.log(`     toISOString(): ${createdAtDate.toISOString()}`);
    console.log(`     toUTCString(): ${createdAtDate.toUTCString()}`);
    console.log(`     Rome time: ${createdAtDate.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

testTimezoneHandling().catch(console.error);
