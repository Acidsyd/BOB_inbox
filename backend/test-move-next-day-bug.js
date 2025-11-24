const TimezoneService = require('./src/services/TimezoneService');

// Simulate the bug
function buggyMoveToNextDay(date, timezone) {
  let current = new Date(date);
  console.log('1. Input date (UTC):', current.toISOString());
  console.log('   Input date (Rome):', current.toLocaleString('en-US', {timeZone: timezone, hour12: false}));

  // BUG: This modifies the date in UTC, not in timezone!
  current.setDate(current.getDate() + 1);
  console.log('2. After setDate +1 (UTC):', current.toISOString());
  console.log('   After setDate +1 (Rome):', current.toLocaleString('en-US', {timeZone: timezone, hour12: false}));

  // Extract minutes/seconds from ORIGINAL date in Rome timezone
  const currentMinute = parseInt(date.toLocaleString('en-US', {
    timeZone: timezone,
    minute: 'numeric'
  })) || 0;
  const currentSecond = parseInt(date.toLocaleString('en-US', {
    timeZone: timezone,
    second: 'numeric'
  })) || 0;
  console.log('3. Extracted minute/second:', currentMinute, currentSecond);

  // Extract year/month/day from MODIFIED current in Rome timezone
  const year = parseInt(current.toLocaleDateString('en-CA', { timeZone: timezone, year: 'numeric' }));
  const month = parseInt(current.toLocaleDateString('en-CA', { timeZone: timezone, month: '2-digit' }));
  const day = parseInt(current.toLocaleDateString('en-CA', { timeZone: timezone, day: '2-digit' }));
  console.log('4. Extracted date components:', {year, month, day});

  // Create timezone string with hour = 9 (start of day)
  const hour = 9;
  const timezoneDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:${String(currentSecond).padStart(2, '0')}`;
  console.log('5. Created timezone date string:', timezoneDateStr);

  // Convert to UTC
  const result = TimezoneService.convertFromUserTimezone(timezoneDateStr, timezone);
  console.log('6. Final result (UTC):', result.toISOString());
  console.log('   Final result (Rome):', result.toLocaleString('en-US', {timeZone: timezone, hour12: false}));

  return result;
}

console.log('=== Testing moveToNextDay bug ===\n');

// Test case: 4:30pm Rome time on Nov 25, 2025 (16:30 Rome = 15:30 UTC)
const testDate = new Date('2025-11-25T15:30:00.000Z'); // 4:30pm Rome time
buggyMoveToNextDay(testDate, 'Europe/Rome');

console.log('\n=== Expected behavior ===');
console.log('Should schedule for: Nov 26, 2025 9:30:00 AM Rome time (08:30:00 UTC)');
console.log('But schedules for: Nov 26, 2025 11:00:00 PM Rome time (23:00:00 UTC) or similar wrong time');
