#!/usr/bin/env node

// Test how frontend handles timestamp parsing
console.log('🧪 Testing frontend timezone conversion issue...\n');

// Simulate what the backend sends
const backendTimestamp = "2025-09-22T07:00:00";

console.log('Backend sends:', backendTimestamp);

// Test how JavaScript Date constructor handles this
const dateObj1 = new Date(backendTimestamp);
console.log('new Date(backendTimestamp):', dateObj1.toISOString());
console.log('Local interpretation:', dateObj1.toString());

// Test with explicit UTC interpretation
const dateObj2 = new Date(backendTimestamp + 'Z');
console.log('\nnew Date(backendTimestamp + "Z"):', dateObj2.toISOString());
console.log('UTC interpretation:', dateObj2.toString());

// Test with date-fns-tz formatInTimeZone
const { formatInTimeZone } = require('date-fns-tz');

console.log('\n🌍 Testing formatInTimeZone:');
try {
  // Test with ambiguous timestamp (no Z)
  const result1 = formatInTimeZone(dateObj1, 'Europe/Rome', 'MMM d, yyyy h:mm a');
  console.log('formatInTimeZone(ambiguous):', result1);

  // Test with explicit UTC timestamp
  const result2 = formatInTimeZone(dateObj2, 'Europe/Rome', 'MMM d, yyyy h:mm a');
  console.log('formatInTimeZone(UTC):', result2);
} catch (error) {
  console.error('Error with formatInTimeZone:', error);
}

// Test what current time zone is detected as
console.log('\n🕐 Current timezone info:');
console.log('Local timezone offset:', new Date().getTimezoneOffset());
console.log('Detected timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
