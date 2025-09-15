#!/usr/bin/env node

console.log('🌐 Testing timezone handling for Italy (CEST)...');

// Current time
const now = new Date();
console.log('Current UTC time:', now.toISOString());
console.log('Current local time:', now.toLocaleString());

// Test with Europe/Rome timezone (CEST in summer, CET in winter)
const italyTimezone = 'Europe/Rome';
console.log('\n📍 Europe/Rome timezone formatting:');
console.log('Current time in Rome:', now.toLocaleString('en-US', { timeZone: italyTimezone }));
console.log('Current time in Rome (24h):', now.toLocaleString('en-GB', {
  timeZone: italyTimezone,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

// Test with a sample timestamp that might be from your database
console.log('\n📧 Testing email timestamp formatting:');

// Simulate a timestamp that was stored 2 minutes ago
const emailTime = new Date(now.getTime() - (2 * 60 * 1000)); // 2 minutes ago
console.log('Email time UTC:', emailTime.toISOString());
console.log('Email time in Rome:', emailTime.toLocaleString('en-GB', {
  timeZone: italyTimezone,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

// Check specific times to debug the 16:21 vs 14:21 issue
console.log('\n🐛 Debugging the specific time issue:');
const testTime = new Date('2025-09-15T14:21:00.000Z'); // UTC 14:21
console.log('UTC 14:21 time:', testTime.toISOString());
console.log('Should show as CEST 16:21:', testTime.toLocaleString('en-GB', {
  timeZone: italyTimezone,
  hour: '2-digit',
  minute: '2-digit'
}));
console.log('Full format:', testTime.toLocaleString('en-GB', {
  timeZone: italyTimezone,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

// Test the opposite - what time would show UTC 14:21 in Rome timezone
console.log('\n🔄 Reverse test - if display shows 14:21, what would be the UTC time?');
const displayTime = new Date('2025-09-15T12:21:00.000Z'); // UTC 12:21 = CEST 14:21
console.log('UTC 12:21 time:', displayTime.toISOString());
console.log('Shows as CEST 14:21:', displayTime.toLocaleString('en-GB', {
  timeZone: italyTimezone,
  hour: '2-digit',
  minute: '2-digit'
}));