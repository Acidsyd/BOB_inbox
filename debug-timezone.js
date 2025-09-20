#!/usr/bin/env node
import { formatInTimeZone } from 'date-fns-tz';

console.log('🔍 Testing timezone formatting...');
console.log('Current time:', new Date().toISOString());

// Test the exact timestamps from the logs
const testTimestamps = [
  '2025-09-19T16:21:44.001', // Recent activity (should be past)
  '2025-09-19T16:37:43',     // Recent activity (should be future?)
  '2025-09-22T07:00:00',     // Scheduled activity (should be future)
  '2025-09-22T07:12:54.988'  // Scheduled activity (should be future)
];

console.log('\n📅 Testing timestamps with Europe/Rome timezone:');
testTimestamps.forEach(timestamp => {
  const date = new Date(timestamp);
  const formatted = formatInTimeZone(date, 'Europe/Rome', 'MMM d, yyyy h:mm a');
  const now = new Date();
  const isFuture = date > now;

  console.log(`${timestamp} → ${formatted} (${isFuture ? 'FUTURE' : 'PAST'})`);
});

console.log('\n🌐 Browser-style timezone test:');
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log('Detected timezone:', browserTimezone);

testTimestamps.forEach(timestamp => {
  const date = new Date(timestamp);
  const formatted = formatInTimeZone(date, browserTimezone, 'MMM d, yyyy h:mm a');
  const now = new Date();
  const isFuture = date > now;

  console.log(`${timestamp} → ${formatted} (${isFuture ? 'FUTURE' : 'PAST'})`);
});