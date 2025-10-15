const CampaignScheduler = require('./src/utils/CampaignScheduler');

console.log('\n🧪 TESTING moveToNextValidSendingWindow');
console.log('='.repeat(80));

const scheduler = new CampaignScheduler({
  timezone: 'Europe/Rome',
  emailsPerDay: 50,
  emailsPerHour: 10,
  sendingInterval: 15,
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
});

// Simulate campaign started at 21:40:47 Rome time on Oct 14, 2025
const startTimeRome = '2025-10-14T21:40:47';
const TimezoneService = require('./src/services/TimezoneService');
const startTimeUTC = TimezoneService.convertFromUserTimezone(startTimeRome, 'Europe/Rome');

console.log(`\n📍 Simulating campaign start:`);
console.log(`   Rome time: ${startTimeRome}`);
console.log(`   UTC time: ${startTimeUTC.toISOString()}`);

const validWindow = scheduler.moveToNextValidSendingWindow(startTimeUTC);

console.log(`\n📍 Result from moveToNextValidSendingWindow:`);
console.log(`   UTC: ${validWindow.toISOString()}`);
console.log(`   Rome: ${validWindow.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);

const romeHour = parseInt(validWindow.toLocaleString('en-US', {
  timeZone: 'Europe/Rome',
  hour: 'numeric',
  hour12: false
}));

console.log(`   Rome hour: ${romeHour}`);
console.log(`   Expected: 9`);
console.log(`   Match: ${romeHour === 9 ? '✅' : '❌'}`);

console.log('\n' + '='.repeat(80) + '\n');
