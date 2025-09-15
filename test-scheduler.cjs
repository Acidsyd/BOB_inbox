#!/usr/bin/env node

const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');

// Test with the exact same config as the campaign
const config = {
  timezone: 'Europe/Rome',
  emailsPerDay: 50,
  emailsPerHour: 5,
  sendingInterval: 15,
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  enableJitter: true,
  jitterMinutes: 3
};

console.log('🔍 Testing CampaignScheduler with config:', config);

const scheduler = new CampaignScheduler(config);

// Create 10 test leads
const testLeads = Array.from({ length: 10 }, (_, i) => ({
  id: `lead-${i + 1}`,
  email: `test${i + 1}@example.com`,
  first_name: `Test${i + 1}`
}));

const emailAccounts = ['test-account-1'];

console.log('📧 Scheduling 10 test emails...');
const schedules = scheduler.scheduleEmails(testLeads, emailAccounts);

console.log('📊 Results:');
schedules.forEach((schedule, i) => {
  const sendTime = schedule.sendAt;
  if (i > 0) {
    const prevTime = schedules[i-1].sendAt;
    const diffMinutes = (sendTime - prevTime) / (1000 * 60);
    console.log(`${i+1}. ${sendTime.toISOString()} (${diffMinutes.toFixed(1)} min gap)`);
  } else {
    console.log(`${i+1}. ${sendTime.toISOString()}`);
  }
});