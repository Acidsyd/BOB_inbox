/**
 * Test the exact conditions that cause CampaignScheduler corruption
 * Reproduce the October 15, 2025 22:00 startTime issue
 */

require('dotenv').config({ path: './backend/.env' });
const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');

console.log('🔍 Testing specific corruption conditions...\n');

// Test the exact failing configuration
const corruptedConfig = {
  timezone: 'UTC',
  emailsPerDay: 50,
  emailsPerHour: 5,
  sendingInterval: 15, // minutes
  sendingHours: { start: 9, end: 17 }, // 9 AM to 5 PM
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  enableJitter: true,
  jitterMinutes: 3
};

console.log('📋 Corrupted Campaign Configuration:');
console.log(`   sendingInterval: ${corruptedConfig.sendingInterval} minutes`);
console.log(`   emailsPerHour: ${corruptedConfig.emailsPerHour}`);
console.log(`   sendingHours: ${corruptedConfig.sendingHours.start}:00 - ${corruptedConfig.sendingHours.end}:00`);
console.log(`   activeDays: ${corruptedConfig.activeDays.join(', ')}`);

// Create scheduler
const scheduler = new CampaignScheduler(corruptedConfig);
console.log(`\n🔧 Scheduler internal values:`);
console.log(`   this.sendingInterval: ${scheduler.sendingInterval}`);
console.log(`   this.emailsPerHour: ${scheduler.emailsPerHour}`);
console.log(`   this.activeDayNumbers: [${scheduler.activeDayNumbers.join(', ')}]`);

// Test leads
const leads = [
  { email: 'test1@example.com' },
  { email: 'test2@example.com' },
  { email: 'test3@example.com' }
];

const emailAccounts = ['account1'];

// Test with different start times to find the issue
const testTimes = [
  new Date(), // Current time (working in my previous tests)
  new Date('2025-10-15T22:00:00.000Z'), // The problematic time from fix output
  new Date('2025-10-15T09:00:00.000Z'), // Same date but in sending hours
  new Date('2025-10-15T18:00:00.000Z'), // After sending hours end
  new Date('2025-10-13T22:00:00.000Z'), // Monday (active day) after hours
];

testTimes.forEach((startTime, index) => {
  console.log(`\n📅 Test ${index + 1}: Start time ${startTime.toISOString()}`);
  console.log(`   Day of week: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startTime.getDay()]}`);
  console.log(`   Hour: ${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`);
  
  try {
    // Step 1: Test moveToNextValidSendingWindow
    const validWindow = scheduler.moveToNextValidSendingWindow(startTime);
    console.log(`   ✅ Valid window: ${validWindow.toISOString()}`);
    
    const timeDiff = validWindow.getTime() - startTime.getTime();
    const diffDays = timeDiff / (24 * 60 * 60 * 1000);
    console.log(`   ⏱️ Time jump: ${diffDays.toFixed(2)} days`);
    
    if (diffDays > 7) {
      console.log(`   🚨 LARGE TIME JUMP DETECTED!`);
    }
    
    // Step 2: Test full scheduling
    const schedules = scheduler.scheduleEmails(leads, emailAccounts, startTime);
    
    if (schedules.length > 0) {
      const firstSend = schedules[0].sendAt;
      const lastSend = schedules[schedules.length - 1].sendAt;
      const totalSpan = lastSend.getTime() - firstSend.getTime();
      const spanDays = totalSpan / (24 * 60 * 60 * 1000);
      const spanYears = spanDays / 365;
      
      console.log(`   📧 ${schedules.length} schedules generated`);
      console.log(`   📊 Span: ${spanDays.toFixed(2)} days (${spanYears.toFixed(3)} years)`);
      console.log(`   🕐 First: ${firstSend.toISOString()}`);
      console.log(`   🕒 Last: ${lastSend.toISOString()}`);
      
      if (spanYears > 0.1) {
        console.log(`   🚨 CORRUPTION REPRODUCED!`);
        console.log(`   🔍 This configuration causes the scheduling bug`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
});

// Test specific edge case: What happens with maxAttempts in moveToNextValidSendingWindow?
console.log('\n🔍 Testing edge case scenarios...');

// Test with impossible configuration (no valid days)
const impossibleScheduler = new CampaignScheduler({
  ...corruptedConfig,
  activeDays: ['saturday'], // Only Saturday
  sendingHours: { start: 9, end: 17 }
});

console.log('\n📅 Impossible config test (only Saturday active):');
const mondayStart = new Date('2025-10-13T10:00:00.000Z'); // Monday 10 AM
console.log(`   Start: ${mondayStart.toISOString()} (Monday)`);

try {
  const result = impossibleScheduler.moveToNextValidSendingWindow(mondayStart);
  const jumpDays = (result.getTime() - mondayStart.getTime()) / (24 * 60 * 60 * 1000);
  console.log(`   Result: ${result.toISOString()}`);
  console.log(`   Jump: ${jumpDays.toFixed(1)} days`);
  
  if (jumpDays > 30) {
    console.log(`   🚨 EXCESSIVE JUMP - This could cause the corruption!`);
  }
} catch (error) {
  console.log(`   ❌ Error in impossible config: ${error.message}`);
}

console.log('\n✅ Specific corruption test complete');