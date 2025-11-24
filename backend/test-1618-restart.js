const CampaignScheduler = require('./src/utils/CampaignScheduler');

console.log('=== Testing Campaign Restart at 16:18 Rome Time ===\n');

// Simulate the exact time when user restarted: Nov 24, 2025 16:18:39 Rome time
// This is 15:18:39 UTC (Rome is UTC+1)
const restartTime = new Date('2025-11-24T15:18:39.000Z'); // UTC time
console.log('Restart time (UTC):', restartTime.toISOString());
console.log('Restart time (Rome):', restartTime.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour12: false}));

// Create scheduler with exact campaign config
const scheduler = new CampaignScheduler({
  timezone: 'Europe/Rome',
  emailsPerDay: 50,
  sendingInterval: 15, // 15 minutes
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  enableJitter: true,
  jitterMinutes: 3
});

// Create test leads (just 3 for clarity)
const leads = [
  { email: 'e.regoli@oic.it' },
  { email: 'joe@speakinitaly.com' },
  { email: 'sandro.teloni@telonitravel.com' }
];

// Create test accounts (8 like in real campaign)
const emailAccounts = [
  'account-1', 'account-2', 'account-3', 'account-4',
  'account-5', 'account-6', 'account-7', 'account-8'
];

console.log('\n=== Scheduling with Perfect Rotation (NO startTime - uses new Date()) ===');
const schedules = scheduler.scheduleEmailsWithPerfectRotation(leads, emailAccounts);

console.log('\n=== Results ===');
schedules.forEach((schedule, index) => {
  const sendAtUTC = schedule.sendAt.toISOString();
  const sendAtRome = schedule.sendAt.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour12: false});
  const hourRome = parseInt(schedule.sendAt.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour: 'numeric', hour12: false}));
  const hourUTC = schedule.sendAt.getUTCHours();

  console.log(`\n[${index + 1}] ${schedule.lead.email}`);
  console.log(`    Send at (UTC): ${sendAtUTC}`);
  console.log(`    Send at (Rome): ${sendAtRome}`);
  console.log(`    Hour UTC: ${hourUTC}, Hour Rome: ${hourRome}`);

  if (hourRome < 9 || hourRome >= 17) {
    console.log(`    ⚠️  BUG: Hour ${hourRome} is OUTSIDE sending hours (9-17)!`);
  }

  // Check if it matches the buggy behavior (hour 23 Rome)
  if (hourRome === 23 || hourRome === 22 || hourRome === 0) {
    console.log(`    🐛 MATCHES BUG: This is the midnight scheduling bug!`);
  }
});

console.log('\n=== Analysis ===');
console.log('If hours are around 23:00 Rome time, we reproduced the bug!');
console.log('If hours are around 09:00 Rome time, the code is working correctly.');
