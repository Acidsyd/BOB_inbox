#!/usr/bin/env node

const { toLocalTimestamp } = require('./src/utils/dateUtils.cjs');

// Test the toLocalTimestamp function to see if it's causing the issue
function testToLocalTimestamp() {
  console.log('🧪 Testing toLocalTimestamp function\n');
  
  const baseTime = new Date('2025-09-02T01:15:10.000Z');
  const delay6Min = 6 * 60 * 1000; // 6 minutes in milliseconds = 360,000ms
  
  console.log('Input test:');
  console.log(`baseTime: ${baseTime.toISOString()}`);
  console.log(`delay: ${delay6Min}ms = ${delay6Min/1000/60} minutes`);
  
  const scheduledAt = new Date(baseTime.getTime() + delay6Min);
  console.log(`scheduledAt: ${scheduledAt.toISOString()}`);
  console.log('Expected: 6 minutes later = 2025-09-02T01:21:10.000Z\n');
  
  const result = toLocalTimestamp(scheduledAt);
  console.log(`toLocalTimestamp result: "${result}"`);
  console.log(`typeof result: ${typeof result}`);
  
  // Test if the result gets parsed back correctly
  const parsedBack = new Date(result);
  console.log(`\nParsed back to Date: ${parsedBack.toISOString()}`);
  
  if (parsedBack.toISOString() === scheduledAt.toISOString()) {
    console.log('✅ toLocalTimestamp is working correctly');
  } else {
    console.log('❌ toLocalTimestamp is causing conversion issues');
  }
  
  // Check what would happen if we had the observed bug
  const buggyDelay = delay6Min * 60; // If somehow minutes get multiplied again
  const buggyDate = new Date(baseTime.getTime() + buggyDelay);
  console.log(`\nIf delay was multiplied by 60: ${buggyDate.toISOString()}`);
  
  // This should match what we see in the database (massive future dates)
}

testToLocalTimestamp();