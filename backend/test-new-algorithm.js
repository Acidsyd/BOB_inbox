#!/usr/bin/env node

// Test the new simple scheduling algorithm
function testNewAlgorithm() {
  console.log('🧪 Testing New Simple Scheduling Algorithm\n');
  
  // Test case 1: 2 accounts, 2-minute interval
  console.log('TEST CASE 1: 2 accounts, 2-minute interval, 6 leads');
  console.log('Expected: 0min, 1min, 2min, 3min, 4min, 5min\n');
  
  testAlgorithm(2, 2, 6);
  
  console.log('\n' + '='.repeat(50));
  
  // Test case 2: 3 accounts, 15-minute interval  
  console.log('TEST CASE 2: 3 accounts, 15-minute interval, 6 leads');
  console.log('Expected: 0min, 5min, 10min, 15min, 20min, 25min\n');
  
  testAlgorithm(3, 15, 6);
  
  console.log('\n' + '='.repeat(50));
  
  // Test case 3: Real problematic case - 2 accounts, 2-minute interval
  console.log('TEST CASE 3: Real case - 2 accounts, 2-minute interval, 10 leads');
  console.log('Expected: Perfect 1-minute gaps between emails\n');
  
  testAlgorithm(2, 2, 10);
}

function testAlgorithm(accountCount, sendingInterval, leadCount) {
  const emailAccounts = Array.from({length: accountCount}, (_, i) => `account-${i+1}`);
  const baseTime = new Date('2025-09-01T10:00:00.000Z');
  
  console.log(`Accounts: ${accountCount}, Interval: ${sendingInterval} min, Leads: ${leadCount}`);
  console.log(`Account stagger: ${sendingInterval / accountCount} min\n`);
  
  const results = [];
  
  for (let leadIndex = 0; leadIndex < leadCount; leadIndex++) {
    // NEW SIMPLE ALGORITHM
    const accountIndex = leadIndex % emailAccounts.length;
    const timeSlot = Math.floor(leadIndex / emailAccounts.length);
    const accountStagger = Math.floor((sendingInterval * 60 * 1000) / emailAccounts.length);
    const baseDelay = (timeSlot * sendingInterval * 60 * 1000) + (accountIndex * accountStagger);
    
    const sendTime = new Date(baseTime.getTime() + baseDelay);
    const delayMinutes = baseDelay / (1000 * 60);
    
    results.push({
      leadIndex,
      accountIndex,
      timeSlot,
      delayMinutes,
      sendTime
    });
    
    console.log(`Lead ${leadIndex}: Account ${accountIndex+1}, TimeSlot ${timeSlot} → ${delayMinutes}min (${sendTime.toISOString()})`);
    
    if (leadIndex > 0) {
      const prevDelayMinutes = results[leadIndex-1].delayMinutes;
      const gap = delayMinutes - prevDelayMinutes;
      console.log(`  Gap from previous: ${gap} minutes`);
      
      // Validate gap is reasonable
      if (gap < 0) {
        console.log('  ❌ NEGATIVE GAP - ALGORITHM ERROR!');
      } else if (gap > sendingInterval * 2) {
        console.log(`  ⚠️  Large gap (>${sendingInterval * 2}min) - might be intentional for new interval`);
      } else if (gap < 0.5) {
        console.log('  ⚠️  Very small gap (<30sec) - might cause simultaneous sending');
      } else {
        console.log('  ✅ Gap looks good');
      }
    }
    console.log();
  }
  
  // Summary
  const gaps = [];
  for (let i = 1; i < results.length; i++) {
    gaps.push(results[i].delayMinutes - results[i-1].delayMinutes);
  }
  
  console.log('📊 Gap Analysis:');
  console.log(`   Min gap: ${Math.min(...gaps)} minutes`);
  console.log(`   Max gap: ${Math.max(...gaps)} minutes`);
  console.log(`   Average gap: ${(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2)} minutes`);
  console.log(`   Expected stagger: ${sendingInterval / accountCount} minutes`);
}

testNewAlgorithm();