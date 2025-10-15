const CampaignScheduler = require('./src/utils/CampaignScheduler');
const TimezoneService = require('./src/services/TimezoneService');

console.log('\n🧪 TESTING CAMPAIGN SCHEDULER TIMEZONE LOGIC');
console.log('='.repeat(80));

// Test 1: Direct timezone conversion
console.log('\n📍 Test 1: TimezoneService.convertFromUserTimezone');
const romeTime = '2025-10-16T09:00:00';
const timezone = 'Europe/Rome';
const utcTime = TimezoneService.convertFromUserTimezone(romeTime, timezone);
console.log(`   Input (Rome): ${romeTime}`);
console.log(`   Output (UTC): ${utcTime.toISOString()}`);
console.log(`   Expected: 2025-10-16T07:00:00.000Z`);
console.log(`   Match: ${utcTime.toISOString() === '2025-10-16T07:00:00.000Z' ? '✅' : '❌'}`);

// Test 2: CampaignScheduler.setHourInTimezone
console.log('\n📍 Test 2: CampaignScheduler.setHourInTimezone');
const scheduler = new CampaignScheduler({
  timezone: 'Europe/Rome',
  emailsPerDay: 50,
  emailsPerHour: 10,
  sendingInterval: 15,
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
});

const testDate = new Date('2025-10-16T08:00:00.000Z'); // Some time on Oct 16
const result = scheduler.setHourInTimezone(testDate, 9, 0, 0);
console.log(`   Input date: ${testDate.toISOString()}`);
console.log(`   Setting hour to: 9 (in Rome timezone)`);
console.log(`   Output (UTC): ${result.toISOString()}`);
console.log(`   Expected: 2025-10-16T07:00:00.000Z`);
console.log(`   Match: ${result.toISOString() === '2025-10-16T07:00:00.000Z' ? '✅' : '❌'}`);

// Test 3: moveToNextValidSendingWindow from early morning
console.log('\n📍 Test 3: moveToNextValidSendingWindow from early morning');
const earlyMorning = new Date('2025-10-16T06:00:00.000Z'); // 8 AM Rome time (before 9 AM start)
const validWindow = scheduler.moveToNextValidSendingWindow(earlyMorning);
console.log(`   Input (UTC): ${earlyMorning.toISOString()}`);
console.log(`   Input (Rome): ${earlyMorning.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);
console.log(`   Output (UTC): ${validWindow.toISOString()}`);
console.log(`   Output (Rome): ${validWindow.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);
console.log(`   Expected Rome time: 09:00:00`);
const romeHour = parseInt(validWindow.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour: 'numeric', hour12: false }));
console.log(`   Match: ${romeHour === 9 ? '✅' : '❌ (Got hour: ' + romeHour + ')'}`);

// Test 4: scheduleEmailsWithPerfectRotation with explicit start time
console.log('\n📍 Test 4: scheduleEmailsWithPerfectRotation');
const mockLeads = [
  { id: 'lead-1', email: 'test1@example.com' },
  { id: 'lead-2', email: 'test2@example.com' }
];
const mockAccounts = ['account-1'];
const startTime = new Date('2025-10-16T07:00:00.000Z'); // 9 AM Rome time

const scheduledEmails = scheduler.scheduleEmailsWithPerfectRotation(
  mockLeads,
  mockAccounts,
  startTime
);

console.log(`   Start time (UTC): ${startTime.toISOString()}`);
console.log(`   Start time (Rome): ${startTime.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);
console.log(`   First scheduled email:`);
console.log(`     UTC: ${scheduledEmails[0].send_at}`);
const firstEmailDate = new Date(scheduledEmails[0].send_at);
console.log(`     Rome: ${firstEmailDate.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour12: false })}`);
const firstEmailRomeHour = parseInt(firstEmailDate.toLocaleString('en-US', { timeZone: 'Europe/Rome', hour: 'numeric', hour12: false }));
console.log(`     Rome hour: ${firstEmailRomeHour}`);
console.log(`     Expected hour: 9`);
console.log(`     Match: ${firstEmailRomeHour === 9 ? '✅' : '❌'}`);

console.log('\n' + '='.repeat(80) + '\n');
