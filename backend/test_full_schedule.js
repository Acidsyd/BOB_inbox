const CampaignScheduler = require('./src/utils/CampaignScheduler');
const TimezoneService = require('./src/services/TimezoneService');

console.log('\n🧪 FULL SCHEDULE SIMULATION');
console.log('='.repeat(80));

const scheduler = new CampaignScheduler({
  timezone: 'Europe/Rome',
  emailsPerDay: 50,
  emailsPerHour: 10,
  sendingInterval: 5, // 5 minutes
  sendingHours: { start: 9, end: 17 },
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
});

// Create mock leads - enough to span multiple days
const mockLeads = Array.from({ length: 20 }, (_, i) => ({
  id: `lead-${i}`,
  email: `test${i}@example.com`
}));

const mockAccounts = ['account-1'];

// Simulate campaign started at 21:40:47 Rome time on Oct 14, 2025
const startTimeRome = '2025-10-14T21:40:47';
const startTimeUTC = TimezoneService.convertFromUserTimezone(startTimeRome, 'Europe/Rome');

console.log(`\n📍 Campaign start time:`);
console.log(`   Rome: ${startTimeRome}`);
console.log(`   UTC: ${startTimeUTC.toISOString()}`);

console.log(`\n🔄 Running scheduler...`);
const schedules = scheduler.scheduleEmailsWithPerfectRotation(
  mockLeads,
  mockAccounts,
  startTimeUTC
);

console.log(`\n📊 Scheduled ${schedules.length} emails`);
console.log('\n📧 First 10 emails:');
console.log('='.repeat(80));

schedules.slice(0, 10).forEach((schedule, i) => {
  const sendAt = new Date(schedule.sendAt);
  const romeTime = sendAt.toLocaleString('en-US', {
    timeZone: 'Europe/Rome',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  console.log(`${i+1}. ${schedule.lead.email}`);
  console.log(`   sendAt (object): ${schedule.sendAt}`);
  console.log(`   UTC: ${sendAt.toISOString()}`);
  console.log(`   Rome: ${romeTime}`);

  // Extract hour
  const hour = parseInt(sendAt.toLocaleString('en-US', {
    timeZone: 'Europe/Rome',
    hour: 'numeric',
    hour12: false
  }));

  if (hour < 9 || hour >= 17) {
    console.log(`   ⚠️  WARNING: Outside sending hours! (hour: ${hour})`);
  }

  console.log();
});

console.log('='.repeat(80) + '\n');
