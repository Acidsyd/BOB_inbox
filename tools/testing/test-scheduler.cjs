const CampaignScheduler = require('./backend/src/utils/CampaignScheduler');

// Test the scheduler logic
const config = {
  timezone: 'Europe/Rome',
  sendingHours: { start: 9, end: 17 },
  emailsPerHour: 10,
  sendingInterval: 15,
  emailsPerDay: 100,
  activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
};

const scheduler = new CampaignScheduler(config);

console.log('Testing scheduler with current time...');

// Test with current time (around 17:38 CEST)
const now = new Date();
console.log('Current UTC time:', now.toISOString());
console.log('Current Europe/Rome time:', now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));

// Test moveToNextValidSendingWindow
const validTime = scheduler.moveToNextValidSendingWindow(now);
console.log('Valid sending window time:', validTime.toISOString());
console.log('Valid time in Europe/Rome:', validTime.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));

// Test current hour detection
const currentHour = scheduler.getHourInTimezone(now);
console.log('Current hour in Europe/Rome:', currentHour);

// Test what happens when we schedule emails
console.log('\nScheduling test with 3 fake leads...');
const fakeLeads = [
  { email: 'test1@example.com' },
  { email: 'test2@example.com' },
  { email: 'test3@example.com' }
];
const fakeAccounts = ['account1'];

const schedules = scheduler.scheduleEmails(fakeLeads, fakeAccounts);
console.log('Scheduled times:');
schedules.forEach((schedule, idx) => {
  const timeInRome = schedule.sendAt.toLocaleString('en-US', { timeZone: 'Europe/Rome' });
  console.log((idx + 1) + '. ' + schedule.lead.email + ' -> ' + timeInRome + ' (' + schedule.sendAt.toISOString() + ')');
});
