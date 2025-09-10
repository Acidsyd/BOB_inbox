/**
 * Test the CampaignScheduler directly to identify the calculation error
 */

require('dotenv').config({ path: './backend/.env' });
const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');

console.log('🔍 Testing CampaignScheduler directly for calculation errors...\n');

// Mock campaign configuration matching the database
const config = {
  timezone: 'UTC',
  emailsPerDay: 50,
  emailsPerHour: 5,
  sendingInterval: 15, // minutes
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  enableJitter: true,
  jitterMinutes: 3
};

console.log('📋 Campaign Configuration:');
console.log(`   sendingInterval: ${config.sendingInterval} minutes`);
console.log(`   emailsPerHour: ${config.emailsPerHour}`);
console.log(`   emailsPerDay: ${config.emailsPerDay}`);

// Create scheduler
const scheduler = new CampaignScheduler(config);

// Mock leads data (similar to actual data)
const leads = [
  { email: 'test1@example.com' },
  { email: 'test2@example.com' },
  { email: 'test3@example.com' },
  { email: 'test4@example.com' },
  { email: 'test5@example.com' },
  { email: 'test6@example.com' },
  { email: 'test7@example.com' },
  { email: 'test8@example.com' },
  { email: 'test9@example.com' },
  { email: 'test10@example.com' }
];

// Mock email accounts
const emailAccounts = ['account1', 'account2'];

console.log(`\n🧪 Testing with ${leads.length} leads and ${emailAccounts.length} accounts...`);

// Test the scheduler
const startTime = new Date(); // Use current time as start
console.log(`\n⏰ Start time: ${startTime.toISOString()}`);

const schedules = scheduler.scheduleEmails(leads, emailAccounts, startTime);

console.log(`\n📧 Generated ${schedules.length} schedules:`);

schedules.forEach((schedule, index) => {
  const sendAt = schedule.sendAt;
  const diffMs = sendAt.getTime() - startTime.getTime();
  const diffMinutes = diffMs / (60 * 1000);
  const diffHours = diffMinutes / 60;
  const diffDays = diffHours / 24;
  
  let timeDescription = '';
  if (diffMinutes < 60) {
    timeDescription = `${diffMinutes.toFixed(1)} minutes`;
  } else if (diffHours < 24) {
    timeDescription = `${diffHours.toFixed(1)} hours`;
  } else {
    timeDescription = `${diffDays.toFixed(1)} days`;
  }
  
  console.log(`   ${index + 1}. ${schedule.lead.email}`);
  console.log(`      Send at: ${sendAt.toISOString()}`);
  console.log(`      Time from start: ${timeDescription}`);
  
  if (index > 0) {
    const prevSchedule = schedules[index - 1];
    const intervalMs = sendAt.getTime() - prevSchedule.sendAt.getTime();
    const intervalMinutes = intervalMs / (60 * 1000);
    console.log(`      Interval from previous: ${intervalMinutes.toFixed(1)} minutes`);
  }
  
  console.log('');
});

// Check for calculation errors
const firstSchedule = schedules[0];
const lastSchedule = schedules[schedules.length - 1];
const totalTimeSpan = lastSchedule.sendAt.getTime() - firstSchedule.sendAt.getTime();
const totalDays = totalTimeSpan / (24 * 60 * 60 * 1000);

console.log(`📊 Analysis:`);
console.log(`   First email: ${firstSchedule.sendAt.toISOString()}`);
console.log(`   Last email: ${lastSchedule.sendAt.toISOString()}`);
console.log(`   Total time span: ${totalDays.toFixed(2)} days`);
console.log(`   Expected with 15-min intervals: ${(schedules.length * 15) / 60 / 24} days`);

if (totalDays > 7) {
  console.log(`\n🚨 FOUND THE ISSUE!`);
  console.log(`   Time span of ${totalDays.toFixed(2)} days is way too long for ${schedules.length} emails`);
  console.log(`   This indicates a calculation error in CampaignScheduler`);
}

// Additional debugging - check internal calculations
console.log(`\n🔧 Debug Internal Calculations:`);
console.log(`   this.sendingInterval: ${scheduler.sendingInterval}`);
console.log(`   this.emailsPerHour: ${scheduler.emailsPerHour}`);
console.log(`   Minimum interval from hourly limit: ${Math.ceil(60 / scheduler.emailsPerHour)} minutes`);
console.log(`   Actual interval used: ${Math.max(scheduler.sendingInterval, Math.ceil(60 / scheduler.emailsPerHour))} minutes`);

console.log('\n✅ CampaignScheduler direct test complete');