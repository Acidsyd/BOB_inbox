#!/usr/bin/env node

// Debug the exact unit conversion issue
function debugUnitsBug() {
  console.log('🐛 Debugging Units Conversion Bug\n');
  
  console.log('Expected behavior for 6-minute interval, 2 accounts:');
  console.log('  Lead 0: 0 minutes = 0ms delay');
  console.log('  Lead 1: 6 minutes = 360,000ms delay');
  console.log('  Lead 2: 12 minutes = 720,000ms delay');
  console.log();
  
  console.log('But we\'re seeing 360,000 MINUTE delays instead of 360,000 MILLISECOND delays!');
  console.log('This suggests the system is treating milliseconds as minutes somewhere.');
  console.log();
  
  // Test the exact calculation
  const sendingInterval = 6;
  const baseTime = new Date('2025-09-01T23:15:10.000Z');
  
  console.log('Algorithm test:');
  for (let leadIndex = 0; leadIndex < 3; leadIndex++) {
    const baseDelay = leadIndex * sendingInterval * 60 * 1000; // Should be milliseconds
    const scheduledAt = new Date(baseTime.getTime() + baseDelay);
    
    console.log(`Lead ${leadIndex}:`);
    console.log(`  baseDelay: ${baseDelay}ms = ${baseDelay/1000/60} minutes`);
    console.log(`  scheduledAt: ${scheduledAt.toISOString()}`);
    console.log();
  }
  
  console.log('🔍 The algorithm is correct. The bug must be:');
  console.log('1. Database is storing the delay value wrong');
  console.log('2. OR toLocalTimestamp is converting wrong');
  console.log('3. OR Date constructor is interpreting the value wrong');
  
  // Test Date constructor with large numbers
  console.log('\n🧪 Testing Date constructor:');
  const testDelay = 360000; // 360,000ms = 6 minutes
  const testDate1 = new Date(baseTime.getTime() + testDelay);
  console.log(`baseTime + ${testDelay}ms = ${testDate1.toISOString()} ✅ Correct (6 min later)`);
  
  // What if system treats it as minutes?
  const testDate2 = new Date(baseTime.getTime() + testDelay * 60 * 1000);
  console.log(`baseTime + ${testDelay}*60*1000ms = ${testDate2.toISOString()} ❌ Wrong (250 days later)`);
  console.log();
  
  console.log('🎯 CONCLUSION: Something in the system is double-converting minutes!');
  console.log('The baseDelay calculation is correct, but something is multiplying by 60*1000 again.');
}

debugUnitsBug();