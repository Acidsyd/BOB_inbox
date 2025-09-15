// Test script to verify timezone fix
const { formatInTimeZone } = require('date-fns-tz');

console.log('🌐 Testing Timezone Fix');
console.log('=====================');

// Test the same timestamp that was showing incorrectly
const testDate = new Date('2025-09-15T14:21:00.000Z'); // UTC 14:21

console.log('Original UTC time:', testDate.toISOString());
console.log('Browser timezone (should be Europe/Rome):', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Test the formatInTimeZone function that we're now using
const formattedCEST = formatInTimeZone(testDate, 'Europe/Rome', 'MMM d, yyyy h:mm a');
console.log('Formatted with Europe/Rome timezone:', formattedCEST);

// Test what it shows in native browser format
const nativeFormat = testDate.toLocaleString('en-GB', {
  timeZone: 'Europe/Rome',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
console.log('Native browser format (Europe/Rome):', nativeFormat);

console.log('\n✅ Expected result: Should show 16:21 (CEST) instead of 14:21 (UTC)');