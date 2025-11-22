/**
 * Test volume variation integration with campaign scheduling
 * Run with: node backend/test-volume-integration.js
 */

const CampaignScheduler = require('./src/utils/CampaignScheduler');

function testVolumeIntegration() {
  console.log('🧪 TESTING VOLUME VARIATION INTEGRATION\n');
  console.log('='.repeat(80));

  // Test 1: Volume variation enabled by default
  console.log('\n📊 TEST 1: Volume Variation Enabled by Default');
  console.log('─'.repeat(80));

  const schedulerDefault = new CampaignScheduler({
    timezone: 'UTC',
    emailsPerDay: 50,
    sendingInterval: 15,
    sendingHours: { start: 9, end: 17 },
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    // Notice: enableVolumeVariation NOT specified, should default to true
  });

  console.log(`   enableVolumeVariation: ${schedulerDefault.enableVolumeVariation}`);
  console.log(`   Expected: true (enabled by default)`);
  console.log(`   Status: ${schedulerDefault.enableVolumeVariation === true ? '✅ PASS' : '❌ FAIL'}`);

  // Test 2: Can be explicitly disabled
  console.log('\n📊 TEST 2: Can Be Explicitly Disabled');
  console.log('─'.repeat(80));

  const schedulerDisabled = new CampaignScheduler({
    timezone: 'UTC',
    emailsPerDay: 50,
    sendingInterval: 15,
    sendingHours: { start: 9, end: 17 },
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enableVolumeVariation: false
  });

  console.log(`   enableVolumeVariation: ${schedulerDisabled.enableVolumeVariation}`);
  console.log(`   Expected: false (explicitly disabled)`);
  console.log(`   Status: ${schedulerDisabled.enableVolumeVariation === false ? '✅ PASS' : '❌ FAIL'}`);

  // Test 3: Volume target calculation during scheduling
  console.log('\n📊 TEST 3: Volume Target During Scheduling');
  console.log('─'.repeat(80));

  const leads = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    email: `lead${i + 1}@example.com`,
    first_name: `Lead${i + 1}`
  }));

  const accounts = ['account-1', 'account-2', 'account-3'];

  // Schedule with variation enabled (should see varied targets in logs)
  console.log('   Scheduling 100 emails with volume variation enabled...');
  const schedules = schedulerDefault.scheduleEmails(leads, accounts, new Date('2025-01-13T09:00:00Z'));

  console.log(`   Scheduled: ${schedules.length} emails`);
  console.log(`   Status: ${schedules.length === 100 ? '✅ PASS' : '❌ FAIL'}`);

  // Test 4: Multi-day scheduling shows volume variation
  console.log('\n📊 TEST 4: Multi-Day Volume Variation');
  console.log('─'.repeat(80));

  // Create enough leads to span multiple days
  const manyLeads = Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    email: `lead${i + 1}@example.com`,
    first_name: `Lead${i + 1}`
  }));

  const manySchedules = schedulerDefault.scheduleEmails(manyLeads, accounts, new Date('2025-01-13T09:00:00Z'));

  // Group by day to see variation
  const byDay = {};
  manySchedules.forEach(schedule => {
    const day = schedule.sendAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  });

  console.log('   Emails per day (first 7 days):');
  Object.entries(byDay).slice(0, 7).forEach(([day, count], index) => {
    const dayOfWeek = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
    console.log(`   ${day} (${dayOfWeek}): ${count} emails`);
  });

  const uniqueCounts = new Set(Object.values(byDay)).size;
  console.log(`\n   Unique daily counts: ${uniqueCounts}`);
  console.log(`   Has variation: ${uniqueCounts > 1 ? '✅ PASS' : '❌ FAIL'}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ VOLUME VARIATION INTEGRATION TESTS COMPLETED');
  console.log('─'.repeat(80));
  console.log('   Default behavior: Enabled for all new campaigns');
  console.log('   Can be disabled: Set enableVolumeVariation: false');
  console.log('   Integration: Automatically applied during scheduling');
  console.log('   Daily recalculation: New target when day changes');
  console.log('='.repeat(80) + '\n');
}

// Run test
testVolumeIntegration();
