/**
 * Test the sendingHours validation fix to ensure 00:00-00:00 bug is prevented
 */

require('dotenv').config({ path: './backend/.env' });
const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');

console.log('🔧 Testing sendingHours validation fix...\n');

const testConfigs = [
  {
    name: 'Buggy 00:00-00:00 (midnight-midnight)',
    sendingHours: { start: 0, end: 0 },
    expected: 'Should be fixed to 9-17'
  },
  {
    name: 'Invalid start >= end',
    sendingHours: { start: 17, end: 9 },
    expected: 'Should be fixed to 9-17'
  },
  {
    name: 'Same start and end',
    sendingHours: { start: 12, end: 12 },
    expected: 'Should be fixed to 9-17'
  },
  {
    name: 'Too small window (less than 1 hour)',
    sendingHours: { start: 10, end: 10 },
    expected: 'Should be expanded to minimum 1 hour'
  },
  {
    name: 'String values',
    sendingHours: { start: "8", end: "18" },
    expected: 'Should be converted to numbers 8-18'
  },
  {
    name: 'Invalid hour values',
    sendingHours: { start: -5, end: 30 },
    expected: 'Should be clamped to 0-23'
  },
  {
    name: 'Valid configuration',
    sendingHours: { start: 9, end: 17 },
    expected: 'Should remain unchanged'
  },
  {
    name: '24-hour operation (almost)',
    sendingHours: { start: 1, end: 23 },
    expected: 'Should remain unchanged'
  }
];

const leads = [{ email: 'test@example.com' }];
const emailAccounts = ['account1'];

testConfigs.forEach((testConfig, index) => {
  console.log(`🧪 Test ${index + 1}: ${testConfig.name}`);
  console.log(`   Input: start=${testConfig.sendingHours.start}, end=${testConfig.sendingHours.end}`);
  console.log(`   Expected: ${testConfig.expected}`);
  
  try {
    const config = {
      timezone: 'UTC',
      emailsPerDay: 50,
      emailsPerHour: 10,
      sendingInterval: 15,
      sendingHours: testConfig.sendingHours,
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };
    
    // This should trigger validation and potentially fix the values
    const scheduler = new CampaignScheduler(config);
    
    console.log(`   Result: start=${scheduler.sendingHours.start}, end=${scheduler.sendingHours.end}`);
    
    // Test that scheduling works without corruption
    const startTime = new Date('2025-09-04T10:00:00.000Z'); // Wednesday 10 AM
    const schedules = scheduler.scheduleEmails(leads, emailAccounts, startTime);
    
    if (schedules.length > 0) {
      const sendAt = schedules[0].sendAt;
      const timeDiff = sendAt.getTime() - startTime.getTime();
      const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
      
      console.log(`   First email scheduled: ${sendAt.toISOString()}`);
      console.log(`   Time difference: ${daysDiff.toFixed(3)} days`);
      
      if (daysDiff > 7) {
        console.log(`   ❌ STILL CORRUPTED: ${daysDiff.toFixed(1)} days in future`);
      } else {
        console.log(`   ✅ Normal scheduling: ${daysDiff < 1 ? 'same day' : daysDiff.toFixed(1) + ' days'}`);
      }
    } else {
      console.log(`   ❌ No schedules generated`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('');
});

// Special test: reproduce the exact bug that caused corruption
console.log('🚨 CRITICAL BUG REPRODUCTION TEST');
console.log('Testing the exact configuration that caused years-long corruption...\n');

try {
  const buggyConfig = {
    timezone: 'UTC',
    emailsPerDay: 50,
    emailsPerHour: 5,
    sendingInterval: 15,
    sendingHours: { start: 0, end: 0 }, // THE BUG!
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    enableJitter: true,
    jitterMinutes: 3
  };
  
  console.log('📋 Original buggy config: start=0, end=0 (midnight-midnight)');
  
  const scheduler = new CampaignScheduler(buggyConfig);
  
  console.log(`📅 After validation: start=${scheduler.sendingHours.start}, end=${scheduler.sendingHours.end}`);
  
  // Test with many leads to see if corruption happens
  const manyLeads = Array.from({ length: 20 }, (_, i) => ({ 
    email: `test${i + 1}@example.com` 
  }));
  
  const schedules = scheduler.scheduleEmails(manyLeads, emailAccounts);
  
  if (schedules.length > 0) {
    const firstSend = schedules[0].sendAt;
    const lastSend = schedules[schedules.length - 1].sendAt;
    const totalSpan = lastSend.getTime() - firstSend.getTime();
    const spanDays = totalSpan / (24 * 60 * 60 * 1000);
    const spanYears = spanDays / 365;
    
    console.log(`📊 Generated ${schedules.length} schedules`);
    console.log(`🕐 First: ${firstSend.toISOString()}`);
    console.log(`🕒 Last: ${lastSend.toISOString()}`);
    console.log(`📏 Total span: ${spanDays.toFixed(2)} days (${spanYears.toFixed(3)} years)`);
    
    if (spanYears > 0.1) {
      console.log(`❌ BUG STILL EXISTS: ${spanYears.toFixed(1)} years span`);
    } else {
      console.log(`✅ BUG FIXED: Normal ${spanDays < 1 ? 'same-day' : spanDays.toFixed(1) + '-day'} span`);
    }
  }
  
} catch (error) {
  console.log(`❌ Critical test failed: ${error.message}`);
}

console.log('\n✅ SendingHours validation test complete');