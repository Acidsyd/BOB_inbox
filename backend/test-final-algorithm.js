#!/usr/bin/env node

// Test the FINAL correct scheduling algorithm
function testFinalAlgorithm() {
  console.log('✅ Testing FINAL Correct Scheduling Algorithm\n');
  
  console.log('CORRECT REQUIREMENTS:');
  console.log('1. sendingInterval = gap between emails from SAME CAMPAIGN');
  console.log('2. Campaigns work independently (accounts can overlap across campaigns)');
  console.log('3. ONE email per interval per campaign, rotating accounts\n');
  
  // Test case 1: 2 accounts, 2-minute interval
  console.log('TEST CASE 1: 2 accounts, 2-minute interval, 6 leads');
  console.log('Expected: 0min, 2min, 4min, 6min, 8min, 10min (2-min gaps)');
  console.log('Account rotation: A, B, A, B, A, B\n');
  
  testAlgorithm(2, 2, 6);
  
  console.log('\n' + '='.repeat(60));
  
  // Test case 2: 3 accounts, 15-minute interval
  console.log('\nTEST CASE 2: 3 accounts, 15-minute interval, 6 leads');
  console.log('Expected: 0min, 15min, 30min, 45min, 60min, 75min (15-min gaps)');
  console.log('Account rotation: A, B, C, A, B, C\n');
  
  testAlgorithm(3, 15, 6);
  
  console.log('\n' + '='.repeat(60));
  
  // Test case 3: 1 account, 5-minute interval
  console.log('\nTEST CASE 3: 1 account, 5-minute interval, 4 leads');
  console.log('Expected: 0min, 5min, 10min, 15min (5-min gaps)');
  console.log('Account rotation: A, A, A, A (same account)\n');
  
  testAlgorithm(1, 5, 4);
}

function testAlgorithm(accountCount, sendingInterval, leadCount) {
  const emailAccounts = Array.from({length: accountCount}, (_, i) => `Account-${String.fromCharCode(65 + i)}`);
  const baseTime = new Date('2025-09-01T10:00:00.000Z');
  
  console.log(`Configuration: ${accountCount} accounts, ${sendingInterval}-min interval, ${leadCount} leads`);
  console.log('Accounts:', emailAccounts.join(', '));
  console.log();
  
  const results = [];
  
  for (let leadIndex = 0; leadIndex < leadCount; leadIndex++) {
    // FINAL CORRECT ALGORITHM
    const accountIndex = leadIndex % emailAccounts.length;
    const baseDelay = leadIndex * sendingInterval * 60 * 1000; // One email per interval
    
    const sendTime = new Date(baseTime.getTime() + baseDelay);
    const delayMinutes = baseDelay / (1000 * 60);
    const accountName = emailAccounts[accountIndex];
    
    results.push({
      leadIndex,
      accountName,
      delayMinutes,
      sendTime
    });
    
    console.log(`Lead ${leadIndex}: ${accountName} → ${delayMinutes}min (${sendTime.toISOString()})`);
    
    if (leadIndex > 0) {
      const prevDelayMinutes = results[leadIndex-1].delayMinutes;
      const gap = delayMinutes - prevDelayMinutes;
      console.log(`  Gap from previous: ${gap} minutes`);
      
      // Validate gap equals sendingInterval
      if (gap === sendingInterval) {
        console.log(`  ✅ CORRECT: Gap matches interval (${sendingInterval} min)`);
      } else {
        console.log(`  ❌ ERROR: Gap should be ${sendingInterval} min, not ${gap} min`);
      }
    }
    console.log();
  }
  
  // Summary
  const gaps = [];
  for (let i = 1; i < results.length; i++) {
    gaps.push(results[i].delayMinutes - results[i-1].delayMinutes);
  }
  
  if (gaps.length > 0) {
    console.log('📊 Summary:');
    console.log(`   All gaps: ${gaps.join(', ')} minutes`);
    console.log(`   Expected: ${sendingInterval} minutes for all gaps`);
    
    const allCorrect = gaps.every(gap => gap === sendingInterval);
    if (allCorrect) {
      console.log('   ✅ SUCCESS: All gaps are correct!');
    } else {
      console.log('   ❌ FAILURE: Some gaps are incorrect');
    }
  }
}

testFinalAlgorithm();