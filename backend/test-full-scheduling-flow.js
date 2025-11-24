const CampaignScheduler = require('./src/utils/CampaignScheduler');

console.log('=== Testing Full Scheduling Flow ===\n');

// Simulate a campaign starting NOW (16:18 Rome time on Nov 24)
const now = new Date(); // Let it use actual current time
console.log('Current time (UTC):', now.toISOString());
console.log('Current time (Rome):', now.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour12: false}));

// Create scheduler with campaign config
const scheduler = new CampaignScheduler({
  timezone: 'Europe/Rome',
  emailsPerDay: 50,
  sendingInterval: 15, // 15 minutes
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  enableJitter: true,
  jitterMinutes: 3
});

// Create test leads
const leads = [
  { email: 'lead1@example.com' },
  { email: 'lead2@example.com' },
  { email: 'lead3@example.com' }
];

// Create test accounts
const emailAccounts = [
  'account-1-uuid',
  'account-2-uuid'
];

console.log('\n=== Scheduling with Perfect Rotation ===');
const schedules = scheduler.scheduleEmailsWithPerfectRotation(leads, emailAccounts);

console.log('\n=== Results ===');
schedules.forEach((schedule, index) => {
  const sendAtUTC = schedule.sendAt.toISOString();
  const sendAtRome = schedule.sendAt.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour12: false});
  const hour = parseInt(schedule.sendAt.toLocaleString('en-US', {timeZone: 'Europe/Rome', hour: 'numeric', hour12: false}));

  console.log(`\n[${index + 1}] ${schedule.lead.email}`);
  console.log(`    Account: ${schedule.emailAccountId}`);
  console.log(`    Send at (UTC): ${sendAtUTC}`);
  console.log(`    Send at (Rome): ${sendAtRome}`);
  console.log(`    Hour in Rome: ${hour}`);

  if (hour < 9 || hour >= 17) {
    console.log(`    ⚠️  WARNING: Hour ${hour} is OUTSIDE sending hours (9-17)!`);
  }
});
